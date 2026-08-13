import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "../cinematic/model";
import type { CinematicEnvironmentLayout } from "../cinematic/model";

const FIVE_ACT_ENERGY_KEYFRAMES = [
  { progress: 0, energy: 0.48 },
  { progress: 0.16, energy: 0.68 },
  { progress: 0.4, energy: 0.9 },
  { progress: 0.54, energy: 1 },
  { progress: 0.68, energy: 0.9 },
  { progress: 0.76, energy: 0.52 },
  { progress: 0.84, energy: 0.58 },
  { progress: 0.94, energy: 0.76 },
  { progress: 1, energy: 0.48 },
] as const;

const ROUND_POINT_TEXTURE_SIZE = 32;

function createRoundPointTexture(): THREE.DataTexture {
  const data = new Uint8Array(ROUND_POINT_TEXTURE_SIZE * ROUND_POINT_TEXTURE_SIZE * 4);
  for (let row = 0; row < ROUND_POINT_TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < ROUND_POINT_TEXTURE_SIZE; column += 1) {
      const x = (column / (ROUND_POINT_TEXTURE_SIZE - 1) - 0.5) * 2;
      const y = (row / (ROUND_POINT_TEXTURE_SIZE - 1) - 0.5) * 2;
      const radius = Math.hypot(x, y);
      const alpha = Math.max(0, 1 - radius) ** 1.8;
      const offset = (row * ROUND_POINT_TEXTURE_SIZE + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    ROUND_POINT_TEXTURE_SIZE,
    ROUND_POINT_TEXTURE_SIZE,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createAnalyticProfile(
  palette: readonly [number, number, number],
  haloAspect: readonly [number, number],
  filamentPhase: number,
  layout: CinematicEnvironmentLayout = "field",
): CinematicEnvironmentProfile {
  return { particlePalette: palette, haloAspect, filamentPhase, layout };
}

export function createLine(
  positions: Float32Array,
  color: number,
  opacity = 0.82,
): Readonly<{ line: THREE.Line; attribute: THREE.BufferAttribute }> {
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", attribute);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return { line, attribute };
}

export function createPoints(
  positions: Float32Array,
  color: number,
  size: number,
  backend: "webgpu" | "webgl" = "webgpu",
): Readonly<{ points: THREE.Points; attribute: THREE.BufferAttribute }> {
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", attribute);
  const pointTexture = backend === "webgl" ? createRoundPointTexture() : null;
  const material = new THREE.PointsMaterial({
    color,
    size,
    map: pointTexture,
    alphaTest: pointTexture ? 0.015 : 0,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, attribute };
}

export function evaluateFiveActEnergy(timeSeconds: number, cycleSeconds: number): number {
  const progress = (((timeSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds) / cycleSeconds;
  let rightIndex = 1;
  while (
    rightIndex < FIVE_ACT_ENERGY_KEYFRAMES.length - 1 &&
    progress > FIVE_ACT_ENERGY_KEYFRAMES[rightIndex]!.progress
  ) {
    rightIndex += 1;
  }
  const right = FIVE_ACT_ENERGY_KEYFRAMES[rightIndex]!;
  const left = FIVE_ACT_ENERGY_KEYFRAMES[rightIndex - 1]!;
  const unit = (progress - left.progress) / (right.progress - left.progress);
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * unit);
  return left.energy + (right.energy - left.energy) * eased;
}
