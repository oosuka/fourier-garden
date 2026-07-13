export const LISSAJOUS_RATIOS = Object.freeze([
  [1, 5],
  [1, 4],
  [1, 3],
  [2, 5],
  [1, 2],
  [3, 5],
  [2, 3],
  [3, 4],
  [4, 5],
] as const);

export function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function getLissajousPhase(timeSeconds: number): number {
  return Math.PI / 2 + (Math.PI / 3) * Math.sin(0.025 * timeSeconds);
}

export function evaluateLissajous(
  a: number,
  b: number,
  parameter: number,
  timeSeconds: number,
): readonly [number, number] {
  return [Math.sin(a * parameter + getLissajousPhase(timeSeconds)), Math.sin(b * parameter)];
}
