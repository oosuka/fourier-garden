export const PRIME_SUPPORT = Object.freeze([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
]);

export const PRIME_CONSTELLATION_CYCLE_SECONDS = 60;
export const PRIME_VISUAL_RATE = 0.06;
export const PRIME_PHRASE_SECONDS = 10;
export const PRIME_ACTIVE_PHRASE_SECONDS = 9.2;

export function isPrime(value: number): boolean {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

export function evaluatePrimeSum(x: number): Readonly<{ real: number; imaginary: number }> {
  let real = 0;
  let imaginary = 0;
  for (const prime of PRIME_SUPPORT) {
    real += Math.cos(prime * x);
    imaginary += Math.sin(prime * x);
  }
  return { real: real / PRIME_SUPPORT.length, imaginary: imaginary / PRIME_SUPPORT.length };
}

export function getPrimePhasePoint(prime: number, x: number): readonly [number, number, number] {
  return [Math.cos(prime * x), Math.sin(prime * x), (2 * (prime - 2)) / 95 - 1];
}

export const PRIME_GAPS = Object.freeze(
  PRIME_SUPPORT.slice(1).map((prime, index) => prime - PRIME_SUPPORT[index]!),
);

export const PRIME_GAP_TIME_SCALE_SECONDS =
  PRIME_ACTIVE_PHRASE_SECONDS / (PRIME_SUPPORT.at(-1)! - PRIME_SUPPORT[0]!);

export const PRIME_PHRASE_TIMES = Object.freeze(
  (() => {
    const times = [0];
    for (const gap of PRIME_GAPS) {
      times.push(times.at(-1)! + gap * PRIME_GAP_TIME_SCALE_SECONDS);
    }
    return times;
  })(),
);
