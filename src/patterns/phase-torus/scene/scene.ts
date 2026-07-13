import * as THREE from "three/webgpu";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  createPoints,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { evaluateTorusField, getIrrationalTorusPhase } from "../math/model";
const PALETTE = [0x4beaff, 0x526dff, 0xffc873] as const;
const HISTORY = 2_048;
export function createPhaseTorusContent() {
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
    colors[index * 3] = 0.015 + Math.max(0, value) * 0.42;
    colors[index * 3 + 1] = 0.12 + Math.abs(value) * 0.5;
    colors[index * 3 + 2] = 0.32 + Math.max(0, -value) * 0.58;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
    wireframe: false,
  });
  const torus = new THREE.Mesh(geometry, material);
  const coefficientGrid = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: PALETTE[0],
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      wireframe: true,
    }),
  );
  torus.add(coefficientGrid);
  group.add(torus);
  const historyPositions = new Float32Array(HISTORY * 3);
  const history = createLine(historyPositions, PALETTE[2], 0.74);
  group.add(history.line);
  const pointPosition = new Float32Array(3);
  const point = createPoints(pointPosition, PALETTE[2], 0.24);
  group.add(point.points);
  return {
    group,
    update(timeSeconds: number) {
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
      torus.rotation.x = -0.42 + Math.sin(timeSeconds * 0.02) * 0.08;
      torus.rotation.z = timeSeconds * 0.012;
      return {
        energy: evaluateFiveActEnergy(timeSeconds, 84),
        warmth: 0.48,
        cameraX: Math.sin(timeSeconds * 0.015) * 0.24,
      };
    },
  };
}
export function createPhaseTorusScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.45, 0.72], 2.9),
    palette: PALETTE,
    particleBudgets: { low: 5_000, medium: 14_000, high: 28_000, ultra: 44_000 },
    extent: { x: 24, y: 16, z: 23 },
    camera: { distance: 11.8, height: 0.4, targetY: 0, fovDegrees: 48 },
    exposure: 1.05,
    createContent: createPhaseTorusContent,
  });
}
