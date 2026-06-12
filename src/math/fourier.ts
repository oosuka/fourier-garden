export interface FourierTerm {
  harmonic: number;
  amplitude: number;
  phase: number;
}

export interface FourierSeriesDefinition {
  id: string;
  coefficient: number;
  terms: readonly FourierTerm[];
}

export interface ComplexPoint {
  x: number;
  y: number;
}

export interface EpicycleStep extends ComplexPoint {
  radius: number;
  harmonic: number;
  originX: number;
  originY: number;
}

export interface SpectrumBin extends FourierTerm {
  frequencyHz: number;
}

export function buildResidueBloomTerms(): FourierTerm[] {
  return Array.from({ length: 13 }, (_, k) => ({
    harmonic: 4 * k + 1,
    amplitude: 5 / (k + 1),
    phase: -Math.PI / 2,
  }));
}

export const RESIDUE_BLOOM_SERIES: FourierSeriesDefinition = {
  id: "residue-bloom",
  coefficient: 5,
  terms: buildResidueBloomTerms(),
};

export function evaluateSeries(
  series: FourierSeriesDefinition,
  angle: number,
): number {
  return series.terms.reduce(
    (sum, term) =>
      sum + term.amplitude * Math.sin(term.harmonic * angle),
    0,
  );
}

export function getEpicycleSteps(
  series: FourierSeriesDefinition,
  angle: number,
): EpicycleStep[] {
  let x = 0;
  let y = 0;

  return series.terms.map((term) => {
    const originX = x;
    const originY = y;
    const phase = term.harmonic * angle + term.phase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);

    return {
      harmonic: term.harmonic,
      radius: term.amplitude,
      originX,
      originY,
      x,
      y,
    };
  });
}

export function evaluateEpicycle(
  series: FourierSeriesDefinition,
  angle: number,
): ComplexPoint {
  const endpoint = getEpicycleSteps(series, angle).at(-1);
  return endpoint ? { x: endpoint.y, y: endpoint.x } : { x: 0, y: 0 };
}

export function getAnalyticSpectrum(
  series: FourierSeriesDefinition,
  fundamentalHz: number,
): SpectrumBin[] {
  return series.terms.map((term) => ({
    ...term,
    frequencyHz: term.harmonic * fundamentalHz,
  }));
}
