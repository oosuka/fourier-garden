import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "../cinematic/model";

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

export function createAnalyticProfile(
  palette: readonly [number, number, number],
  haloAspect: readonly [number, number],
  filamentPhase: number,
): CinematicEnvironmentProfile {
  return { particlePalette: palette, haloAspect, filamentPhase, layout: "field" };
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
): Readonly<{ points: THREE.Points; attribute: THREE.BufferAttribute }> {
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", attribute);
  const material = new THREE.PointsMaterial({
    color,
    size,
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
