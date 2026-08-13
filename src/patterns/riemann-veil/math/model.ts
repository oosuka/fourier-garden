export const RIEMANN_TRUNCATIONS = Object.freeze([12, 24, 48, 96]);

export function evaluateRiemannPartial(order: number, x: number): number {
  let sum = 0;
  for (let index = 1; index <= order; index += 1)
    sum += Math.sin(index * index * x) / (index * index);
  return sum;
}

export function getRiemannObservation(timeSeconds: number): number {
  return ((0.037 * timeSeconds + Math.PI) % (2 * Math.PI)) - Math.PI;
}

export function getRiemannSampleCount(order: number): number {
  return 2 ** Math.ceil(Math.log2(2.5 * order * order));
}
