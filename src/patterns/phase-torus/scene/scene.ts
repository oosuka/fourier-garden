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
    const magnitude = Math.min(1, Math.abs(value) * 1.7);
    colors[index * 3] = 0.012 + Math.max(0, value) * 0.52 + magnitude * 0.05;
    colors[index * 3 + 1] = 0.07 + magnitude * 0.48 + Math.max(0, value) * 0.14;
    colors[index * 3 + 2] = 0.2 + Math.max(0, -value) * 0.72 + magnitude * 0.2;
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
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.26,
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
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      wireframe: true,
    }),
  );
  const poeticMembraneMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const poeticMembrane = new THREE.Mesh(poeticGeometry, poeticMembraneMaterial);
  const surfaceSparkles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xcdfdff,
      size: 0.012,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const surfaceEchoes = Array.from({ length: 3 }, (_, index) => {
    const echoMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE[(index + 1) % PALETTE.length]!,
      transparent: true,
      opacity: 0.022 - index * 0.004,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      wireframe: true,
    });
    const echo = new THREE.Mesh(geometry, echoMaterial);
    echo.scale.setScalar(1.025 + index * 0.026);
    echo.rotation.z = index * 0.045;
    return { echo, echoMaterial, index };
  });
  torus.add(
    poeticMembrane,
    coefficientGrid,
    surfaceSparkles,
    ...surfaceEchoes.map(({ echo }) => echo),
  );
  group.add(torus);
  group.scale.setScalar(0.9);
  const historyPositions = new Float32Array(HISTORY * 3);
  const history = createLine(historyPositions, PALETTE[2], 0.74);
  group.add(history.line);
  const pointPosition = new Float32Array(3);
  const point = createPoints(pointPosition, PALETTE[2], 0.24);
  const pointHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const pointHalo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), pointHaloMaterial);
  group.add(pointHalo, point.points);
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
      pointHalo.position.set(pointPosition[0]!, pointPosition[1]!, pointPosition[2]!);
      torus.rotation.x = -0.48 + Math.sin(timeSeconds * 0.043) * 0.12;
      torus.rotation.y = Math.sin(timeSeconds * 0.031 + 0.8) * 0.13;
      torus.rotation.z = timeSeconds * 0.018;
      const energy = evaluateFiveActEnergy(timeSeconds, 84);
      surfaceEchoes.forEach(({ echo, echoMaterial, index }) => {
        echo.rotation.x = Math.sin(timeSeconds * (0.021 + index * 0.004) + index) * 0.045;
        echo.rotation.z = index * 0.045 - timeSeconds * (0.006 + index * 0.0015);
        echoMaterial.opacity = 0.014 + energy * 0.018 + index * 0.004;
      });
      const membraneBreath = 1 + Math.sin(timeSeconds * 0.067 + 0.4) * 0.018;
      poeticMembrane.scale.setScalar(membraneBreath);
      poeticMembrane.rotation.z = Math.sin(timeSeconds * 0.031) * 0.018;
      poeticMembraneMaterial.opacity = 0.065 + energy * 0.08;
      (surfaceSparkles.material as THREE.PointsMaterial).size = 0.009 + energy * 0.007;
      (surfaceSparkles.material as THREE.PointsMaterial).opacity = 0.08 + energy * 0.1;
      (point.points.material as THREE.PointsMaterial).size = 0.28 + energy * 0.2;
      pointHalo.scale.setScalar(1.4 + energy * 0.7);
      pointHaloMaterial.opacity = 0.08 + energy * 0.06;
      material.opacity = 0.2 + energy * 0.1;
      group.position.y = Math.sin(timeSeconds * 0.026) * 0.16;
      return {
        energy,
        warmth: 0.48,
        cameraX: Math.sin(timeSeconds * 0.015) * 0.24,
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
