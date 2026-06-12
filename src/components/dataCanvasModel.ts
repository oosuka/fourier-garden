import { getAnalyticSpectrum, type FourierSeriesDefinition } from "../math/fourier";

export function getLogFrequencyProgress(
  frequencyHz: number,
  minimumHz: number,
  maximumHz: number,
): number {
  const bounded = Math.min(maximumHz, Math.max(minimumHz, frequencyHz));
  return Math.log10(bounded / minimumHz) / Math.log10(maximumHz / minimumHz);
}

export function createSpectrumLayout(
  series: FourierSeriesDefinition,
  referenceFrequencyHz: number,
) {
  const spectrum = getAnalyticSpectrum(series, referenceFrequencyHz);
  const minimumHz = Math.min(45, spectrum[0]?.frequencyHz ?? referenceFrequencyHz);
  const maximumHz = Math.max(3_200, spectrum.at(-1)?.frequencyHz ?? referenceFrequencyHz);
  const maximumAmplitude =
    spectrum.reduce((maximum, bin) => Math.max(maximum, bin.amplitude), 0) || 1;
  const tickFrequencies = [
    referenceFrequencyHz,
    referenceFrequencyHz * 8,
    1_000,
    spectrum.at(-1)?.frequencyHz ?? maximumHz,
  ];
  const uniqueTicks = [...new Set(tickFrequencies)];

  return {
    minimumHz,
    maximumHz,
    amplitudeConvention: "analytic-one-sided-sine-amplitude" as const,
    referenceLabel: "解析的スペクトルの周波数対応基準" as const,
    amplitudeLabel: "片側正弦振幅 A_k" as const,
    renderingLabel: "解析式から評価した標本点を結ぶ数値描画" as const,
    bars: spectrum.map((bin) => ({
      harmonic: bin.harmonic,
      amplitude: bin.amplitude,
      sinePhase: bin.sinePhase,
      frequencyHz: bin.frequencyHz,
      progress: getLogFrequencyProgress(bin.frequencyHz, minimumHz, maximumHz),
      heightRatio: bin.amplitude / maximumAmplitude,
    })),
    ticks: uniqueTicks.map((frequencyHz) => ({
      frequencyHz,
      progress: getLogFrequencyProgress(frequencyHz, minimumHz, maximumHz),
      label:
        frequencyHz >= 1_000
          ? `${(frequencyHz / 1_000).toFixed(frequencyHz % 1_000 === 0 ? 0 : 1)}k`
          : frequencyHz.toFixed(0),
    })),
  };
}

export function getAudioWaveformMode(initialized: boolean): "waiting" | "analyser" {
  return initialized ? "analyser" : "waiting";
}
