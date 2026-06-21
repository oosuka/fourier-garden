import { describe, expect, it } from "vitest";

import workletSource from "../../public/audio/fourier-worklet.js?raw";

describe("AudioWorklet mathematical contract", () => {
  it("derives phasor controls from the serialized mapping instead of repeat events", () => {
    expect(workletSource).toContain("evaluateSerializedPhasor");
    expect(workletSource).toContain("const baseEvent = score.events[globalStep]");
    expect(workletSource).toContain("evaluateEvent(score, baseEvent, cycleIndex)");
    expect(workletSource).not.toContain("score.events[globalStep].normalizedPhasorX");
    expect(workletSource).not.toContain("score.events[globalStep].normalizedPhasorRadius");
  });

  it("caches evaluated controls by cycle and global step", () => {
    expect(workletSource).toContain("cachedEventKey");
    expect(workletSource).toContain("`${cycleIndex}:${globalStep}`");
  });

  it("guards the maximum detuned frequency", () => {
    expect(workletSource).toContain("Math.max(leftFrequency, rightFrequency) >= frequencyLimit");
    expect(workletSource).not.toContain(
      "frequency >= sampleRate * 0.5 * score.definition.antiAliasRatio",
    );
  });

  it("does not define musical masks or carrier sequences", () => {
    expect(workletSource).not.toMatch(
      /QUARTER_NOTES|EIGHTH_NOTES|TWELVE_NOTES|SIXTEENTH_NOTES|carrierMultipliers/,
    );
  });

  it("dispatches discriminated chapter programs without random state", () => {
    expect(workletSource).toContain('program.kind === "residue-bloom"');
    expect(workletSource).toContain('program.kind === "spectral-cathedral"');
    expect(workletSource).toContain('program.kind === "mobius-choir"');
    expect(workletSource).toContain("renderResidueBloomSample");
    expect(workletSource).toContain("renderSpectralCathedralSample");
    expect(workletSource).toContain("renderMobiusChoirSample");
    expect(workletSource).not.toContain("Math.random");
  });

  it("renders Möbius Choir from precomputed runtime data without score-table allocation", () => {
    expect(workletSource).toContain("createMobiusChoirRuntime(program)");
    expect(workletSource).toContain("findLatestMobiusChoirEventIndex");
    const renderStart = workletSource.indexOf("function accumulateMobiusChoirEvent");
    const renderEnd = workletSource.indexOf("function validateResidueBloomProgram");
    const renderSource = workletSource.slice(renderStart, renderEnd);
    expect(renderSource).not.toContain(".find(");
    expect(renderSource).not.toContain(".map(");
    expect(renderSource).not.toContain(".entries(");
    expect(renderSource).not.toContain("toSorted(");
    expect(renderSource).not.toContain("evaluateMobiusChoirEvents");
  });
});
