import { validateSpectralCathedralDefinition } from "../math/spectralCathedral";
import type {
  PatternDefinition,
  ResidueBloomPatternDefinition,
  SpectralCathedralPatternDefinition,
} from "./types";

const FORBIDDEN_REPEAT_EVENT_FIELDS = [
  "normalizedPhasorX",
  "normalizedPhasorY",
  "normalizedPhasorRadius",
  "brightness",
  "accent",
  "absoluteTimeSeconds",
] as const;

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-12;
}

function validateCommon(pattern: PatternDefinition): void {
  if (!pattern.id || !Number.isInteger(pattern.order) || pattern.order <= 0) {
    throw new Error("Pattern identity and order must be valid");
  }
  if (pattern.presentation.annotations.length !== 4) {
    throw new Error("Pattern presentation must provide four annotations");
  }
  if (pattern.audio.mode !== "sonification") {
    throw new Error("Pattern audio must be identified as sonification");
  }
  validateDramaturgy(pattern);
}

function validateDramaturgy(pattern: PatternDefinition): void {
  const dramaturgy = pattern.dramaturgy;
  if (!Number.isFinite(dramaturgy.cycleSeconds) || dramaturgy.cycleSeconds <= 0) {
    throw new Error("Pattern dramaturgy cycle must be positive");
  }
  if (!sameNumber(dramaturgy.cycleSeconds, pattern.audio.score.cycleSeconds)) {
    throw new Error("Pattern dramaturgy cycle must match the audio score cycle");
  }
  if (dramaturgy.sections.length < 3) {
    throw new Error("Pattern dramaturgy must provide at least three sections");
  }
  if (new Set(dramaturgy.expressiveAxes).size < 3) {
    throw new Error("Pattern dramaturgy must vary at least three expressive axes");
  }
  if (!dramaturgy.localMathMapping) {
    throw new Error("Pattern dramaturgy must declare a local mathematical mapping");
  }

  let previousEnd = 0;
  for (const section of dramaturgy.sections) {
    const energies = [section.audioEnergy, section.visualEnergy, section.motionEnergy];
    if (
      !section.id ||
      !Number.isFinite(section.startRatio) ||
      !Number.isFinite(section.endRatio) ||
      section.startRatio < 0 ||
      section.endRatio > 1 ||
      Math.abs(section.startRatio - previousEnd) > 1e-12 ||
      section.endRatio <= section.startRatio ||
      energies.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    ) {
      throw new Error("Pattern dramaturgy sections must continuously cover the cycle");
    }
    previousEnd = section.endRatio;
  }
  if (Math.abs(previousEnd - 1) > 1e-12) {
    throw new Error("Pattern dramaturgy sections must end at one");
  }

  const contrast = (key: "audioEnergy" | "visualEnergy" | "motionEnergy") => {
    const values = dramaturgy.sections.map((section) => section[key]);
    return Math.max(...values) - Math.min(...values);
  };
  if (
    [contrast("audioEnergy"), contrast("visualEnergy"), contrast("motionEnergy")].every(
      (value) => value < 0.25,
    )
  ) {
    throw new Error("Pattern dramaturgy must provide measurable contrast");
  }
}

function validateResidueBloom(pattern: ResidueBloomPatternDefinition): void {
  if (pattern.terms !== pattern.formula.terms) {
    throw new Error("Pattern terms must reference formula terms");
  }
  if (pattern.mathematics.visualTime.wrapsWithScore !== false) {
    throw new Error("Mathematical time must not wrap with score");
  }
  if (
    !sameNumber(
      pattern.mathematics.visualTime.angularRateRadiansPerSecond,
      pattern.audio.score.phasorMapping.visualAngularRate,
    )
  ) {
    throw new Error("Score visual angular rate differs from pattern");
  }
  if (!sameNumber(pattern.mathematics.spectrum.referenceFrequencyHz, pattern.audio.fundamentalHz)) {
    throw new Error("Spectrum reference frequency differs from audio reference");
  }
  if (pattern.mathematics.fftUsed !== false) {
    throw new Error("Analytic coefficient pattern cannot declare FFT use");
  }

  const mappingTerms = pattern.audio.score.phasorMapping.terms;
  const expectedAmplitudeBound = pattern.formula.terms.reduce(
    (sum, term) => sum + Math.abs(term.amplitude),
    0,
  );
  if (!sameNumber(pattern.audio.score.phasorMapping.amplitudeBound, expectedAmplitudeBound)) {
    throw new Error("Score phasor amplitude bound differs from formula");
  }
  if (
    mappingTerms.length !== pattern.formula.terms.length ||
    mappingTerms.some((term, index) => {
      const formulaTerm = pattern.formula.terms[index];
      return (
        !formulaTerm ||
        term.harmonic !== formulaTerm.harmonic ||
        !sameNumber(term.amplitude, formulaTerm.amplitude) ||
        !sameNumber(term.sinePhase, formulaTerm.sinePhase)
      );
    })
  ) {
    throw new Error("Score phasor mapping terms differ from formula");
  }

  for (const event of pattern.audio.score.events) {
    for (const field of FORBIDDEN_REPEAT_EVENT_FIELDS) {
      if (field in event) {
        throw new Error("Repeat event contains evaluated phasor data");
      }
    }
  }
}

function validateSpectralCathedral(pattern: SpectralCathedralPatternDefinition): void {
  validateSpectralCathedralDefinition(pattern.definition);
  if (pattern.mathematics.mathematicalTime.wrapsWithScore !== false) {
    throw new Error("Mathematical time must not wrap with score");
  }
  if (pattern.mathematics.fftUsed !== false) {
    throw new Error("Analytic eigenmode pattern cannot declare FFT use");
  }

  const modeIds = new Set(pattern.definition.modes.map((mode) => mode.id));
  for (const event of pattern.audio.score.events) {
    for (const modeId of event.modeIds) {
      if (!modeIds.has(modeId)) {
        throw new Error(`Spectral Cathedral score references unknown mode ${modeId}`);
      }
    }
    for (const field of FORBIDDEN_REPEAT_EVENT_FIELDS) {
      if (field in event) {
        throw new Error("Repeat event contains evaluated mathematical data");
      }
    }
  }

  const program = pattern.audio.createProgram();
  if (program.worklet.kind !== "spectral-cathedral") {
    throw new Error("Spectral Cathedral audio program kind is invalid");
  }
  if (program.worklet.modes.length !== pattern.definition.modes.length) {
    throw new Error("Spectral Cathedral audio modes differ from mathematical definition");
  }
}

export function validatePatternDefinition(pattern: PatternDefinition): void {
  validateCommon(pattern);
  if (pattern.kind === "residue-bloom") {
    validateResidueBloom(pattern);
    return;
  }
  validateSpectralCathedral(pattern);
}
