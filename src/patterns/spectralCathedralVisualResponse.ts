import {
  SPECTRAL_CATHEDRAL_SCORE,
  evaluateSpectralCathedralEvents,
  type EvaluatedSpectralCathedralEvent,
  type SpectralCathedralGesture,
} from "../audio/spectralCathedralScore";
import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  evaluateSpectralCathedralEigenfunction,
} from "../math/spectralCathedral";
import { evaluateSpectralCathedralDramaturgy } from "./spectralCathedralDramaturgy";
import type { SpectralCathedralLightAnchor } from "./spectralCathedralPoetic";

export interface SpectralCathedralModeInfluenceMatrix {
  byModeId: ReadonlyMap<number, readonly number[]>;
  pillarCount: number;
}

export interface SpectralCathedralPillarResponse {
  impact: number;
  afterglow: number;
  height: number;
  warmth: number;
}

export interface SpectralCathedralArchResponse {
  energy: number;
  progress: number;
  afterglow: number;
}

export interface SpectralCathedralParticleBandResponse {
  energy: number;
  swirl: number;
  verticalSpeed: number;
}

export interface SpectralCathedralVisualFrame {
  dramaturgy: ReturnType<typeof evaluateSpectralCathedralDramaturgy>;
  pillars: readonly SpectralCathedralPillarResponse[];
  arches: readonly SpectralCathedralArchResponse[];
  particles: readonly SpectralCathedralParticleBandResponse[];
}

const VISUAL_PROFILES = {
  toll: { attackSeconds: 0.018, decaySeconds: 0.72, endSeconds: 2.35 },
  answer: { attackSeconds: 0.014, decaySeconds: 0.38, endSeconds: 1.25 },
  cascade: { attackSeconds: 0.01, decaySeconds: 0.19, endSeconds: 0.78 },
  pulse: { attackSeconds: 0.008, decaySeconds: 0.13, endSeconds: 0.54 },
  choir: { attackSeconds: 0.026, decaySeconds: 0.88, endSeconds: 2.8 },
} as const satisfies Readonly<
  Record<
    SpectralCathedralGesture,
    { attackSeconds: number; decaySeconds: number; endSeconds: number }
  >
>;

const MAXIMUM_VISUAL_EVENT_SECONDS = 2.8;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getVisualEnvelope(ageSeconds: number, gesture: SpectralCathedralGesture): number {
  const profile = VISUAL_PROFILES[gesture];
  if (ageSeconds < 0 || ageSeconds >= profile.endSeconds) return 0;
  const attack = 1 - Math.exp(-ageSeconds / profile.attackSeconds);
  const decay = Math.exp(-ageSeconds / profile.decaySeconds);
  const fadeSeconds = 0.05;
  if (ageSeconds < profile.endSeconds - fadeSeconds) return attack * decay;
  const fadeProgress = (ageSeconds - (profile.endSeconds - fadeSeconds)) / fadeSeconds;
  return attack * decay * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

function getEventPillarInfluence(
  event: EvaluatedSpectralCathedralEvent,
  matrix: SpectralCathedralModeInfluenceMatrix,
): number[] {
  const influence = Array.from({ length: matrix.pillarCount }, () => 0);
  for (const modeId of event.modeIds) {
    const modeInfluence = matrix.byModeId.get(modeId);
    if (!modeInfluence) continue;
    for (const [index, value] of modeInfluence.entries()) {
      influence[index] = Math.max(influence[index]!, value);
    }
  }
  return influence;
}

export function createSpectralCathedralModeInfluenceMatrix(
  anchors: readonly SpectralCathedralLightAnchor[],
): SpectralCathedralModeInfluenceMatrix {
  if (anchors.length === 0) {
    throw new Error("Spectral Cathedral mode influence requires anchors");
  }

  const entries = SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => {
    const values = anchors.map((anchor) =>
      Math.abs(
        mode.coefficient *
          evaluateSpectralCathedralEigenfunction(
            SPECTRAL_CATHEDRAL_DEFINITION,
            mode,
            anchor.sourceX,
            anchor.sourceY,
          ),
      ),
    );
    const maximum = Math.max(...values, 1e-12);
    return [mode.id, values.map((value) => clamp01(value / maximum))] as const;
  });

  return {
    byModeId: new Map(entries),
    pillarCount: anchors.length,
  };
}

export function evaluateSpectralCathedralVisualFrame(
  absoluteTimeSeconds: number,
  matrix: SpectralCathedralModeInfluenceMatrix,
): SpectralCathedralVisualFrame {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Spectral Cathedral visual response time must be finite and nonnegative");
  }
  if (matrix.pillarCount < 2) {
    throw new Error("Spectral Cathedral visual response requires multiple pillars");
  }

  const dramaturgy = evaluateSpectralCathedralDramaturgy(absoluteTimeSeconds);
  const events = evaluateSpectralCathedralEvents(
    SPECTRAL_CATHEDRAL_SCORE,
    absoluteTimeSeconds,
    MAXIMUM_VISUAL_EVENT_SECONDS,
  );
  const impacts = Array.from({ length: matrix.pillarCount }, () => 0);
  const afterglowSums = Array.from({ length: matrix.pillarCount }, () => 0);
  const warmthSums = Array.from({ length: matrix.pillarCount }, () => 0);
  const influenceSums = Array.from({ length: matrix.pillarCount }, () => 0);

  for (const event of events) {
    const envelope = getVisualEnvelope(event.ageSeconds, event.gesture);
    const influence = getEventPillarInfluence(event, matrix);
    for (let index = 0; index < matrix.pillarCount; index += 1) {
      const weighted = envelope * influence[index]!;
      impacts[index] = Math.max(impacts[index]!, weighted);
      afterglowSums[index] += weighted;
      warmthSums[index] += weighted * event.baseBrightness;
      influenceSums[index] += weighted;
    }
  }

  const pillars = impacts.map((impact, index): SpectralCathedralPillarResponse => {
    const afterglow = clamp01(1 - Math.exp(-afterglowSums[index]! * 0.82));
    return {
      impact: clamp01(impact),
      afterglow,
      height: clamp01(0.22 + dramaturgy.visualEnergy * 0.2 + impact * 0.58),
      warmth:
        influenceSums[index]! > 0
          ? clamp01(warmthSums[index]! / influenceSums[index]!)
          : dramaturgy.visualEnergy * 0.12,
    };
  });

  const arches = Array.from(
    { length: matrix.pillarCount - 1 },
    (_, archIndex): SpectralCathedralArchResponse => {
      const delaySeconds = 0.08 + archIndex * (0.14 / Math.max(1, matrix.pillarCount - 2));
      let energy = 0;
      let progress = 0;
      let afterglow = 0;

      for (const event of events) {
        const delayedAge = event.ageSeconds - delaySeconds;
        const envelope = getVisualEnvelope(delayedAge, event.gesture);
        if (envelope <= 0) continue;
        const influence = getEventPillarInfluence(event, matrix);
        const localInfluence = (influence[archIndex]! + influence[archIndex + 1]!) * 0.5;
        const candidate = envelope * localInfluence;
        if (candidate >= energy) {
          energy = candidate;
          progress = clamp01(delayedAge / VISUAL_PROFILES[event.gesture].endSeconds);
        }
        afterglow += candidate;
      }

      return {
        energy: clamp01(energy),
        progress,
        afterglow: clamp01(
          1 -
            Math.exp(-afterglow * 0.75) +
            (pillars[archIndex]!.afterglow + pillars[archIndex + 1]!.afterglow) * 0.08,
        ),
      };
    },
  );

  const particles = pillars.map(
    (pillar): SpectralCathedralParticleBandResponse => ({
      energy: clamp01(
        pillar.impact * 0.68 + pillar.afterglow * 0.24 + dramaturgy.visualEnergy * 0.08,
      ),
      swirl: clamp01(dramaturgy.motionEnergy * 0.35 + pillar.impact * 0.65),
      verticalSpeed: clamp01(dramaturgy.motionEnergy * 0.42 + pillar.afterglow * 0.58),
    }),
  );

  return { dramaturgy, pillars, arches, particles };
}
