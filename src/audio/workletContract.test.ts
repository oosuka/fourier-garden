import { describe, expect, it } from "vitest";

import besselTideSource from "../../public/audio/chapters/bessel-tide.js?raw";
import dirichletLanternsSource from "../../public/audio/chapters/dirichlet-lanterns.js?raw";
import lissajousOrchardSource from "../../public/audio/chapters/lissajous-orchard.js?raw";
import mobiusChoirSource from "../../public/audio/chapters/mobius-choir.js?raw";
import phaseTorusSource from "../../public/audio/chapters/phase-torus.js?raw";
import primeConstellationSource from "../../public/audio/chapters/prime-constellation.js?raw";
import residueBloomSource from "../../public/audio/chapters/residue-bloom.js?raw";
import riemannVeilSource from "../../public/audio/chapters/riemann-veil.js?raw";
import sharedPikoSource from "../../public/audio/chapters/shared-piko.js?raw";
import spectralCathedralSource from "../../public/audio/chapters/spectral-cathedral.js?raw";
import waveletRainSource from "../../public/audio/chapters/wavelet-rain.js?raw";
import workletSource from "../../public/audio/fourier-worklet.js?raw";

const pikoChapterSources = [
  primeConstellationSource,
  besselTideSource,
  lissajousOrchardSource,
  dirichletLanternsSource,
  waveletRainSource,
  riemannVeilSource,
  phaseTorusSource,
];
const chapterSources = [
  residueBloomSource,
  spectralCathedralSource,
  mobiusChoirSource,
  ...pikoChapterSources,
].join("\n");

describe("AudioWorklet mathematical contract", () => {
  it("cache-busts every module in the worklet dependency graph", () => {
    expect(workletSource.match(/from ["'][^"']+\?v=24["']/g) ?? []).toHaveLength(11);
    for (const chapterSource of [residueBloomSource, spectralCathedralSource, mobiusChoirSource]) {
      expect(chapterSource).toMatch(/from ["']\.\/shared\.js\?v=24["']/);
    }
    expect(sharedPikoSource).toMatch(/from ["']\.\/shared\.js\?v=24["']/);
    for (const chapterSource of pikoChapterSources) {
      expect(chapterSource).toMatch(/from ["']\.\/shared-piko\.js\?v=24["']/);
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
    expect(residueBloomSource).toContain(
      "evaluateEvent(score, baseEvent, cycleIndex, state.phasor, state.cachedEvent)",
    );
    expect(residueBloomSource).not.toContain("score.events[globalStep].normalizedPhasorX");
    expect(residueBloomSource).not.toContain("score.events[globalStep].normalizedPhasorRadius");
  });

  it("reuses numeric event caches and output storage in the Residue Bloom sample loop", () => {
    expect(residueBloomSource).toContain("cachedCycleIndex");
    expect(residueBloomSource).toContain("cachedGlobalStep");
    expect(residueBloomSource).toContain("const sample = state.sample");
    const renderStart = residueBloomSource.indexOf("function renderResidueBloomSample");
    const renderEnd = residueBloomSource.indexOf("function validateResidueBloomProgram");
    const renderSource = residueBloomSource.slice(renderStart, renderEnd);
    expect(renderSource).not.toContain("return {");
    expect(renderSource).not.toContain("`${");
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

  it("keeps the shared piko sample loop free of score scans and allocations", () => {
    const renderStart = sharedPikoSource.indexOf("render(program, state, absoluteTimeSeconds)");
    const renderEnd = sharedPikoSource.indexOf("return state.output;", renderStart);
    const renderSource = sharedPikoSource.slice(renderStart, renderEnd);
    expect(renderSource).not.toContain("program.score.events");
    expect(renderSource).not.toContain("Array.from");
    expect(renderSource).not.toContain(".map(");
    expect(renderSource).not.toContain(".sort(");
    expect(renderSource).not.toContain("new ");
  });
});
