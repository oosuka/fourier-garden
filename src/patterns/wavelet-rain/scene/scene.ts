import * as THREE from "three/webgpu";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { WAVELET_RAIN_SCORE } from "../audio/score";
import { HAAR_COEFFICIENTS, evaluateHaarProjection } from "../math/model";
const PALETTE = [0x54eaff, 0x4b84ff, 0xa55cff] as const;

function findScoreEventIndex(localTimeSeconds: number): number {
  let lower = 0;
  let upper = WAVELET_RAIN_SCORE.events.length;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (WAVELET_RAIN_SCORE.events[middle]!.timeSeconds <= localTimeSeconds) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }
  return Math.max(0, lower - 1);
}

export function getWaveletRainVisualEvent(timeSeconds: number): Readonly<{
  eventIndex: number;
  coefficientIndex: number;
  supportPosition: number;
  pulse: number;
  progress: number;
}> {
  const localTime =
    ((timeSeconds % WAVELET_RAIN_SCORE.cycleSeconds) + WAVELET_RAIN_SCORE.cycleSeconds) %
    WAVELET_RAIN_SCORE.cycleSeconds;
  const scoreIndex = findScoreEventIndex(localTime);
  const event = WAVELET_RAIN_SCORE.events[scoreIndex]!;
  const nextEventTimeSeconds =
    scoreIndex + 1 < WAVELET_RAIN_SCORE.events.length
      ? WAVELET_RAIN_SCORE.events[scoreIndex + 1]!.timeSeconds
      : WAVELET_RAIN_SCORE.cycleSeconds;
  const eventDurationSeconds = nextEventTimeSeconds - event.timeSeconds;
  const coefficientIndex = event.sourceIndex % HAAR_COEFFICIENTS.length;
  const coefficient = HAAR_COEFFICIENTS[coefficientIndex]!;
  const progress = Math.max(0, Math.min(1, (localTime - event.timeSeconds) / eventDurationSeconds));
  const pulse = Math.sin(Math.PI * progress) ** 0.72;
  return {
    eventIndex: event.sourceIndex,
    coefficientIndex,
    supportPosition: (coefficient.start + coefficient.end) / 2,
    pulse,
    progress,
  };
}

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
  const dropGeometry = new THREE.SphereGeometry(1, 10, 7);
  const positiveDropMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE[0],
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const negativeDropMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE[2],
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const coefficientDrops = HAAR_COEFFICIENTS.map((coefficient, index) => {
    const centerX = ((coefficient.start + coefficient.end) / 2 - 0.5) * 9.6;
    const baseY = 3.2 - coefficient.j * 1.05;
    const radius = 0.055 + Math.sqrt(Math.abs(coefficient.value)) * 0.13;
    const mesh = new THREE.Mesh(
      dropGeometry,
      coefficient.value >= 0 ? positiveDropMaterial : negativeDropMaterial,
    );
    mesh.position.set(centerX, baseY, 0.4 + coefficient.j * 0.09);
    mesh.scale.set(radius * 0.62, radius * 1.65, radius * 0.62);
    mesh.userData.layer = "poetic-coefficient-drop";
    mesh.userData.coefficientIndex = index;
    group.add(mesh);
    return { coefficient, index, mesh, centerX, baseY, radius };
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
  const impactRingPositions = new Float32Array(65 * 3);
  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    impactRingPositions[index * 3] = Math.cos(angle);
    impactRingPositions[index * 3 + 1] = Math.sin(angle) * 0.28;
    impactRingPositions[index * 3 + 2] = 0;
  }
  const impactRing = createLine(impactRingPositions, 0xd9fbff, 0.36);
  group.add(scan.line, impactRing.line);
  return {
    group,
    update(timeSeconds: number) {
      const visualEvent = getWaveletRainVisualEvent(timeSeconds);
      const observation = visualEvent.supportPosition;
      scan.line.position.x = observation * 9.6;
      cells.forEach(({ coefficient, mesh, material, baseY }, index) => {
        const active = index === visualEvent.coefficientIndex;
        material.opacity = Math.min(
          0.68,
          (0.1 + Math.abs(coefficient.value) * 1.12) *
            (active ? 1.28 + visualEvent.pulse * 0.48 : 1),
        );
        mesh.position.y =
          baseY +
          Math.sin(timeSeconds * (0.32 + coefficient.j * 0.04) + index) * 0.17 +
          (active ? visualEvent.pulse * 0.12 : 0);
        mesh.rotation.z = Math.sin(timeSeconds * 0.09 + index * 0.73) * 0.018;
      });
      coefficientDrops.forEach(({ coefficient, index, mesh, centerX, baseY, radius }) => {
        const ambientProgress =
          (((timeSeconds * (0.032 + coefficient.j * 0.004) + index * 0.173) % 1) + 1) % 1;
        const active = index === visualEvent.coefficientIndex;
        const fallProgress = active
          ? 1 - (1 - visualEvent.progress) ** 2.2
          : ambientProgress * 0.72;
        mesh.position.x =
          centerX + Math.sin(timeSeconds * 0.21 + index * 1.17) * (0.025 + coefficient.j * 0.006);
        mesh.position.y = baseY - fallProgress * (baseY + 3.55);
        mesh.position.z =
          0.4 + coefficient.j * 0.09 + Math.sin(timeSeconds * 0.16 + index * 0.53) * 0.12;
        const response = active ? 1 + visualEvent.pulse * 1.45 : 0.72 + ambientProgress * 0.2;
        mesh.scale.set(
          radius * (0.56 + response * 0.12),
          radius * (1.25 + response * 0.8),
          radius * (0.56 + response * 0.12),
        );
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
            (index === visualEvent.coefficientIndex ? 0.18 + visualEvent.pulse * 0.26 : 0);
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
      impactRing.line.position.set((observation - 0.5) * 9.6, -3.72, 0.46);
      impactRing.line.scale.setScalar(0.18 + visualEvent.progress * 0.92);
      (impactRing.line.material as THREE.LineBasicMaterial).opacity =
        0.12 + visualEvent.pulse * 0.72;
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
