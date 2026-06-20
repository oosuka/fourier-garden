import {
  getSpectralCathedralAnalysisBins,
  type SpectralCathedralDefinition,
} from "../math/spectralCathedral";

export const SPECTRAL_CATHEDRAL_EIGENVALUE_AXIS_MAX = 30;

export function getSpectralCathedralEigenvalueProgress(eigenvalue: number): number {
  if (!Number.isFinite(eigenvalue)) {
    throw new Error("Spectral Cathedral eigenvalue must be finite");
  }
  return Math.min(1, Math.max(0, eigenvalue / SPECTRAL_CATHEDRAL_EIGENVALUE_AXIS_MAX));
}

export function createSpectralCathedralAnalysisLayout(definition: SpectralCathedralDefinition) {
  const bins = getSpectralCathedralAnalysisBins(definition);
  const maximumAbsoluteCoefficient = Math.max(...bins.map((mode) => Math.abs(mode.coefficient)));

  return {
    axisLabel: "固有値 λ（線形軸 0–30）",
    coefficientLabel: "符号付き係数 aₘₙ",
    energyLabel: "相対エネルギー指標 aₘₙ²λₘₙ",
    scopeNotice: "固有値軸であり、Hz・FFTではない",
    maximumAbsoluteCoefficient,
    ticks: [0, 5, 10, 15, 20, 25, 30].map((eigenvalue) => ({
      eigenvalue,
      xProgress: getSpectralCathedralEigenvalueProgress(eigenvalue),
    })),
    modes: bins.map((bin) => ({
      id: bin.id,
      m: bin.m,
      n: bin.n,
      eigenvalue: bin.eigenvalue,
      coefficient: bin.coefficient,
      relativeEnergy: bin.relativeEnergy,
      normalizedRelativeEnergy: bin.normalizedRelativeEnergy,
      xProgress: getSpectralCathedralEigenvalueProgress(bin.eigenvalue),
    })),
  };
}
