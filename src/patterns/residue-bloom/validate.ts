import type { ResidueBloomPatternDefinition } from "./types";

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

export function validateResidueBloomPattern(pattern: ResidueBloomPatternDefinition): void {
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
