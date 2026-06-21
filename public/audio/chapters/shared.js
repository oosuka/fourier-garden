export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

export function isNonnegativeFinite(value) {
  return isFiniteNumber(value) && value >= 0;
}
