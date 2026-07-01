import { describe, expect, it } from "vitest";

import mobiusChoirSource from "../../public/audio/chapters/mobius-choir.js?raw";
import residueBloomSource from "../../public/audio/chapters/residue-bloom.js?raw";
import spectralCathedralSource from "../../public/audio/chapters/spectral-cathedral.js?raw";
import workletSource from "../../public/audio/fourier-worklet.js?raw";

const chapterSources = [residueBloomSource, spectralCathedralSource, mobiusChoirSource].join("\n");

describe("AudioWorklet mathematical contract", () => {
  it("cache-busts every module in the worklet dependency graph", () => {
    expect(workletSource.match(/from ["'][^"']+\?v=15["']/g) ?? []).toHaveLength(4);
    for (const chapterSource of [residueBloomSource, spectralCathedralSource, mobiusChoirSource]) {
      expect(chapterSource).toMatch(/from ["']\.\/shared\.js\?v=15["']/);
    }
  });

  it("keeps each chapter renderer in its own worklet module", () => {
    expect(residueBloomSource).toContain("renderResidueBloomSample");
    expect(spectralCathedralSource).toContain("renderSpectralCathedralSample");
    expect(mobiusChoirSource).toContain("renderMobiusChoirSample");
    expect(workletSource).not.toContain("function renderResidueBloomSample");
    expect(workletSource).not.toContain("function renderSpectralCathedralSample");
    expect(workletSource).not.toContain("function renderMobiusChoirSample");
  });

  it("derives phasor controls from the serialized mapping instead of repeat events", () => {
    expect(residueBloomSource).toContain("evaluateSerializedPhasor");
    expect(residueBloomSource).toContain("const baseEvent = score.events[globalStep]");
    expect(residueBloomSource).toContain("evaluateEvent(score, baseEvent, cycleIndex)");
    expect(residueBloomSource).not.toContain("score.events[globalStep].normalizedPhasorX");
    expect(residueBloomSource).not.toContain("score.events[globalStep].normalizedPhasorRadius");
  });

  it("caches evaluated controls by cycle and global step", () => {
    expect(residueBloomSource).toContain("cachedEventKey");
    expect(residueBloomSource).toContain("`${cycleIndex}:${globalStep}`");
  });

  it("guards the maximum detuned frequency", () => {
    expect(residueBloomSource).toContain(
      "Math.max(leftFrequency, rightFrequency) >= frequencyLimit",
    );
    expect(residueBloomSource).not.toContain(
      "frequency >= sampleRate * 0.5 * score.definition.antiAliasRatio",
    );
  });

  it("does not define musical masks or carrier sequences", () => {
    expect(chapterSources).not.toMatch(
      /QUARTER_NOTES|EIGHTH_NOTES|TWELVE_NOTES|SIXTEENTH_NOTES|carrierMultipliers/,
    );
  });

  it("dispatches registered chapter processors without random state or chapter branches", () => {
    expect(workletSource).toContain("const PROCESSORS = new Map");
    expect(workletSource).toContain("PROCESSORS.get(program.kind)");
    expect(workletSource).toContain("processor.render(program, state, absoluteTimeSeconds)");
    expect(workletSource).not.toMatch(/program\.kind ===/);
    expect(`${chapterSources}\n${workletSource}`).not.toContain("Math.random");
  });

  it("renders Möbius Choir from precomputed runtime data without score-table allocation", () => {
    expect(mobiusChoirSource).toContain("createMobiusChoirRuntime(program)");
    expect(mobiusChoirSource).toContain("findLatestMobiusChoirEventIndex");
    const renderStart = mobiusChoirSource.indexOf("function accumulateMobiusChoirEvent");
    const renderEnd = mobiusChoirSource.indexOf("function validateMobiusChoirProgram");
    const renderSource = mobiusChoirSource.slice(renderStart, renderEnd);
    expect(renderSource).not.toContain(".find(");
    expect(renderSource).not.toContain(".map(");
    expect(renderSource).not.toContain(".entries(");
    expect(renderSource).not.toContain("toSorted(");
    expect(renderSource).not.toContain("evaluateMobiusChoirEvents");
  });
});
