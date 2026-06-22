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

export function getEqualPowerPanGains(pan) {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  return [Math.sqrt((1 - clampedPan) / 2), Math.sqrt((1 + clampedPan) / 2)];
}

export function hashUint32(value) {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}
