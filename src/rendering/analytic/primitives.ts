import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "../cinematic/model";

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
  if (progress < 0.16) return 0.48 + progress * 1.2;
  if (progress < 0.4) return 0.68 + (progress - 0.16) * 0.8;
  if (progress < 0.68) return 0.9 + Math.sin(((progress - 0.4) / 0.28) * Math.PI) * 0.1;
  if (progress < 0.84) return 0.52;
  return 0.58 + ((progress - 0.84) / 0.16) * 0.18;
}
