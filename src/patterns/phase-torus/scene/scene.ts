import { createPhaseTorusWorkletProgram } from "../audio/synthesis";
import * as THREE from "three/webgpu";
import { PHASE_TORUS_SCORE, getPhaseTorusAudioMapping } from "../audio/score";
import { createEventResonance } from "../../../rendering/analytic/eventResonance";
import { configurePoeticObjects } from "../../../rendering/analytic/displayLayers";
import type { RendererBackend } from "../../../core/rendererBackend";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  createPoints,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { evaluateTorusField, getIrrationalTorusPhase } from "../math/model";
const PALETTE = [0x9bbc9f, 0x527e6c, 0xdcc38d] as const;
const HISTORY = 2_048;
export function createPhaseTorusContent(backend: RendererBackend = "webgpu", poeticLayers = true) {
  const group = new THREE.Group();
  const geometry = new THREE.TorusGeometry(3.25, 1.12, 64, 160);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const theta1 = Math.atan2(y, x);
    const radial = Math.hypot(x, y);
    const theta2 = Math.atan2(z, radial - 3.25);
    const value = evaluateTorusField(theta1, theta2);
    const magnitude = Math.min(1, Math.abs(value) * 1.7);
    colors[index * 3] = 0.022 + Math.max(0, value) * 0.09 + magnitude * 0.034;
    colors[index * 3 + 1] = 0.07 + magnitude * 0.085 + Math.max(0, value) * 0.05;
    colors[index * 3 + 2] = 0.041 + Math.max(0, -value) * 0.07 + magnitude * 0.035;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const poeticGeometry = geometry.clone();
  const poeticPositions = poeticGeometry.getAttribute("position") as THREE.BufferAttribute;
  const poeticNormals = poeticGeometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let index = 0; index < poeticPositions.count; index += 1) {
    const x = poeticPositions.getX(index);
    const y = poeticPositions.getY(index);
    const z = poeticPositions.getZ(index);
    const theta1 = Math.atan2(y, x);
    const radial = Math.hypot(x, y);
    const theta2 = Math.atan2(z, radial - 3.25);
    const displacement = evaluateTorusField(theta1, theta2) * 0.34;
    poeticPositions.setXYZ(
      index,
      x + poeticNormals.getX(index) * displacement,
      y + poeticNormals.getY(index) * displacement,
      z + poeticNormals.getZ(index) * displacement,
    );
  }
  poeticPositions.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.6,
    metalness: 0.52,
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: true,
    wireframe: false,
  });
  const torus = new THREE.Mesh(geometry, material);
  const gridVertices: number[] = [];
  function segment(a: number, b: number) {
    gridVertices.push(
      positions.getX(a),
      positions.getY(a),
      positions.getZ(a),
      positions.getX(b),
      positions.getY(b),
      positions.getZ(b),
    );
  }
  // Sparse parameter curves sampled from the same torus, rather than its triangle tessellation.
  for (let j = 0; j < 64; j += 8)
    for (let i = 0; i < 160; i++) segment(j * 161 + i, j * 161 + i + 1);
  for (let i = 0; i < 160; i += 20)
    for (let j = 0; j < 64; j++) segment(j * 161 + i, (j + 1) * 161 + i);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
  const parameterGrid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({
      color: PALETTE[0],
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const poeticMembraneMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.025,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const poeticMembrane = new THREE.Mesh(poeticGeometry, poeticMembraneMaterial);
  const surfaceSparkles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xe1e4d0,
      size: 0.012,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.008,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const surfaceEchoes = Array.from({ length: 3 }, (_, index) => {
    const echoMaterial = new THREE.LineBasicMaterial({
      color: PALETTE[(index + 1) % PALETTE.length]!,
      transparent: true,
      opacity: 0.022 - index * 0.004,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const echo = new THREE.LineSegments(gridGeometry, echoMaterial);
    echo.scale.setScalar(1.025 + index * 0.026);
    echo.rotation.z = index * 0.045;
    return { echo, echoMaterial, index };
  });
  torus.add(
    poeticMembrane,
    parameterGrid,
    surfaceSparkles,
    ...surfaceEchoes.map(({ echo }) => echo),
  );
  group.add(torus);
  group.scale.setScalar(0.9);
  const historyPositions = new Float32Array(HISTORY * 3);
  const history = createLine(historyPositions, PALETTE[2], 0.74);
  history.line.renderOrder = 3;
  history.line.material.depthTest = false;
  group.add(history.line);
  const pointPosition = new Float32Array(3);
  const point = createPoints(pointPosition, PALETTE[2], 0.24, backend);
  const pointHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xf3e7c6,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const pointHalo = new THREE.Mesh(new THREE.SphereGeometry(0.027, 16, 12), pointHaloMaterial);
  group.add(pointHalo, point.points);
  const mappings = PHASE_TORUS_SCORE.events.map((event) =>
    getPhaseTorusAudioMapping(event.sourceIndex),
  );
  const resonance = createEventResonance(PHASE_TORUS_SCORE, backend, {
    gesture: "orbit",
    colors: PALETTE,
    timbre: createPhaseTorusWorkletProgram().timbre,
    locate(voice, time, target) {
      const mapping = mappings[voice.event.sourceIndex]!;
      const [, theta2] = getIrrationalTorusPhase(time);
      const theta1 =
        Math.PI / 2 - (mapping.modePhaseAtOrigin + time * mapping.modeRateRadiansPerSecond);
      const radius = 3.25 + 1.12 * Math.cos(theta2);
      target.set(radius * Math.cos(theta1), radius * Math.sin(theta1), 1.12 * Math.sin(theta2));
    },
  });
  group.add(resonance.group);
  configurePoeticObjects(
    poeticLayers,
    resonance.group,
    poeticMembrane,
    surfaceSparkles,
    ...surfaceEchoes.map((echo) => echo.echo),
  );
  return {
    group,
    update(timeSeconds: number, reducedMotion = false) {
      const stagingTime = reducedMotion ? 0 : timeSeconds;
      const start = Math.max(0, timeSeconds - 180);
      for (let index = 0; index < HISTORY; index += 1) {
        const sampleTime = start + ((timeSeconds - start) * index) / (HISTORY - 1);
        const [theta1, theta2] = getIrrationalTorusPhase(sampleTime);
        const radius = 3.25 + 1.12 * Math.cos(theta2);
        const offset = index * 3;
        historyPositions[offset] = radius * Math.cos(theta1);
        historyPositions[offset + 1] = radius * Math.sin(theta1);
        historyPositions[offset + 2] = 1.12 * Math.sin(theta2);
      }
      const [theta1, theta2] = getIrrationalTorusPhase(timeSeconds);
      const radius = 3.25 + 1.12 * Math.cos(theta2);
      pointPosition[0] = radius * Math.cos(theta1);
      pointPosition[1] = radius * Math.sin(theta1);
      pointPosition[2] = 1.12 * Math.sin(theta2);
      history.attribute.needsUpdate = true;
      point.attribute.needsUpdate = true;
      pointHalo.position.set(pointPosition[0]!, pointPosition[1]!, pointPosition[2]!);
      // Tilt around x only: the sounding character keeps the same left/right coordinate as its pan.
      group.rotation.x = -0.78 + Math.sin(stagingTime * 0.043) * 0.08;
      resonance.update(timeSeconds, reducedMotion);
      const energy = evaluateFiveActEnergy(timeSeconds, 84);
      surfaceEchoes.forEach(({ echo, echoMaterial, index }) => {
        echo.rotation.x = Math.sin(stagingTime * (0.021 + index * 0.004) + index) * 0.045;
        echo.rotation.z = index * 0.045 - stagingTime * (0.006 + index * 0.0015);
        echoMaterial.opacity = 0.022 + energy * 0.018 - index * 0.004;
      });
      const membraneBreath = 1 + Math.sin(stagingTime * 0.067 + 0.4) * 0.018;
      poeticMembrane.scale.setScalar(membraneBreath);
      poeticMembrane.rotation.z = Math.sin(stagingTime * 0.031) * 0.018;
      poeticMembraneMaterial.opacity = 0.015 + energy * 0.025;
      (surfaceSparkles.material as THREE.PointsMaterial).size = 0.009 + energy * 0.007;
      (surfaceSparkles.material as THREE.PointsMaterial).opacity = 0.004 + energy * 0.008;
      (point.points.material as THREE.PointsMaterial).size = 0.28 + energy * 0.2;
      material.roughness = 0.62 - energy * 0.045;
      group.position.y = Math.sin(stagingTime * 0.026) * 0.16;
      return {
        energy,
        warmth: 0.48,
        cameraX: Math.sin(stagingTime * 0.015) * 0.24,
      };
    },
  };
}
export function createPhaseTorusScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.45, 0.72], 2.9, "torus"),
    palette: PALETTE,
    particleBudgets: { low: 5_000, medium: 14_000, high: 28_000, ultra: 44_000 },
    extent: { x: 24, y: 16, z: 23 },
    camera: { distance: 11.8, height: 0.4, targetY: 0, fovDegrees: 48 },
    exposure: 0.92,
    createContent: createPhaseTorusContent,
  });
}
