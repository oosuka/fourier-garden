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
      opacity: 0.08 + Math.min(0.38, Math.abs(coefficient.value) * 1.05),
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
  const rainThreads = HAAR_COEFFICIENTS.map((coefficient, index) => {
    const centerX = ((coefficient.start + coefficient.end) / 2 - 0.5) * 9.6;
    const startY = 3.05 - coefficient.j * 1.05;
    const length = 0.62 + Math.min(3.8, Math.abs(coefficient.value) * 7.5);
    const positions = new Float32Array([centerX, startY, -0.7, centerX, startY - length, -0.7]);
    const thread = createLine(positions, coefficient.value >= 0 ? PALETTE[0] : PALETTE[2], 0.24);
    group.add(thread.line);
    return {
      coefficient,
      index,
      centerX,
      startY,
      length,
      positions,
      line: thread.line,
      attribute: thread.attribute,
    };
  });
  const reconstructionPositions = new Float32Array(512 * 3);
  for (let index = 0; index < 512; index += 1) {
    const x = index / 511;
    reconstructionPositions[index * 3] = (x - 0.5) * 9.6;
    reconstructionPositions[index * 3 + 1] = evaluateHaarProjection(x) * 0.8 - 3.7;
  }
  const reconstruction = createLine(reconstructionPositions, 0xd9fbff, 0.8);
  const reconstructionEchoes = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.LineBasicMaterial({
      color: PALETTE[index % PALETTE.length]!,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.Line(reconstruction.line.geometry, material);
    line.position.z = -0.18 - index * 0.2;
    group.add(line);
    return { line, material, index };
  });
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
          0.68,
          (0.1 + Math.abs(coefficient.value) * 1.12) * (active ? 1.28 : 1),
        );
        mesh.position.y =
          baseY + Math.sin(timeSeconds * (0.32 + coefficient.j * 0.04) + index) * 0.17;
        mesh.rotation.z = Math.sin(timeSeconds * 0.09 + index * 0.73) * 0.018;
      });
      rainThreads.forEach(
        ({ coefficient, index, centerX, startY, length, positions, attribute, line }) => {
          const pulse = Math.sin(timeSeconds * (0.36 + coefficient.j * 0.025) + index * 0.61);
          const sway =
            Math.sin(timeSeconds * 0.21 + index * 1.17) * (0.035 + coefficient.j * 0.008);
          positions[0] = centerX + sway;
          positions[1] = startY + pulse * 0.12;
          positions[3] = centerX - sway * 0.6;
          positions[4] = startY - length * (0.92 + pulse * 0.08);
          attribute.needsUpdate = true;
          (line.material as THREE.LineBasicMaterial).opacity =
            0.12 +
            Math.min(0.44, Math.abs(coefficient.value) * 1.4) +
            (observation >= coefficient.start && observation < coefficient.end ? 0.18 : 0);
        },
      );
      reconstructionEchoes.forEach(({ line, material, index }) => {
        line.position.x = Math.sin(timeSeconds * (0.043 + index * 0.006) + index) * 0.08;
        line.position.y =
          Math.cos(timeSeconds * (0.052 + index * 0.004) - index) * (0.05 + index * 0.025);
        material.opacity = 0.07 + index * 0.018 + Math.sin(timeSeconds * 0.18 + index) ** 2 * 0.05;
      });
      group.rotation.y = Math.sin(timeSeconds * 0.031) * 0.07;
      group.rotation.z = Math.sin(timeSeconds * 0.019 + 0.6) * 0.018;
      return { energy: evaluateFiveActEnergy(timeSeconds, 64), warmth: 0.12 };
    },
  };
}
export function createWaveletRainScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.52, 1.5], 1.2, "rain"),
    palette: PALETTE,
    particleBudgets: { low: 4_000, medium: 12_000, high: 26_000, ultra: 40_000 },
    extent: { x: 24, y: 16, z: 20 },
    camera: { distance: 12.4, height: 0, targetY: -0.2, fovDegrees: 48 },
    exposure: 1.04,
    createContent: createWaveletRainContent,
  });
}
