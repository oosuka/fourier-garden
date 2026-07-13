const ALPHA = Math.PI / 7;

export const BESSEL_ZEROS = Object.freeze([
  { m: 0, n: 1, zero: 2.4048255577 },
  { m: 0, n: 2, zero: 5.5200781103 },
  { m: 0, n: 3, zero: 8.6537279129 },
  { m: 1, n: 1, zero: 3.8317059702 },
  { m: 1, n: 2, zero: 7.0155866698 },
  { m: 2, n: 1, zero: 5.1356223018 },
  { m: 2, n: 2, zero: 8.4172441404 },
  { m: 3, n: 1, zero: 6.3801618959 },
  { m: 3, n: 2, zero: 9.76102313 },
  { m: 4, n: 1, zero: 7.5883424345 },
]);

export interface BesselMode {
  id: number;
  m: number;
  n: number;
  q: "zero" | "cos" | "sin";
  zero: number;
  coefficient: number;
}

export function besselJ(order: number, x: number): number {
  let term = (x / 2) ** order;
  for (let value = 2; value <= order; value += 1) term /= value;
  let sum = term;
  for (let index = 1; index < 48; index += 1) {
    term *= (-x * x) / (4 * index * (index + order));
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}

function gaussLegendre(count: number): Readonly<{ nodes: number[]; weights: number[] }> {
  const nodes = Array<number>(count).fill(0);
  const weights = Array<number>(count).fill(0);
  const half = Math.ceil(count / 2);
  for (let index = 0; index < half; index += 1) {
    let root = Math.cos((Math.PI * (index + 0.75)) / (count + 0.5));
    let derivative = 0;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      let p0 = 1;
      let p1 = root;
      for (let degree = 2; degree <= count; degree += 1) {
        const next = ((2 * degree - 1) * root * p1 - (degree - 1) * p0) / degree;
        p0 = p1;
        p1 = next;
      }
      derivative = (count * (root * p1 - p0)) / (root * root - 1);
      const nextRoot = root - p1 / derivative;
      if (Math.abs(nextRoot - root) < 1e-15) {
        root = nextRoot;
        break;
      }
      root = nextRoot;
    }
    const weight = 2 / ((1 - root * root) * derivative * derivative);
    nodes[index] = -root;
    nodes[count - 1 - index] = root;
    weights[index] = weight;
    weights[count - 1 - index] = weight;
  }
  return { nodes, weights };
}

function radialProjection(m: number, zero: number, count = 64): number {
  const { nodes, weights } = gaussLegendre(count);
  let integral = 0;
  const normalization = Math.SQRT2 / Math.abs(besselJ(m + 1, zero));
  for (let index = 0; index < count; index += 1) {
    const radius = (nodes[index]! + 1) / 2;
    const radialInitial = (1 - radius * radius) * (m === 0 ? 1 : 2 ** -m * radius ** m);
    integral +=
      weights[index]! * radialInitial * normalization * besselJ(m, zero * radius) * radius * 0.5;
  }
  return integral;
}

const rawModes: Omit<BesselMode, "coefficient">[] = [];
for (const [index, entry] of BESSEL_ZEROS.entries()) {
  if (entry.m === 0) {
    rawModes.push({ id: index * 2, ...entry, q: "zero" });
  } else {
    rawModes.push({ id: index * 2, ...entry, q: "cos" }, { id: index * 2 + 1, ...entry, q: "sin" });
  }
}
const rawCoefficients = rawModes.map((mode) => {
  const angular =
    mode.m === 0
      ? Math.sqrt(2 * Math.PI)
      : Math.sqrt(Math.PI) *
        (mode.q === "cos" ? Math.cos(mode.m * ALPHA) : Math.sin(mode.m * ALPHA));
  return radialProjection(mode.m, mode.zero) * angular;
});
const coefficientNorm = rawCoefficients.reduce((sum, value) => sum + Math.abs(value), 0);

export const BESSEL_MODES: readonly BesselMode[] = Object.freeze(
  rawModes.map((mode, index) => ({
    id: mode.id,
    m: mode.m,
    n: mode.n,
    q: mode.q,
    zero: mode.zero,
    coefficient: rawCoefficients[index]! / coefficientNorm,
  })),
);

export function evaluateBesselMode(mode: BesselMode, radius: number, theta: number): number {
  const radial =
    (Math.SQRT2 * besselJ(mode.m, mode.zero * radius)) / Math.abs(besselJ(mode.m + 1, mode.zero));
  if (mode.q === "zero") return radial / Math.sqrt(2 * Math.PI);
  return (
    (radial * (mode.q === "cos" ? Math.cos(mode.m * theta) : Math.sin(mode.m * theta))) /
    Math.sqrt(Math.PI)
  );
}

export function evaluateBesselField(radius: number, theta: number, timeSeconds: number): number {
  return BESSEL_MODES.reduce(
    (sum, mode) =>
      sum +
      mode.coefficient *
        Math.cos((0.18 * mode.zero * timeSeconds) / BESSEL_ZEROS[0]!.zero) *
        evaluateBesselMode(mode, radius, theta),
    0,
  );
}
