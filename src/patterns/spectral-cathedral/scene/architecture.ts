import type { SpectralCathedralLightAnchor } from "./poetic";

export const CATHEDRAL_ARCH_FILAMENTS = 5;
export const CATHEDRAL_VAULT_REPEATS = 4;
export const CATHEDRAL_GRAND_VAULT_RIBS = 9;
const GRAND_VAULT_POINTS = 65;

const FILAMENT_OFFSETS = [0, -0.018, -0.009, 0.009, 0.018] as const;
const VAULT_DEPTHS = [-0.2, -0.42, -0.66, -0.92] as const;
const VAULT_SCALES = [1.04, 0.98, 0.92, 0.86] as const;

export interface CathedralPillarModel {
  readonly x: number;
  readonly y: number;
  readonly bottomZ: number;
  readonly topZ: number;
  readonly radius: number;
}

export interface CathedralArchitectureModel {
  readonly pillars: readonly CathedralPillarModel[];
  readonly archFilaments: readonly Float32Array[];
  readonly vaultRepeats: readonly Float32Array[];
  readonly grandVaultRibs: readonly Float32Array[];
}

function validateArchPositions(archPositions: readonly Float32Array[]): void {
  if (archPositions.length === 0) throw new Error("Cathedral architecture requires arches");
  for (const positions of archPositions) {
    if (positions.length < 6 || positions.length % 3 !== 0) {
      throw new Error("Cathedral arch position buffers must contain complete points");
    }
    if (!positions.every(Number.isFinite)) {
      throw new Error("Cathedral arch positions must be finite");
    }
  }
}

function createFilament(positions: Float32Array, offsetDistance: number): Float32Array {
  if (offsetDistance === 0) return positions.slice();
  const filament = new Float32Array(positions.length);
  const pointCount = positions.length / 3;
  for (let index = 0; index < pointCount; index += 1) {
    const previousIndex = Math.max(0, index - 1);
    const nextIndex = Math.min(pointCount - 1, index + 1);
    const tangentX = positions[nextIndex * 3]! - positions[previousIndex * 3]!;
    const tangentY = positions[nextIndex * 3 + 1]! - positions[previousIndex * 3 + 1]!;
    const length = Math.max(1e-9, Math.hypot(tangentX, tangentY));
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    const offset = index * 3;
    filament[offset] = positions[offset]! + normalX * offsetDistance;
    filament[offset + 1] = positions[offset + 1]! + normalY * offsetDistance;
    filament[offset + 2] = positions[offset + 2]!;
  }
  return filament;
}

function createVaultRepeat(positions: Float32Array, depth: number, scale: number): Float32Array {
  const repeated = new Float32Array(positions.length);
  const lastOffset = positions.length - 3;
  const centerX = (positions[0]! + positions[lastOffset]!) * 0.5;
  const centerY = (positions[1]! + positions[lastOffset + 1]!) * 0.5;
  for (let offset = 0; offset < positions.length; offset += 3) {
    repeated[offset] = centerX + (positions[offset]! - centerX) * scale;
    repeated[offset + 1] = centerY + (positions[offset + 1]! - centerY) * scale;
    repeated[offset + 2] = positions[offset + 2]! * scale + depth;
  }
  return repeated;
}

function createGrandVaultRibs(): readonly Float32Array[] {
  return Array.from({ length: CATHEDRAL_GRAND_VAULT_RIBS }, (_, ribIndex) => {
    const positions = new Float32Array(GRAND_VAULT_POINTS * 3);
    const depthProgress = ribIndex / (CATHEDRAL_GRAND_VAULT_RIBS - 1);
    const y = -1.74 + depthProgress * 3.16;
    const width = 1.95 - Math.abs(depthProgress - 0.5) * 0.18;
    for (let pointIndex = 0; pointIndex < GRAND_VAULT_POINTS; pointIndex += 1) {
      const progress = pointIndex / (GRAND_VAULT_POINTS - 1);
      const normalizedX = progress * 2 - 1;
      const arch = Math.max(0, 1 - Math.abs(normalizedX) ** 1.35) ** 0.72;
      const offset = pointIndex * 3;
      positions[offset] = normalizedX * width;
      positions[offset + 1] = y;
      positions[offset + 2] = 0.02 + arch * 2.84;
    }
    return positions;
  });
}

export function createCathedralArchitectureModel(
  anchors: readonly SpectralCathedralLightAnchor[],
  archPositions: readonly Float32Array[],
): CathedralArchitectureModel {
  validateArchPositions(archPositions);
  if (anchors.length !== archPositions.length + 1) {
    throw new Error("Cathedral architecture requires one more anchor than arch");
  }
  const pillars = anchors.map((anchor) => ({
    x: anchor.displayX,
    y: anchor.displayY,
    bottomZ: 0.02,
    topZ: 2.58,
    radius: 0.024,
  }));
  const archFilaments = archPositions.flatMap((positions) =>
    FILAMENT_OFFSETS.map((offset) => createFilament(positions, offset)),
  );
  const vaultRepeats = archPositions.flatMap((positions) =>
    VAULT_DEPTHS.map((depth, index) => createVaultRepeat(positions, depth, VAULT_SCALES[index]!)),
  );
  return { pillars, archFilaments, vaultRepeats, grandVaultRibs: createGrandVaultRibs() };
}
