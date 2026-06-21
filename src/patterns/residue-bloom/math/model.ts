import type { FourierSeriesDefinition, FourierTerm } from "../../../math/fourierSeries";

export function buildResidueBloomTerms(): FourierTerm[] {
  return Array.from({ length: 13 }, (_, k) => ({
    harmonic: 4 * k + 1,
    amplitude: 5 / (k + 1),
    sinePhase: 0,
  }));
}

export const RESIDUE_BLOOM_SERIES: FourierSeriesDefinition = {
  id: "residue-bloom",
  coefficient: 5,
  terms: buildResidueBloomTerms(),
};

export const RESIDUE_BLOOM_VISUAL_ANGULAR_RATE = 0.31;
