export const DIRICHLET_ORDERS = Object.freeze([3, 7, 15, 31]);

export function dirichletKernel(order: number, x: number): number {
  if (Math.abs(Math.sin(x / 2)) < 1e-10) return 2 * order + 1;
  return Math.sin((order + 0.5) * x) / Math.sin(x / 2);
}

export function squareWavePartialSum(order: number, x: number): number {
  let sum = 0;
  for (let harmonic = 1; harmonic <= order; harmonic += 2) sum += Math.sin(harmonic * x) / harmonic;
  return (4 / Math.PI) * sum;
}

export function fejerSquareWave(order: number, x: number): number {
  let sum = 0;
  for (let harmonic = 1; harmonic <= order; harmonic += 2) {
    sum += ((1 - harmonic / (order + 1)) * Math.sin(harmonic * x)) / harmonic;
  }
  return (4 / Math.PI) * sum;
}

export function getDirichletObservation(timeSeconds: number): number {
  return ((0.11 * timeSeconds + Math.PI) % (2 * Math.PI)) - Math.PI;
}
