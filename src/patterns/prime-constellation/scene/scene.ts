import * as THREE from "three/webgpu";

import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  createPoints,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { PRIME_GAPS, PRIME_SUPPORT, PRIME_VISUAL_RATE, evaluatePrimeSum } from "../math/model";

const PALETTE = [0xffc46f, 0xff8c52, 0xf5f7ff] as const;

export function createPrimeConstellationContent() {
  const group = new THREE.Group();
  const positions = new Float32Array(PRIME_SUPPORT.length * 3);
  const linkPositions = new Float32Array((PRIME_SUPPORT.length - 1) * 6);
  const pointCloud = createPoints(positions, PALETTE[0], 0.24);
  const pointHalos = createPoints(positions, PALETTE[1], 0.5);
  (pointHalos.points.material as THREE.PointsMaterial).opacity = 0.42;
  const links = createLine(linkPositions, PALETTE[1], 0.72);
  const centroidPosition = new Float32Array(3);
  const centroid = createPoints(centroidPosition, PALETTE[2], 0.42);
  const highlightPosition = new Float32Array(3);
  const highlight = createPoints(highlightPosition, 0xffffff, 0.36);
  const phraseTimes = [0];
  for (const gap of PRIME_GAPS) phraseTimes.push(phraseTimes.at(-1)! + gap * 0.09);
  group.add(links.line, pointHalos.points, pointCloud.points, centroid.points, highlight.points);
  return {
    group,
    update(timeSeconds: number) {
      const x = timeSeconds * PRIME_VISUAL_RATE;
      for (let index = 0; index < PRIME_SUPPORT.length; index += 1) {
        const prime = PRIME_SUPPORT[index]!;
        const offset = index * 3;
        positions[offset] = Math.cos(prime * x) * 4.1;
        positions[offset + 1] = ((prime - 49.5) / 47.5) * 4.8;
        positions[offset + 2] = Math.sin(prime * x) * 2.8;
        if (index < PRIME_SUPPORT.length - 1) {
          const linkOffset = index * 6;
          linkPositions[linkOffset] = positions[offset]!;
          linkPositions[linkOffset + 1] = positions[offset + 1]!;
          linkPositions[linkOffset + 2] = positions[offset + 2]!;
          linkPositions[linkOffset + 3] = Math.cos(PRIME_SUPPORT[index + 1]! * x) * 4.1;
          linkPositions[linkOffset + 4] = ((PRIME_SUPPORT[index + 1]! - 49.5) / 47.5) * 4.8;
          linkPositions[linkOffset + 5] = Math.sin(PRIME_SUPPORT[index + 1]! * x) * 2.8;
        }
      }
      const sum = evaluatePrimeSum(x);
      centroidPosition[0] = sum.real * 3.2;
      centroidPosition[1] = 0;
      centroidPosition[2] = sum.imaginary * 3.2 + 0.5;
      const localTime = timeSeconds % 10;
      let activeIndex = 0;
      while (activeIndex + 1 < phraseTimes.length && phraseTimes[activeIndex + 1]! <= localTime) {
        activeIndex += 1;
      }
      highlightPosition[0] = positions[activeIndex * 3]!;
      highlightPosition[1] = positions[activeIndex * 3 + 1]!;
      highlightPosition[2] = positions[activeIndex * 3 + 2]!;
      pointCloud.attribute.needsUpdate = true;
      pointHalos.attribute.needsUpdate = true;
      links.attribute.needsUpdate = true;
      centroid.attribute.needsUpdate = true;
      highlight.attribute.needsUpdate = true;
      const energy = evaluateFiveActEnergy(timeSeconds, 60);
      (pointCloud.points.material as THREE.PointsMaterial).size = 0.24 + energy * 0.13;
      (pointHalos.points.material as THREE.PointsMaterial).size = 0.5 + energy * 0.2;
      group.rotation.y = Math.sin(timeSeconds * 0.025) * 0.18;
      return { energy, warmth: 0.82, cameraX: Math.sin(timeSeconds * 0.02) * 0.28 };
    },
  };
}

export function createPrimeConstellationScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.68, 1.4], 0.8),
    palette: PALETTE,
    particleBudgets: { low: 6_000, medium: 18_000, high: 40_000, ultra: 60_000 },
    extent: { x: 24, y: 17, z: 22 },
    camera: { distance: 12.4, height: 0, targetY: 0, fovDegrees: 46 },
    exposure: 1.05,
    createContent: createPrimeConstellationContent,
  });
}
