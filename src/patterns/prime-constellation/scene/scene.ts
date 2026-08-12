import * as THREE from "three/webgpu";

import type { RendererBackend } from "../../../core/rendererBackend";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  createPoints,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import {
  PRIME_PHRASE_SECONDS,
  PRIME_PHRASE_TIMES,
  PRIME_SUPPORT,
  PRIME_VISUAL_RATE,
  evaluatePrimeSum,
} from "../math/model";

const PALETTE = [0xffc46f, 0xff8c52, 0xf5f7ff] as const;
const LINK_ECHO_COUNT = 5;

export function createPrimeConstellationContent(backend: RendererBackend = "webgpu") {
  const group = new THREE.Group();
  const positions = new Float32Array(PRIME_SUPPORT.length * 3);
  const linkPositions = new Float32Array((PRIME_SUPPORT.length - 1) * 6);
  const pointCloud = createPoints(positions, PALETTE[0], 0.38, backend);
  const pointHalos = createPoints(positions, PALETTE[1], 0.86, backend);
  (pointHalos.points.material as THREE.PointsMaterial).opacity = 0.5;
  const pointAuras = createPoints(positions, PALETTE[2], 1.45, backend);
  (pointAuras.points.material as THREE.PointsMaterial).opacity = 0.12;
  const links = createLine(linkPositions, PALETTE[1], 0.82);
  const linkEchoes = Array.from({ length: LINK_ECHO_COUNT }, (_, echoIndex) => {
    const echoPositions = new Float32Array(linkPositions.length);
    const echo = createLine(
      echoPositions,
      PALETTE[echoIndex % PALETTE.length]!,
      0.09 + echoIndex * 0.018,
    );
    group.add(echo.line);
    return { positions: echoPositions, ...echo };
  });
  const centroidPosition = new Float32Array(3);
  const centroid = createPoints(centroidPosition, PALETTE[2], 0.58, backend);
  const centroidHalo = createPoints(centroidPosition, PALETTE[0], 1.7, backend);
  (centroidHalo.points.material as THREE.PointsMaterial).opacity = 0.2;
  const highlightPosition = new Float32Array(3);
  const highlight = createPoints(highlightPosition, 0xffffff, 0.72, backend);
  group.add(
    links.line,
    pointAuras.points,
    pointHalos.points,
    pointCloud.points,
    centroidHalo.points,
    centroid.points,
    highlight.points,
  );
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
      const localTime = timeSeconds % PRIME_PHRASE_SECONDS;
      let activeIndex = 0;
      while (
        activeIndex + 1 < PRIME_PHRASE_TIMES.length &&
        PRIME_PHRASE_TIMES[activeIndex + 1]! <= localTime
      ) {
        activeIndex += 1;
      }
      highlightPosition[0] = positions[activeIndex * 3]!;
      highlightPosition[1] = positions[activeIndex * 3 + 1]!;
      highlightPosition[2] = positions[activeIndex * 3 + 2]!;
      pointCloud.attribute.needsUpdate = true;
      pointHalos.attribute.needsUpdate = true;
      pointAuras.attribute.needsUpdate = true;
      links.attribute.needsUpdate = true;
      linkEchoes.forEach((echo, echoIndex) => {
        for (let coordinate = 0; coordinate < linkPositions.length; coordinate += 3) {
          const phase = timeSeconds * (0.08 + echoIndex * 0.007) + coordinate * 0.013;
          echo.positions[coordinate] = linkPositions[coordinate]! + Math.sin(phase) * 0.035;
          echo.positions[coordinate + 1] =
            linkPositions[coordinate + 1]! + Math.cos(phase * 0.83) * 0.045;
          echo.positions[coordinate + 2] = linkPositions[coordinate + 2]! - 0.12 - echoIndex * 0.16;
        }
        echo.attribute.needsUpdate = true;
        echo.line.rotation.y = Math.sin(timeSeconds * 0.024 + echoIndex) * 0.025;
      });
      centroid.attribute.needsUpdate = true;
      centroidHalo.attribute.needsUpdate = true;
      highlight.attribute.needsUpdate = true;
      const energy = evaluateFiveActEnergy(timeSeconds, 60);
      (pointCloud.points.material as THREE.PointsMaterial).size = 0.36 + energy * 0.2;
      (pointHalos.points.material as THREE.PointsMaterial).size = 0.76 + energy * 0.34;
      (pointAuras.points.material as THREE.PointsMaterial).size = 1.28 + energy * 0.54;
      (centroidHalo.points.material as THREE.PointsMaterial).size = 1.5 + energy * 0.8;
      group.rotation.y = Math.sin(timeSeconds * 0.052) * 0.26;
      group.rotation.z = Math.sin(timeSeconds * 0.031 + 0.8) * 0.055;
      return { energy, warmth: 0.82, cameraX: Math.sin(timeSeconds * 0.02) * 0.28 };
    },
  };
}

export function createPrimeConstellationScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.68, 1.4], 0.8, "constellation"),
    palette: PALETTE,
    particleBudgets: { low: 6_000, medium: 18_000, high: 40_000, ultra: 60_000 },
    extent: { x: 24, y: 17, z: 22 },
    camera: { distance: 12.4, height: 0, targetY: 0, fovDegrees: 46 },
    exposure: 1.05,
    createContent: createPrimeConstellationContent,
  });
}
