import * as THREE from "three/webgpu";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { HAAR_COEFFICIENTS, evaluateHaarProjection } from "../math/model";
const PALETTE = [0x54eaff, 0x4b84ff, 0xa55cff] as const;
export function createWaveletRainContent() {
  const group = new THREE.Group();
  const cells = HAAR_COEFFICIENTS.map((coefficient) => {
    const width = Math.max(0.035, (coefficient.end - coefficient.start) * 9.6);
    const geometry = new THREE.PlaneGeometry(width, 0.62);
    const color = coefficient.value >= 0 ? PALETTE[0] : PALETTE[2];
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2 + Math.min(0.72, Math.abs(coefficient.value) * 1.8),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      ((coefficient.start + coefficient.end) / 2 - 0.5) * 9.6,
      3.2 - coefficient.j * 1.05,
      -coefficient.j * 0.38,
    );
    mesh.scale.y = 0.6 + Math.min(1.4, Math.abs(coefficient.value) * 3);
    group.add(mesh);
    return { coefficient, mesh, material, baseY: mesh.position.y };
  });
  const reconstructionPositions = new Float32Array(512 * 3);
  for (let index = 0; index < 512; index += 1) {
    const x = index / 511;
    reconstructionPositions[index * 3] = (x - 0.5) * 9.6;
    reconstructionPositions[index * 3 + 1] = evaluateHaarProjection(x) * 0.8 - 3.7;
  }
  const reconstruction = createLine(reconstructionPositions, 0xd9fbff, 0.8);
  group.add(reconstruction.line);
  const scanPositions = new Float32Array([-4.8, -4.6, 0.4, -4.8, 4.1, 0.4]);
  const scan = createLine(scanPositions, 0xffffff, 0.7);
  group.add(scan.line);
  return {
    group,
    update(timeSeconds: number) {
      const observation = (0.04 * timeSeconds) % 1;
      scan.line.position.x = observation * 9.6;
      cells.forEach(({ coefficient, mesh, material, baseY }, index) => {
        const active = observation >= coefficient.start && observation < coefficient.end;
        material.opacity = Math.min(
          0.95,
          (0.16 + Math.abs(coefficient.value) * 1.7) * (active ? 1.8 : 1),
        );
        mesh.position.y =
          baseY + Math.sin(timeSeconds * (0.32 + coefficient.j * 0.04) + index) * 0.17;
      });
      return { energy: evaluateFiveActEnergy(timeSeconds, 64), warmth: 0.12 };
    },
  };
}
export function createWaveletRainScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.52, 1.5], 1.2),
    palette: PALETTE,
    particleBudgets: { low: 4_000, medium: 12_000, high: 26_000, ultra: 40_000 },
    extent: { x: 24, y: 16, z: 20 },
    camera: { distance: 12.4, height: 0, targetY: -0.2, fovDegrees: 48 },
    exposure: 1.04,
    createContent: createWaveletRainContent,
  });
}
