import { getMobiusChoirCandidates, type MobiusChoirDefinition } from "../math/model";

export const MOBIUS_CHOIR_EIGENVALUE_AXIS_MAX = 13;

export function getMobiusChoirEigenvalueProgress(eigenvalue: number): number {
  if (!Number.isFinite(eigenvalue)) throw new Error("Möbius Choir eigenvalue must be finite");
  return Math.min(1, Math.max(0, eigenvalue / MOBIUS_CHOIR_EIGENVALUE_AXIS_MAX));
}

export function getMobiusChoirCandidateLaneOffset(m: number, n: number): number {
  if (!Number.isInteger(m) || m <= 0 || !Number.isInteger(n) || n < 0) {
    throw new Error("Möbius Choir candidate indices must satisfy m > 0 and n >= 0");
  }
  return (m * 4 + n - 8) * 2;
}

export function createMobiusChoirAnalysisLayout(definition: MobiusChoirDefinition) {
  const candidates = getMobiusChoirCandidates();
  return {
    axisLabel: "固有値 λ（線形軸 0–13）",
    parityLabel: "m+nは奇数：許容 / m+nは偶数：不許容",
    scopeNotice: "flat quotientの解析的固有値軸であり、Hz・DFT・FFTではない",
    ticks: [0, 1, 5, 9, 13].map((eigenvalue) => ({
      eigenvalue,
      xProgress: getMobiusChoirEigenvalueProgress(eigenvalue),
    })),
    candidates: candidates.map((candidate) => ({
      m: candidate.m,
      n: candidate.n,
      eigenvalue: candidate.eigenvalue,
      allowed: candidate.allowed,
      seamFactor: candidate.seamFactor,
      xProgress: getMobiusChoirEigenvalueProgress(candidate.eigenvalue),
    })),
    modes: definition.modes.map((mode) => ({
      id: mode.id,
      m: mode.m,
      n: mode.n,
      eigenvalue: mode.eigenvalue,
      coefficient: mode.coefficient,
      voiceKind: mode.voiceKind,
      xProgress: getMobiusChoirEigenvalueProgress(mode.eigenvalue),
    })),
  };
}
