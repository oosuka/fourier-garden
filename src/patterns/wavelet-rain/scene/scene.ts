import { createWaveletRainWorkletProgram } from "../audio/synthesis";
import * as THREE from "three/webgpu";
import { getPikoEnvelope } from "../../../audio/pikoProgram";
import { createEventResonance } from "../../../rendering/analytic/eventResonance";
import { configurePoeticObjects } from "../../../rendering/analytic/displayLayers";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { WAVELET_RAIN_SCORE } from "../audio/score";
import { HAAR_COEFFICIENTS, evaluateHaarProjection } from "../math/model";
const PALETTE = [0xd5ddd5, 0x7c9198, 0x9bafa5] as const;

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
  const pulse = getPikoEnvelope(event, localTime - event.timeSeconds);
  return {
    eventIndex: event.sourceIndex,
    coefficientIndex,
    supportPosition: (coefficient.start + coefficient.end) / 2,
    pulse,
    progress,
  };
}

export function createWaveletRainContent(
  backend: "webgpu" | "webgl" = "webgpu",
  poeticLayers = true,
) {
  const group = new THREE.Group();
  const cells = HAAR_COEFFICIENTS.map((coefficient) => {
    const width = Math.max(0.035, (coefficient.end - coefficient.start) * 9.6);
    const geometry = new THREE.PlaneGeometry(width, 0.62);
    const color = coefficient.value >= 0 ? PALETTE[0] : PALETTE[2];
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.025 + Math.sqrt(Math.min(1, Math.abs(coefficient.value))) * 0.085,
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
    mesh.scale.y = 0.72;
    group.add(mesh);
    return { coefficient, mesh, material, baseY: mesh.position.y };
  });
  const supportPositions = new Float32Array(HAAR_COEFFICIENTS.length * 8 * 3);
  const supportColors = new Float32Array(supportPositions.length);
  const supportColor = new THREE.Color();
  HAAR_COEFFICIENTS.forEach((coefficient, index) => {
    const left = (coefficient.start - 0.5) * 9.6;
    const right = (coefficient.end - 0.5) * 9.6;
    const centerY = 3.2 - coefficient.j * 1.05;
    const top = centerY + 0.62 * 0.36;
    const bottom = centerY - 0.62 * 0.36;
    const z = -coefficient.j * 0.38 + 0.01;
    supportPositions.set(
      [
        left,
        top,
        z,
        right,
        top,
        z,
        right,
        top,
        z,
        right,
        bottom,
        z,
        right,
        bottom,
        z,
        left,
        bottom,
        z,
        left,
        bottom,
        z,
        left,
        top,
        z,
      ],
      index * 24,
    );
    supportColor.set(coefficient.value >= 0 ? PALETTE[0] : PALETTE[2]);
    for (let vertex = 0; vertex < 8; vertex++)
      supportColor.toArray(supportColors, index * 24 + vertex * 3);
  });
  const supportGeometry = new THREE.BufferGeometry();
  supportGeometry.setAttribute("position", new THREE.BufferAttribute(supportPositions, 3));
  supportGeometry.setAttribute("color", new THREE.BufferAttribute(supportColors, 3));
  const supports = new THREE.LineSegments(
    supportGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  supports.name = "haar-supports";
  group.add(supports);
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
  const reconstructionPositions = new Float32Array(128 * 3);
  for (let index = 0; index < 64; index += 1) {
    const value = evaluateHaarProjection((index + 0.5) / 64) * 0.8 - 3.7;
    reconstructionPositions.set(
      [(index / 64 - 0.5) * 9.6, value, 0, ((index + 1) / 64 - 0.5) * 9.6, value, 0],
      index * 6,
    );
  }
  const reconstructionBase = createLine(reconstructionPositions, 0xece7dc, 0.8);
  const reconstruction = {
    ...reconstructionBase,
    line: new THREE.LineSegments(
      reconstructionBase.line.geometry,
      reconstructionBase.line.material,
    ),
  };
  reconstruction.line.name = "haar-projection";
  const reconstructionEchoes = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.LineBasicMaterial({
      color: PALETTE[index % PALETTE.length]!,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.LineSegments(reconstruction.line.geometry, material);
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
  const resonance = createEventResonance(WAVELET_RAIN_SCORE, backend, {
    gesture: "rain",
    colors: PALETTE,
    timbre: createWaveletRainWorkletProgram().timbre,
    locate(voice, _time, target) {
      const coefficient = HAAR_COEFFICIENTS[voice.event.sourceIndex % HAAR_COEFFICIENTS.length]!;
      target.set(
        ((coefficient.start + coefficient.end) / 2 - 0.5) * 9.6,
        3.2 - coefficient.j * 1.05,
        -coefficient.j * 0.38 + 0.02,
      );
    },
  });
  group.add(resonance.group);
  configurePoeticObjects(
    poeticLayers,
    resonance.group,
    impactRing.line,
    ...coefficientDrops.map((drop) => drop.mesh),
    ...rainThreads.map((thread) => thread.line),
    ...reconstructionEchoes.map((echo) => echo.line),
  );
  return {
    group,
    update(timeSeconds: number, reducedMotion = false) {
      const stagingTime = reducedMotion ? 0 : timeSeconds;
      resonance.update(timeSeconds, reducedMotion);
      const visualEvent = getWaveletRainVisualEvent(timeSeconds);
      const observation = visualEvent.supportPosition;
      scan.line.position.x = observation * 9.6;
      cells.forEach(({ coefficient, mesh, material, baseY }, index) => {
        const active = index === visualEvent.coefficientIndex;
        material.opacity =
          0.025 +
          Math.sqrt(Math.min(1, Math.abs(coefficient.value))) * 0.085 +
          (active ? visualEvent.pulse * 0.075 : 0);
        mesh.position.y = baseY;
        mesh.rotation.z = 0;
      });
      coefficientDrops.forEach(({ coefficient, index, mesh, centerX, baseY, radius }) => {
        const ambientProgress =
          (((stagingTime * (0.032 + coefficient.j * 0.004) + index * 0.173) % 1) + 1) % 1;
        const active = index === visualEvent.coefficientIndex;
        const fallProgress = reducedMotion
          ? 0
          : active
            ? 1 - (1 - visualEvent.progress) ** 2.2
            : ambientProgress * 0.72;
        mesh.position.x =
          centerX + Math.sin(stagingTime * 0.21 + index * 1.17) * (0.025 + coefficient.j * 0.006);
        mesh.position.y = baseY - fallProgress * (baseY + 3.55);
        mesh.position.z =
          0.4 + coefficient.j * 0.09 + Math.sin(stagingTime * 0.16 + index * 0.53) * 0.12;
        const response = active ? 1 + visualEvent.pulse * 1.45 : 0.72 + ambientProgress * 0.2;
        mesh.scale.set(
          radius * (0.56 + response * 0.12),
          radius * (1.25 + response * 0.8),
          radius * (0.56 + response * 0.12),
        );
      });
      rainThreads.forEach(
        ({ coefficient, index, centerX, startY, length, positions, attribute, line }) => {
          const pulse = Math.sin(stagingTime * (0.36 + coefficient.j * 0.025) + index * 0.61);
          const sway =
            Math.sin(stagingTime * 0.21 + index * 1.17) * (0.035 + coefficient.j * 0.008);
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
        line.position.x = Math.sin(stagingTime * (0.043 + index * 0.006) + index) * 0.08;
        line.position.y =
          Math.cos(stagingTime * (0.052 + index * 0.004) - index) * (0.05 + index * 0.025);
        material.opacity = 0.07 + index * 0.018 + Math.sin(stagingTime * 0.18 + index) ** 2 * 0.05;
      });
      group.rotation.y = Math.sin(stagingTime * 0.031) * 0.07;
      group.rotation.z = Math.sin(stagingTime * 0.019 + 0.6) * 0.018;
      impactRing.line.position.set((observation - 0.5) * 9.6, -3.72, 0.46);
      impactRing.line.scale.setScalar(reducedMotion ? 0.3 : 0.18 + visualEvent.progress * 0.92);
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
