import { createSeededRandom } from "../core/seed";
import type { RendererBackend } from "../core/rendererBackend";
import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_GRID_COLUMNS,
  SPECTRAL_CATHEDRAL_GRID_ROWS,
  evaluateSpectralCathedralField,
  normalizeSpectralCathedralField,
} from "../math/spectralCathedral";
import { createSpectralCathedralDrawingModel } from "./spectralCathedralDrawing";
import type { QualityLevel } from "./types";

export const SPECTRAL_CATHEDRAL_LIGHT_ANCHOR_LIMIT = 8;
export const SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT = 7;
export const SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT = 48;
export const SPECTRAL_CATHEDRAL_MAX_PARTICLES = 35_000;

const MINIMUM_ANCHOR_DISTANCE = SPECTRAL_CATHEDRAL_DEFINITION.width * 0.12;
const LOCAL_MAXIMUM_EPSILON = 1e-12;

export interface SpectralCathedralLightAnchor {
  id: number;
  sourceX: number;
  sourceY: number;
  displayX: number;
  displayY: number;
  initialMagnitude: number;
  breathingPhase: number;
}

export interface SpectralCathedralPoeticQuality {
  particleCount: number;
  volumetricHaloCount: number;
  archTrailLayers: number;
}

export interface SpectralCathedralPoeticModel {
  readonly anchors: readonly SpectralCathedralLightAnchor[];
  readonly archPositions: readonly Float32Array[];
  readonly particleBase: Float32Array;
  readonly particlePositions: Float32Array;
  readonly particleColors: Float32Array;
  readonly particleAnchorIndices: Uint8Array;
}

const WEBGPU_QUALITY: Readonly<Record<QualityLevel, SpectralCathedralPoeticQuality>> = {
  low: {
    particleCount: 6_000,
    volumetricHaloCount: 0,
    archTrailLayers: 0,
  },
  medium: {
    particleCount: 14_000,
    volumetricHaloCount: 4,
    archTrailLayers: 1,
  },
  high: {
    particleCount: 26_000,
    volumetricHaloCount: 7,
    archTrailLayers: 2,
  },
  ultra: {
    particleCount: 35_000,
    volumetricHaloCount: 7,
    archTrailLayers: 3,
  },
};

export function getSpectralCathedralPoeticQuality(
  level: QualityLevel,
  backend: RendererBackend,
): SpectralCathedralPoeticQuality {
  const quality = WEBGPU_QUALITY[level];
  return {
    ...quality,
    volumetricHaloCount:
      backend === "webgl"
        ? level === "ultra"
          ? 7
          : level === "high"
            ? 4
            : 0
        : quality.volumetricHaloCount,
  };
}

function isLocalMaximum(fieldValues: Float64Array, row: number, column: number): boolean {
  const index = row * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column;
  const magnitude = Math.abs(fieldValues[index]!);
  if (magnitude <= LOCAL_MAXIMUM_EPSILON) return false;

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighborIndex =
        (row + rowOffset) * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column + columnOffset;
      const neighborMagnitude = Math.abs(fieldValues[neighborIndex]!);
      if (neighborMagnitude > magnitude + LOCAL_MAXIMUM_EPSILON) return false;
      if (
        Math.abs(neighborMagnitude - magnitude) <= LOCAL_MAXIMUM_EPSILON &&
        neighborIndex < index
      ) {
        return false;
      }
    }
  }
  return true;
}

export function createSpectralCathedralLightAnchors(): SpectralCathedralLightAnchor[] {
  const drawing = createSpectralCathedralDrawingModel();
  const candidates: SpectralCathedralLightAnchor[] = [];

  for (let row = 1; row < SPECTRAL_CATHEDRAL_GRID_ROWS - 1; row += 1) {
    for (let column = 1; column < SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1; column += 1) {
      if (!isLocalMaximum(drawing.fieldValues, row, column)) continue;
      const index = row * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column;
      candidates.push({
        id: -1,
        sourceX: drawing.sourceX[index]!,
        sourceY: drawing.sourceY[index]!,
        displayX: drawing.positions[index * 3]!,
        displayY: drawing.positions[index * 3 + 1]!,
        initialMagnitude: Math.abs(drawing.fieldValues[index]!),
        breathingPhase: 0,
      });
    }
  }

  candidates.sort(
    (left, right) =>
      right.initialMagnitude - left.initialMagnitude ||
      left.sourceX - right.sourceX ||
      left.sourceY - right.sourceY,
  );

  const selected: SpectralCathedralLightAnchor[] = [];
  for (const candidate of candidates) {
    if (
      selected.some(
        (anchor) =>
          Math.hypot(candidate.sourceX - anchor.sourceX, candidate.sourceY - anchor.sourceY) <
          MINIMUM_ANCHOR_DISTANCE,
      )
    ) {
      continue;
    }
    selected.push({ ...candidate, id: selected.length + 1 });
    if (selected.length === SPECTRAL_CATHEDRAL_LIGHT_ANCHOR_LIMIT) break;
  }

  if (selected.length === 0) {
    throw new Error(
      `Spectral Cathedral must provide poetic light anchors; ` +
        `found ${candidates.length} local maxima`,
    );
  }
  return selected;
}

function createArchPositions(
  start: SpectralCathedralLightAnchor,
  end: SpectralCathedralLightAnchor,
): Float32Array {
  const positions = new Float32Array(SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT * 3);
  const distance = Math.hypot(end.displayX - start.displayX, end.displayY - start.displayY);

  for (let index = 0; index < SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT; index += 1) {
    const progress = index / (SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT - 1);
    const offset = index * 3;
    positions[offset] = start.displayX + (end.displayX - start.displayX) * progress;
    positions[offset + 1] = start.displayY + (end.displayY - start.displayY) * progress;
    positions[offset + 2] = 0.24 + Math.sin(Math.PI * progress) * (0.42 + 0.18 * distance);
  }
  return positions;
}

function initializeParticles(
  random: () => number,
  anchors: readonly SpectralCathedralLightAnchor[],
  base: Float32Array,
  positions: Float32Array,
  colors: Float32Array,
  anchorIndices: Uint8Array,
): void {
  for (let index = 0; index < SPECTRAL_CATHEDRAL_MAX_PARTICLES; index += 1) {
    const baseOffset = index * 6;
    const positionOffset = index * 3;
    const baseX = -1.45 + random() * 2.9;
    const baseY = -1.05 + random() * 2.1;
    const baseZ = -0.28 + random() * 2;
    base[baseOffset] = baseX;
    base[baseOffset + 1] = baseY;
    base[baseOffset + 2] = baseZ;
    base[baseOffset + 3] = 0.018 + random() * 0.037;
    base[baseOffset + 4] = random() * Math.PI * 2;
    base[baseOffset + 5] = 0.4 + random() * 0.6;
    positions[positionOffset] = baseX;
    positions[positionOffset + 1] = baseY;
    positions[positionOffset + 2] = baseZ;

    let nearestAnchorIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const [anchorIndex, anchor] of anchors.entries()) {
      const distance = (baseX - anchor.displayX) ** 2 + (baseY - anchor.displayY) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestAnchorIndex = anchorIndex;
      }
    }
    anchorIndices[index] = nearestAnchorIndex;

    const colorCategory = random();
    const brightness = base[baseOffset + 5]!;
    const color =
      colorCategory < 0.55
        ? ([0.18, 1.2, 1.35] as const)
        : colorCategory < 0.9
          ? ([0.82, 0.98, 1.15] as const)
          : ([1.25, 0.72, 0.32] as const);
    colors[positionOffset] = color[0] * brightness;
    colors[positionOffset + 1] = color[1] * brightness;
    colors[positionOffset + 2] = color[2] * brightness;
  }
}

export function createSpectralCathedralPoeticModel(seed: number): SpectralCathedralPoeticModel {
  if (!Number.isFinite(seed)) {
    throw new Error("Spectral Cathedral poetic seed must be finite");
  }
  const random = createSeededRandom(Math.trunc(seed) >>> 0);
  const anchors = createSpectralCathedralLightAnchors();
  for (const anchor of anchors) {
    anchor.breathingPhase = random() * Math.PI * 2;
  }
  const archOrder = anchors.toSorted(
    (left, right) => left.displayX - right.displayX || left.displayY - right.displayY,
  );
  const archPositions = archOrder
    .slice(0, -1)
    .map((anchor, index) => createArchPositions(anchor, archOrder[index + 1]!));
  const particleBase = new Float32Array(SPECTRAL_CATHEDRAL_MAX_PARTICLES * 6);
  const particlePositions = new Float32Array(SPECTRAL_CATHEDRAL_MAX_PARTICLES * 3);
  const particleColors = new Float32Array(SPECTRAL_CATHEDRAL_MAX_PARTICLES * 3);
  const particleAnchorIndices = new Uint8Array(SPECTRAL_CATHEDRAL_MAX_PARTICLES);
  initializeParticles(
    random,
    anchors,
    particleBase,
    particlePositions,
    particleColors,
    particleAnchorIndices,
  );

  return {
    anchors,
    archPositions,
    particleBase,
    particlePositions,
    particleColors,
    particleAnchorIndices,
  };
}

export function evaluateSpectralCathedralAnchorMagnitudes(
  anchors: readonly SpectralCathedralLightAnchor[],
  absoluteTimeSeconds: number,
): number[] {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Spectral Cathedral anchor field time must be finite and nonnegative");
  }

  return anchors.map((anchor) =>
    Math.min(
      1,
      Math.abs(
        normalizeSpectralCathedralField(
          SPECTRAL_CATHEDRAL_DEFINITION,
          evaluateSpectralCathedralField(
            SPECTRAL_CATHEDRAL_DEFINITION,
            anchor.sourceX,
            anchor.sourceY,
            absoluteTimeSeconds,
          ),
        ),
      ),
    ),
  );
}

export function updateSpectralCathedralParticles(
  model: SpectralCathedralPoeticModel,
  absoluteTimeSeconds: number,
  particleEnergies: readonly number[],
  particleCount: number,
): void {
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) {
    throw new Error("Spectral Cathedral particle time must be finite and nonnegative");
  }
  if (
    particleEnergies.length !== model.anchors.length ||
    particleEnergies.some((energy) => !Number.isFinite(energy) || energy < 0 || energy > 1)
  ) {
    throw new Error("Spectral Cathedral particle energy must be inside zero through one");
  }
  if (
    !Number.isInteger(particleCount) ||
    particleCount < 0 ||
    particleCount > SPECTRAL_CATHEDRAL_MAX_PARTICLES
  ) {
    throw new Error("Spectral Cathedral particle count is out of range");
  }

  for (let index = 0; index < particleCount; index += 1) {
    const baseOffset = index * 6;
    const positionOffset = index * 3;
    const baseX = model.particleBase[baseOffset]!;
    const baseY = model.particleBase[baseOffset + 1]!;
    const baseZ = model.particleBase[baseOffset + 2]!;
    const speed = model.particleBase[baseOffset + 3]!;
    const phase = model.particleBase[baseOffset + 4]!;
    const energy = particleEnergies[model.particleAnchorIndices[index]!]!;
    const speedScale = 1 + energy * 1.8;
    const radius = 0.03 + energy * 0.14;
    const phaseSpeed = 0.07 + energy * 0.55;
    const normalizedBaseZ = (baseZ + 0.28) / 2;
    const progress = (((normalizedBaseZ + absoluteTimeSeconds * speed * speedScale) % 1) + 1) % 1;

    model.particlePositions[positionOffset] =
      baseX + Math.sin(absoluteTimeSeconds * phaseSpeed + phase) * radius;
    model.particlePositions[positionOffset + 1] =
      baseY + Math.cos(absoluteTimeSeconds * phaseSpeed * 0.74 + phase * 1.7) * radius * 0.64;
    model.particlePositions[positionOffset + 2] = -0.28 + progress * 2;
  }
}
