export function waveletTarget(time: number): number {
  const wrapped = ((time % 1) + 1) % 1;
  return (
    Math.sin(2 * Math.PI * wrapped) +
    0.45 * Math.sin(6 * Math.PI * wrapped + Math.PI / 5) +
    (wrapped >= 3 / 16 && wrapped < 5 / 16 ? 0.7 : 0) -
    (wrapped >= 11 / 16 && wrapped < 13 / 16 ? 0.55 : 0)
  );
}

function sineIntegral(frequency: number, phase: number, start: number, end: number): number {
  return (Math.cos(frequency * start + phase) - Math.cos(frequency * end + phase)) / frequency;
}

function overlap(start: number, end: number, left: number, right: number): number {
  return Math.max(0, Math.min(end, right) - Math.max(start, left));
}

export function integrateWaveletTarget(start: number, end: number): number {
  return (
    sineIntegral(2 * Math.PI, 0, start, end) +
    0.45 * sineIntegral(6 * Math.PI, Math.PI / 5, start, end) +
    0.7 * overlap(start, end, 3 / 16, 5 / 16) -
    0.55 * overlap(start, end, 11 / 16, 13 / 16)
  );
}

export interface HaarCoefficient {
  j: number;
  k: number;
  value: number;
  start: number;
  end: number;
}

export const HAAR_SCALING_COEFFICIENT = integrateWaveletTarget(0, 1);
export const HAAR_COEFFICIENTS: readonly HaarCoefficient[] = Object.freeze(
  Array.from({ length: 6 }, (_level, j) =>
    Array.from({ length: 2 ** j }, (_translation, k) => {
      const start = k / 2 ** j;
      const midpoint = (k + 0.5) / 2 ** j;
      const end = (k + 1) / 2 ** j;
      return {
        j,
        k,
        start,
        end,
        value:
          2 ** (j / 2) *
          (integrateWaveletTarget(start, midpoint) - integrateWaveletTarget(midpoint, end)),
      };
    }),
  ).flat(),
);

export function evaluateHaarProjection(time: number): number {
  const wrapped = ((time % 1) + 1) % 1;
  let value = HAAR_SCALING_COEFFICIENT;
  for (const coefficient of HAAR_COEFFICIENTS) {
    if (wrapped < coefficient.start || wrapped >= coefficient.end) continue;
    const midpoint = (coefficient.start + coefficient.end) / 2;
    value += coefficient.value * 2 ** (coefficient.j / 2) * (wrapped < midpoint ? 1 : -1);
  }
  return value;
}
