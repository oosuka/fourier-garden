const TAU = Math.PI * 2;

const GHOST_CONTOUR = [
  1.16, 0.68, 0.92, 0.74, 1.04, 0.64, 0.84, 0.76, 1.12, 0.66, 0.9, 0.72, 1, 0.62, 0.82, 0.7,
] as const;

const BAR_ARC = [0.9, 1.04, 0.96, 1.1, 0.86, 1.02, 0.92, 1.08] as const;

export interface LongFormMotion {
  accent: number;
  tailScale: number;
  spaceScale: number;
  motionScale: number;
}

interface LongFormMotionOptions {
  eventIndex: number;
  eventCount: number;
  stepsPerBar: number;
  rotation: number;
  phaseOffset: number;
  depth?: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Extends a local pulse identity across the complete score without changing any mathematical
 * quantity. The incommensurate bar rotation and full-form waves prevent a short accent loop.
 */
export function getLongFormMotion(options: LongFormMotionOptions): LongFormMotion {
  const { eventIndex, eventCount, stepsPerBar, rotation, phaseOffset, depth = 1 } = options;
  if (
    !Number.isInteger(eventIndex) ||
    eventIndex < 0 ||
    !Number.isInteger(eventCount) ||
    eventCount <= 0 ||
    eventIndex >= eventCount ||
    !Number.isInteger(stepsPerBar) ||
    stepsPerBar <= 0 ||
    !Number.isInteger(rotation) ||
    !Number.isFinite(phaseOffset) ||
    !Number.isFinite(depth) ||
    depth < 0 ||
    depth > 1.5
  ) {
    throw new RangeError("Long-form motion options are invalid");
  }

  const barIndex = Math.floor(eventIndex / stepsPerBar);
  const stepInBar = eventIndex % stepsPerBar;
  const progress = (eventIndex + 0.5) / eventCount;
  const phase = phaseOffset * 0.071;
  const contourIndex = positiveModulo(
    stepInBar + barIndex * rotation + Math.round(phaseOffset),
    GHOST_CONTOUR.length,
  );
  const barArcIndex = positiveModulo(barIndex + Math.round(phaseOffset * 3), BAR_ARC.length);
  const macroPulse =
    1 +
    0.11 * Math.sin(TAU * (progress * 2 + phase)) +
    0.065 * Math.sin(TAU * (progress * 5 + phase * 0.61));
  const rawAccent = GHOST_CONTOUR[contourIndex]! * BAR_ARC[barArcIndex]! * macroPulse;
  const accent = clamp(1 + (rawAccent - 0.9) * depth, 0.52, 1.34);
  const tailScale = clamp(
    0.74 + accent * 0.3 + 0.12 * Math.sin(TAU * (progress * 3 + phase * 0.83 + barIndex * 0.037)),
    0.76,
    1.28,
  );
  const spaceScale = clamp(
    0.94 + 0.24 * Math.sin(TAU * (progress + phase) + barIndex * 0.73),
    0.7,
    1.2,
  );
  const motionScale = clamp(
    0.92 + 0.22 * Math.cos(TAU * (progress * 1.5 + phase * 1.17) + barIndex * 0.41),
    0.72,
    1.14,
  );

  return { accent, tailScale, spaceScale, motionScale };
}
