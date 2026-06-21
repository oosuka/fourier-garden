import { createSeededRandom } from "../../../core/seed";
import {
  MOBIUS_CHOIR_DEFINITION,
  getMobiusChoirTravelSpeed,
  mapMobiusChoirEmbedding,
} from "../math/model";
import type { QualityLevel } from "../../types";

export const MOBIUS_CHOIR_MAX_PARTICLES = 24_000;
export const MOBIUS_CHOIR_SURFACE_PARTICLES = 13_000;
export const MOBIUS_CHOIR_ATMOSPHERE_PARTICLES = 5_000;
export const MOBIUS_CHOIR_PANORAMA_PARTICLES = 6_000;
export const MOBIUS_CHOIR_RIBBON_POINT_COUNT = 128;

export interface MobiusChoirPoeticQuality {
  particleCount: number;
  surfaceParticleCount: number;
  atmosphereParticleCount: number;
  panoramaParticleCount: number;
  ribbonCount: number;
  trailLayers: number;
  haloCount: number;
}

export interface MobiusChoirLiftedPoint {
  sourceX: number;
  sourceY: number;
  lapIndex: number;
  x: number;
  y: number;
  z: number;
}

export interface MobiusChoirPoeticModel {
  readonly particleBase: Float32Array;
  readonly particleModeIds: Uint8Array;
  readonly particleKinds: Uint8Array;
  readonly particlePositions: Float32Array;
  readonly particleColors: Float32Array;
  readonly ribbonPositions: readonly Float32Array[];
}

const QUALITY: Readonly<Record<QualityLevel, MobiusChoirPoeticQuality>> = {
  low: {
    particleCount: 6_000,
    surfaceParticleCount: 3_300,
    atmosphereParticleCount: 1_200,
    panoramaParticleCount: 1_500,
    ribbonCount: 3,
    trailLayers: 1,
    haloCount: 6,
  },
  medium: {
    particleCount: 14_000,
    surfaceParticleCount: 7_500,
    atmosphereParticleCount: 2_500,
    panoramaParticleCount: 4_000,
    ribbonCount: 6,
    trailLayers: 2,
    haloCount: 6,
  },
  high: {
    particleCount: 24_000,
    surfaceParticleCount: 13_000,
    atmosphereParticleCount: 5_000,
    panoramaParticleCount: 6_000,
    ribbonCount: 6,
    trailLayers: 3,
    haloCount: 6,
  },
  ultra: {
    particleCount: 24_000,
    surfaceParticleCount: 13_000,
    atmosphereParticleCount: 5_000,
    panoramaParticleCount: 6_000,
    ribbonCount: 6,
    trailLayers: 3,
    haloCount: 6,
  },
};

function modulo(value: number, period: number): number {
  return ((value % period) + period) % period;
}

export function mapMobiusChoirLiftedPath(
  originalSourceX: number,
  liftedY: number,
): MobiusChoirLiftedPoint {
  if (
    !Number.isFinite(originalSourceX) ||
    originalSourceX < 0 ||
    originalSourceX > Math.PI ||
    !Number.isFinite(liftedY)
  ) {
    throw new Error("Möbius Choir lifted path coordinates must be finite and in range");
  }
  const lapIndex = Math.floor(liftedY / Math.PI);
  const sourceY = modulo(liftedY, Math.PI);
  const sourceX = Math.abs(lapIndex) % 2 === 1 ? Math.PI - originalSourceX : originalSourceX;
  const point = mapMobiusChoirEmbedding(sourceX, sourceY);
  return { sourceX, sourceY, lapIndex, ...point };
}

export function getMobiusChoirPoeticQuality(level: QualityLevel): MobiusChoirPoeticQuality {
  return QUALITY[level];
}

function createRibbonPositions(modeIndex: number): Float32Array {
  const mode = MOBIUS_CHOIR_DEFINITION.modes[modeIndex]!;
  const sourceX = Math.PI / (2 * mode.m);
  const positions = new Float32Array(MOBIUS_CHOIR_RIBBON_POINT_COUNT * 3);
  for (let index = 0; index < MOBIUS_CHOIR_RIBBON_POINT_COUNT; index += 1) {
    const liftedY = (2 * Math.PI * index) / (MOBIUS_CHOIR_RIBBON_POINT_COUNT - 1);
    const point = mapMobiusChoirLiftedPath(sourceX, liftedY);
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }
  return positions;
}

export function createMobiusChoirPoeticModel(seed: number): MobiusChoirPoeticModel {
  const random = createSeededRandom(seed);
  const particleBase = new Float32Array(MOBIUS_CHOIR_MAX_PARTICLES * 6);
  const particleModeIds = new Uint8Array(MOBIUS_CHOIR_MAX_PARTICLES);
  const particleKinds = new Uint8Array(MOBIUS_CHOIR_MAX_PARTICLES);
  const particlePositions = new Float32Array(MOBIUS_CHOIR_MAX_PARTICLES * 3);
  const particleColors = new Float32Array(MOBIUS_CHOIR_MAX_PARTICLES * 3);
  for (let index = 0; index < MOBIUS_CHOIR_MAX_PARTICLES; index += 1) {
    const modeIndex = index % MOBIUS_CHOIR_DEFINITION.modes.length;
    const mode = MOBIUS_CHOIR_DEFINITION.modes[modeIndex]!;
    const kind =
      index < MOBIUS_CHOIR_SURFACE_PARTICLES
        ? 0
        : index < MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES
          ? 1
          : 2;
    const offset = index * 6;
    if (kind === 2) {
      particleBase[offset] = -9 + random() * 18;
      particleBase[offset + 1] = -5 + random() * 10;
      particleBase[offset + 2] = -7 + random() * 12;
      particleBase[offset + 3] = random() * 2 * Math.PI;
      particleBase[offset + 4] = 0.08 + random() * 0.14;
      particleBase[offset + 5] = 0.35 + random() * 0.65;
      particleModeIds[index] = mode.id;
      particleKinds[index] = kind;
      const cyan = random();
      particleColors[index * 3] = 0.18 + cyan * 0.18;
      particleColors[index * 3 + 1] = 0.24 + cyan * 0.3;
      particleColors[index * 3 + 2] = 0.62 + random() * 0.42;
      continue;
    }
    const lane = Math.floor(random() * mode.m);
    const antinodeX = ((2 * lane + 1) * Math.PI) / (2 * mode.m);
    const sourceX = Math.min(
      Math.PI - 1e-4,
      Math.max(1e-4, antinodeX + (random() - 0.5) * (0.22 / mode.m)),
    );
    const speed =
      (mode.n > 0 ? getMobiusChoirTravelSpeed(mode) : 0.04 + random() * 0.025) *
      (kind === 0 ? 1.18 : 1.62);
    particleBase[offset] = sourceX;
    particleBase[offset + 1] = random() * 2 * Math.PI;
    particleBase[offset + 2] = speed * (0.76 + random() * 0.48);
    particleBase[offset + 3] = random() * 2 * Math.PI;
    particleBase[offset + 4] = kind === 0 ? 0.008 + random() * 0.058 : 0.24 + random() * 0.92;
    particleBase[offset + 5] = 0.35 + random() * 0.65;
    particleModeIds[index] = mode.id;
    particleKinds[index] = kind;
    const violet = modeIndex / Math.max(1, MOBIUS_CHOIR_DEFINITION.modes.length - 1);
    const brightness = kind === 0 ? 1 : 0.72;
    particleColors[index * 3] = (0.32 + violet * 0.5) * brightness;
    particleColors[index * 3 + 1] = (0.38 + (1 - violet) * 0.62) * brightness;
    particleColors[index * 3 + 2] = (1.08 + random() * 0.42) * brightness;
  }
  return {
    particleBase,
    particleModeIds,
    particleKinds,
    particlePositions,
    particleColors,
    ribbonPositions: MOBIUS_CHOIR_DEFINITION.modes.map((_, index) => createRibbonPositions(index)),
  };
}

function updateMobiusChoirParticle(
  model: MobiusChoirPoeticModel,
  absoluteTimeSeconds: number,
  modeEnergies: readonly number[],
  modeVelocities: readonly number[],
  index: number,
): void {
  const baseOffset = index * 6;
  const sourceX = model.particleBase[baseOffset]!;
  const liftedY =
    model.particleBase[baseOffset + 1]! + model.particleBase[baseOffset + 2]! * absoluteTimeSeconds;
  const phase = model.particleBase[baseOffset + 3]!;
  const radius = model.particleBase[baseOffset + 4]!;
  const modeIndex = model.particleModeIds[index]! - 1;
  const energy = modeEnergies[modeIndex]!;
  const velocity = modeVelocities[modeIndex]!;
  const kind = model.particleKinds[index]!;
  const output = index * 3;
  if (kind === 2) {
    const baseY = model.particleBase[baseOffset + 1]!;
    const baseZ = model.particleBase[baseOffset + 2]!;
    const speed = model.particleBase[baseOffset + 4]!;
    const depth = model.particleBase[baseOffset + 5]!;
    const flow = phase + absoluteTimeSeconds * speed * (0.72 + energy * 0.62 + velocity * 0.48);
    model.particlePositions[output] = sourceX + Math.sin(flow) * (0.55 + depth * 1.35);
    model.particlePositions[output + 1] = baseY + Math.cos(flow * 0.73) * (0.28 + depth * 0.72);
    model.particlePositions[output + 2] =
      baseZ + Math.sin(flow * 0.41 + phase * 0.3) * (0.45 + depth * 0.85);
    return;
  }
  const point = mapMobiusChoirLiftedPath(sourceX, liftedY);
  const oscillation = Math.sin(phase + absoluteTimeSeconds * (kind === 0 ? 0.92 : 0.34));
  const flutter =
    kind === 0
      ? radius * (0.24 + energy * 0.56 + velocity * 0.36) * oscillation
      : radius * (0.72 + energy * 0.16 + velocity * 0.18 + oscillation * 0.16);
  const length = Math.max(1e-6, Math.hypot(point.x, point.y, point.z));
  model.particlePositions[output] = point.x + (point.x / length) * flutter;
  model.particlePositions[output + 1] = point.y + (point.y / length) * flutter;
  model.particlePositions[output + 2] = point.z + (point.z / length) * flutter;
  if (kind === 1) {
    const driftPhase = phase + absoluteTimeSeconds * (0.16 + energy * 0.12 + velocity * 0.16);
    model.particlePositions[output] += Math.sin(driftPhase * 0.73) * 0.14;
    model.particlePositions[output + 1] += Math.cos(driftPhase) * 0.11;
    model.particlePositions[output + 2] += Math.sin(driftPhase * 1.21) * 0.14;
  }
}

export function updateMobiusChoirParticles(
  model: MobiusChoirPoeticModel,
  absoluteTimeSeconds: number,
  modeEnergies: readonly number[],
  modeVelocities: readonly number[],
  particleCount: number,
): void {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Möbius Choir particle time must be finite and nonnegative");
  }
  if (
    modeEnergies.length !== MOBIUS_CHOIR_DEFINITION.modes.length ||
    modeEnergies.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new Error("Möbius Choir particle mode energy must be finite and bounded");
  }
  if (
    modeVelocities.length !== MOBIUS_CHOIR_DEFINITION.modes.length ||
    modeVelocities.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new Error("Möbius Choir particle mode velocity must be finite and bounded");
  }
  if (
    !Number.isInteger(particleCount) ||
    particleCount < 0 ||
    particleCount > MOBIUS_CHOIR_MAX_PARTICLES
  ) {
    throw new Error("Möbius Choir particle count is out of range");
  }
  const quality = Object.values(QUALITY).find(
    (candidate) => candidate.particleCount === particleCount,
  );
  if (!quality) throw new Error("Möbius Choir particle count must match a quality budget");
  for (let index = 0; index < quality.surfaceParticleCount; index += 1) {
    updateMobiusChoirParticle(model, absoluteTimeSeconds, modeEnergies, modeVelocities, index);
  }
  for (let index = 0; index < quality.atmosphereParticleCount; index += 1) {
    updateMobiusChoirParticle(
      model,
      absoluteTimeSeconds,
      modeEnergies,
      modeVelocities,
      MOBIUS_CHOIR_SURFACE_PARTICLES + index,
    );
  }
  for (let index = 0; index < quality.panoramaParticleCount; index += 1) {
    updateMobiusChoirParticle(
      model,
      absoluteTimeSeconds,
      modeEnergies,
      modeVelocities,
      MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES + index,
    );
  }
}
