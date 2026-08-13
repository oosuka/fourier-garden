export interface TorusMode {
  m: number;
  n: number;
  real: number;
  imaginary: number;
  magnitude: number;
}

const THETA_ZERO = [Math.PI / 5, Math.PI / 7] as const;
const rawModes = Array.from({ length: 7 }, (_, mIndex) => mIndex - 3).flatMap((m) =>
  Array.from({ length: 7 }, (_, nIndex) => nIndex - 3)
    .filter((n) => Math.abs(m) + Math.abs(n) >= 1 && Math.abs(m) + Math.abs(n) <= 3)
    .map((n) => ({ m, n })),
);
const normalization = rawModes.reduce(
  (sum, mode) => sum + Math.exp(-0.35 * (mode.m * mode.m + mode.n * mode.n)),
  0,
);

export const TORUS_MODES: readonly TorusMode[] = Object.freeze(
  rawModes.map(({ m, n }) => {
    const magnitude = Math.exp(-0.35 * (m * m + n * n)) / normalization;
    const phase = -(m * THETA_ZERO[0] + n * THETA_ZERO[1]);
    return {
      m,
      n,
      magnitude,
      real: magnitude * Math.cos(phase),
      imaginary: magnitude * Math.sin(phase),
    };
  }),
);

export function evaluateTorusField(theta1: number, theta2: number): number {
  return TORUS_MODES.reduce(
    (sum, mode) =>
      sum +
      mode.real * Math.cos(mode.m * theta1 + mode.n * theta2) -
      mode.imaginary * Math.sin(mode.m * theta1 + mode.n * theta2),
    0,
  );
}

export function getIrrationalTorusPhase(timeSeconds: number): readonly [number, number] {
  return [
    (0.08 * timeSeconds + THETA_ZERO[0]) % (2 * Math.PI),
    (0.08 * Math.SQRT2 * timeSeconds + THETA_ZERO[1]) % (2 * Math.PI),
  ];
}
