import { MOBIUS_CHOIR_SCORE, type MobiusChoirSectionId } from "../audio/mobiusChoirScore";

export interface MobiusChoirDramaturgySection {
  id: MobiusChoirSectionId;
  startRatio: number;
  endRatio: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
}

export interface MobiusChoirDramaturgyFrame {
  sectionId: MobiusChoirSectionId;
  sectionProgress: number;
  cycleProgress: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
  camera: {
    orbitRadians: number;
    dollyRatio: number;
    targetX: number;
    targetY: number;
  };
}

export const MOBIUS_CHOIR_DRAMATURGY_SECTIONS = [
  {
    id: "breath",
    startRatio: 0,
    endRatio: 3 / 16,
    audioEnergy: 0.22,
    visualEnergy: 0.3,
    motionEnergy: 0.18,
  },
  {
    id: "antiphon",
    startRatio: 3 / 16,
    endRatio: 6 / 16,
    audioEnergy: 0.46,
    visualEnergy: 0.48,
    motionEnergy: 0.4,
  },
  {
    id: "inversion",
    startRatio: 6 / 16,
    endRatio: 10 / 16,
    audioEnergy: 0.7,
    visualEnergy: 0.72,
    motionEnergy: 0.78,
  },
  {
    id: "interweave",
    startRatio: 10 / 16,
    endRatio: 14 / 16,
    audioEnergy: 0.96,
    visualEnergy: 1,
    motionEnergy: 0.94,
  },
  {
    id: "confluence",
    startRatio: 14 / 16,
    endRatio: 1,
    audioEnergy: 0.34,
    visualEnergy: 0.5,
    motionEnergy: 0.28,
  },
] as const satisfies readonly MobiusChoirDramaturgySection[];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(left: number, right: number, progress: number): number {
  return left + (right - left) * progress;
}

export function evaluateMobiusChoirDramaturgy(
  absoluteTimeSeconds: number,
): MobiusChoirDramaturgyFrame {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Möbius Choir dramaturgy time must be finite and nonnegative");
  }
  const cycleSeconds = MOBIUS_CHOIR_SCORE.cycleSeconds;
  const cycleTime = absoluteTimeSeconds % cycleSeconds;
  const cycleProgress = cycleTime / cycleSeconds;
  const sectionIndex = MOBIUS_CHOIR_DRAMATURGY_SECTIONS.findIndex(
    (section) => cycleProgress >= section.startRatio && cycleProgress < section.endRatio,
  );
  const resolvedIndex = sectionIndex >= 0 ? sectionIndex : 0;
  const section = MOBIUS_CHOIR_DRAMATURGY_SECTIONS[resolvedIndex]!;
  const next =
    MOBIUS_CHOIR_DRAMATURGY_SECTIONS[
      (resolvedIndex + 1) % MOBIUS_CHOIR_DRAMATURGY_SECTIONS.length
    ]!;
  const sectionProgress =
    (cycleProgress - section.startRatio) / (section.endRatio - section.startRatio);
  const transition = smoothstep01((sectionProgress - 0.72) / 0.28);
  const audioEnergy = lerp(section.audioEnergy, next.audioEnergy, transition);
  const visualEnergy = lerp(section.visualEnergy, next.visualEnergy, transition);
  const motionEnergy = lerp(section.motionEnergy, next.motionEnergy, transition);
  const angle = cycleProgress * Math.PI * 2;
  const orbitWave = Math.sin(angle * 3) * 0.78 + Math.sin(angle) * 0.22;
  const dollyWave =
    Math.sin(angle * 2 - Math.PI / 2) * 0.65 + Math.sin(angle * 4 + Math.PI / 2) * 0.35;

  return {
    sectionId: section.id,
    sectionProgress,
    cycleProgress,
    audioEnergy,
    visualEnergy,
    motionEnergy,
    camera: {
      orbitRadians: orbitWave * ((28 * Math.PI) / 180) * (0.84 + motionEnergy * 0.16),
      dollyRatio: 1 + dollyWave * 0.12 * (0.58 + motionEnergy * 0.42),
      targetX: Math.sin(angle * 2) * 0.1 * (0.62 + motionEnergy * 0.38),
      targetY: Math.sin(angle * 3) * 0.08 * (0.62 + motionEnergy * 0.38),
    },
  };
}
