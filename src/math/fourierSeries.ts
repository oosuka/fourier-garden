export interface FourierTerm {
  harmonic: number;
  amplitude: number;
  sinePhase: number;
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

export interface ComplexFourierCoefficient {
  harmonic: number;
  real: number;
  imaginary: number;
}

export function evaluateSeries(series: FourierSeriesDefinition, angle: number): number {
  return series.terms.reduce(
    (sum, term) => sum + term.amplitude * Math.sin(term.harmonic * angle + term.sinePhase),
    0,
  );
}

export function getEpicycleSteps(series: FourierSeriesDefinition, angle: number): EpicycleStep[] {
  let x = 0;
  let y = 0;

  return series.terms.map((term) => {
    const originX = x;
    const originY = y;
    const phase = term.harmonic * angle + term.sinePhase;
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

export function evaluateEpicycle(series: FourierSeriesDefinition, angle: number): ComplexPoint {
  const endpoint = getEpicycleSteps(series, angle).at(-1);
  return endpoint ? { x: endpoint.x, y: endpoint.y } : { x: 0, y: 0 };
}

export function getComplexFourierCoefficients(
  series: FourierSeriesDefinition,
): ComplexFourierCoefficient[] {
  return series.terms.flatMap((term) => {
    const real = (term.amplitude * Math.sin(term.sinePhase)) / 2;
    const imaginary = (-term.amplitude * Math.cos(term.sinePhase)) / 2;

    return [
      {
        harmonic: -term.harmonic,
        real,
        imaginary: -imaginary,
      },
      {
        harmonic: term.harmonic,
        real,
        imaginary,
      },
    ];
  });
}

export function projectSeriesToVerticalAxis(
  series: FourierSeriesDefinition,
  angle: number,
  centerY: number,
  scale: number,
): number {
  return centerY + evaluateSeries(series, angle) * scale;
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
