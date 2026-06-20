import {
  SPECTRAL_CATHEDRAL_SCORE,
  type SpectralCathedralSectionId,
} from "../audio/spectralCathedralScore";

export interface SpectralCathedralCameraChoreography {
  orbitRadians: number;
  dollyRatio: number;
  targetX: number;
  targetY: number;
}

export interface SpectralCathedralDramaturgyFrame {
  sectionId: SpectralCathedralSectionId;
  sectionProgress: number;
  cycleProgress: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
  camera: SpectralCathedralCameraChoreography;
}

interface SectionTarget {
  id: SpectralCathedralSectionId;
  startSeconds: number;
  endSeconds: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
}

const SECTION_TARGETS: readonly SectionTarget[] = [
  {
    id: "illumination",
    startSeconds: 0,
    endSeconds: 12.5,
    audioEnergy: 0.24,
    visualEnergy: 0.28,
    motionEnergy: 0.2,
  },
  {
    id: "procession",
    startSeconds: 12.5,
    endSeconds: 175 / 6,
    audioEnergy: 0.46,
    visualEnergy: 0.5,
    motionEnergy: 0.46,
  },
  {
    id: "ascent",
    startSeconds: 175 / 6,
    endSeconds: 275 / 6,
    audioEnergy: 0.68,
    visualEnergy: 0.72,
    motionEnergy: 0.7,
  },
  {
    id: "resonance",
    startSeconds: 275 / 6,
    endSeconds: 62.5,
    audioEnergy: 1,
    visualEnergy: 1,
    motionEnergy: 0.94,
  },
  {
    id: "afterglow",
    startSeconds: 62.5,
    endSeconds: 75,
    audioEnergy: 0.3,
    visualEnergy: 0.38,
    motionEnergy: 0.24,
  },
];

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function evaluateSpectralCathedralDramaturgy(
  absoluteTimeSeconds: number,
): SpectralCathedralDramaturgyFrame {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Spectral Cathedral dramaturgy time must be finite and nonnegative");
  }

  const cycleSeconds = SPECTRAL_CATHEDRAL_SCORE.cycleSeconds;
  const cycleTime = positiveModulo(absoluteTimeSeconds, cycleSeconds);
  const sectionIndex = SECTION_TARGETS.findIndex(
    (section) => cycleTime >= section.startSeconds && cycleTime < section.endSeconds,
  );
  const resolvedIndex = sectionIndex >= 0 ? sectionIndex : 0;
  const section = SECTION_TARGETS[resolvedIndex]!;
  const next = SECTION_TARGETS[(resolvedIndex + 1) % SECTION_TARGETS.length]!;
  const sectionProgress =
    (cycleTime - section.startSeconds) / (section.endSeconds - section.startSeconds);
  const transition = smoothstep01(sectionProgress);
  const audioEnergy = lerp(section.audioEnergy, next.audioEnergy, transition);
  const visualEnergy = lerp(section.visualEnergy, next.visualEnergy, transition);
  const motionEnergy = lerp(section.motionEnergy, next.motionEnergy, transition);
  const cycleProgress = cycleTime / cycleSeconds;
  const cycleAngle = cycleProgress * Math.PI * 2;

  return {
    sectionId: section.id,
    sectionProgress,
    cycleProgress,
    audioEnergy,
    visualEnergy,
    motionEnergy,
    camera: {
      orbitRadians: ((Math.sin(cycleAngle) * (4 * Math.PI)) / 180) * motionEnergy,
      dollyRatio: 1 + Math.sin(cycleAngle - Math.PI / 2) * 0.06 * motionEnergy,
      targetX: Math.sin(cycleAngle * 2) * 0.04 * motionEnergy,
      targetY: Math.sin(cycleAngle) * 0.025 * motionEnergy,
    },
  };
}
