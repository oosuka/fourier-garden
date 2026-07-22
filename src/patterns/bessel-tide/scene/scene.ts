import * as THREE from "three/webgpu";

import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  createPoints,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { BESSEL_MODES, BESSEL_ZEROS, evaluateBesselField, evaluateBesselMode } from "../math/model";

const PALETTE = [0x55f1e1, 0x3f9dff, 0x193b9e] as const;
const RADIAL = 56;
const ANGULAR = 128;

export function createBesselTideContent() {
  const group = new THREE.Group();
  const positions = new Float32Array((RADIAL + 1) * ANGULAR * 3);
  const colors = new Float32Array(positions.length);
  const radii = new Float32Array((RADIAL + 1) * ANGULAR);
  const thetas = new Float32Array(radii.length);
  const basis = new Float32Array(radii.length * BESSEL_MODES.length);
  const temporalCoefficients = new Float32Array(BESSEL_MODES.length);
  const indices: number[] = [];
  for (let radial = 0; radial < RADIAL; radial += 1) {
    for (let angular = 0; angular < ANGULAR; angular += 1) {
      const next = (angular + 1) % ANGULAR;
      const a = radial * ANGULAR + angular;
      const b = radial * ANGULAR + next;
      const c = (radial + 1) * ANGULAR + angular;
      const d = (radial + 1) * ANGULAR + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.46,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const surfaceWire = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: PALETTE[0],
      transparent: true,
      opacity: 0.055,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  surfaceWire.frustumCulled = false;
  const surfaceSparkles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xd9ffff,
      size: 0.016,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  surfaceSparkles.frustumCulled = false;
  for (let radialIndex = 0; radialIndex <= RADIAL; radialIndex += 1) {
    const radius = radialIndex / RADIAL;
    for (let angularIndex = 0; angularIndex < ANGULAR; angularIndex += 1) {
      const theta = (angularIndex / ANGULAR) * Math.PI * 2;
      const vertex = radialIndex * ANGULAR + angularIndex;
      radii[vertex] = radius;
      thetas[vertex] = theta;
      for (let modeIndex = 0; modeIndex < BESSEL_MODES.length; modeIndex += 1) {
        basis[vertex * BESSEL_MODES.length + modeIndex] = evaluateBesselMode(
          BESSEL_MODES[modeIndex]!,
          radius,
          theta,
        );
      }
    }
  }
  const boundaryPositions = new Float32Array((ANGULAR + 1) * 3);
  for (let index = 0; index <= ANGULAR; index += 1) {
    const theta = (index / ANGULAR) * Math.PI * 2;
    boundaryPositions[index * 3] = Math.cos(theta) * 4.4;
    boundaryPositions[index * 3 + 1] = Math.sin(theta) * 4.4;
  }
  const boundary = createLine(boundaryPositions, 0x8ffff1, 0.88);
  const nodalRings = Array.from({ length: 2 }, () => {
    const ringPositions = new Float32Array((ANGULAR + 1) * 3);
    for (let index = 0; index <= ANGULAR; index += 1) {
      const theta = (index / ANGULAR) * Math.PI * 2;
      ringPositions[index * 3] = Math.cos(theta);
      ringPositions[index * 3 + 1] = Math.sin(theta);
      ringPositions[index * 3 + 2] = 0.035;
    }
    const ring = createLine(ringPositions, 0xb8fff3, 0.78);
    group.add(ring.line);
    return ring.line;
  });
  const nodalDiameters = Array.from({ length: 4 }, () => {
    const diameter = createLine(new Float32Array(6), 0x70dfff, 0.72);
    group.add(diameter.line);
    return diameter;
  });
  const markerPosition = new Float32Array(3);
  const marker = createPoints(markerPosition, 0xffffff, 0.24);
  group.add(mesh, surfaceWire, surfaceSparkles, boundary.line, marker.points);
  group.rotation.x = -0.94;
  group.scale.setScalar(0.94);
  return {
    group,
    update(timeSeconds: number) {
      for (let modeIndex = 0; modeIndex < BESSEL_MODES.length; modeIndex += 1) {
        const mode = BESSEL_MODES[modeIndex]!;
        temporalCoefficients[modeIndex] =
          mode.coefficient * Math.cos((0.18 * mode.zero * timeSeconds) / 2.4048255577);
      }
      for (let vertex = 0; vertex < radii.length; vertex += 1) {
        const radius = radii[vertex]!;
        const theta = thetas[vertex]!;
        let value = 0;
        for (let modeIndex = 0; modeIndex < BESSEL_MODES.length; modeIndex += 1) {
          value +=
            temporalCoefficients[modeIndex]! * basis[vertex * BESSEL_MODES.length + modeIndex]!;
        }
        const offset = vertex * 3;
        positions[offset] = Math.cos(theta) * radius * 4.4;
        positions[offset + 1] = Math.sin(theta) * radius * 4.4;
        positions[offset + 2] = value * 2.2;
        const positive = Math.max(0, value);
        const negative = Math.max(0, -value);
        const magnitude = Math.min(1, Math.abs(value) * 1.8);
        colors[offset] = 0.015 + positive * 0.58 + magnitude * 0.04;
        colors[offset + 1] = 0.055 + magnitude * 0.52 + positive * 0.16;
        colors[offset + 2] = 0.16 + negative * 0.78 + magnitude * 0.22;
      }
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      const mode = BESSEL_MODES[Math.floor(timeSeconds * 6) % BESSEL_MODES.length]!;
      const innerZeros = BESSEL_ZEROS.filter(
        (candidate) => candidate.m === mode.m && candidate.n < mode.n,
      );
      nodalRings.forEach((ring, index) => {
        const zero = innerZeros[index];
        ring.visible = zero !== undefined;
        if (zero) ring.scale.setScalar((zero.zero / mode.zero) * 4.4);
      });
      nodalDiameters.forEach((diameter, index) => {
        const visible = mode.m > 0 && index < mode.m;
        diameter.line.visible = visible;
        if (!visible) return;
        const theta =
          mode.q === "cos" ? (Math.PI / 2 + index * Math.PI) / mode.m : (index * Math.PI) / mode.m;
        const x = Math.cos(theta) * 4.4;
        const y = Math.sin(theta) * 4.4;
        const data = diameter.attribute.array as Float32Array;
        data.set([-x, -y, 0.04, x, y, 0.04]);
        diameter.attribute.needsUpdate = true;
      });
      const markerRadius = Math.min(0.94, mode.zero / 10) * 4.4;
      const markerTheta = mode.m === 0 ? timeSeconds * 0.16 : (timeSeconds * 0.16) / mode.m;
      markerPosition[0] = Math.cos(markerTheta) * markerRadius;
      markerPosition[1] = Math.sin(markerTheta) * markerRadius;
      markerPosition[2] = evaluateBesselField(markerRadius / 4.4, markerTheta, timeSeconds) * 2.2;
      marker.attribute.needsUpdate = true;
      const energy = evaluateFiveActEnergy(timeSeconds, 72);
      group.rotation.x = -0.94 + Math.sin(timeSeconds * 0.071) * 0.095;
      group.rotation.y = Math.sin(timeSeconds * 0.043 + 1.1) * 0.12;
      group.rotation.z = Math.sin(timeSeconds * 0.052) * 0.16;
      group.position.y = Math.sin(timeSeconds * 0.038 + 0.4) * 0.16;
      (surfaceWire.material as THREE.MeshBasicMaterial).opacity = 0.032 + energy * 0.042;
      (surfaceSparkles.material as THREE.PointsMaterial).size = 0.013 + energy * 0.009;
      (surfaceSparkles.material as THREE.PointsMaterial).opacity = 0.11 + energy * 0.14;
      material.opacity = 0.18 + energy * 0.1;
      return { energy, warmth: 0.16, cameraY: -0.1 };
    },
  };
}

export function createBesselTideScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.4, 0.72], 1.8, "tidal"),
    palette: PALETTE,
    particleBudgets: { low: 5_000, medium: 14_000, high: 30_000, ultra: 46_000 },
    extent: { x: 23, y: 15, z: 22 },
    camera: { distance: 11.6, height: 1.55, targetY: -0.2, fovDegrees: 48 },
    exposure: 0.94,
    createContent: createBesselTideContent,
  });
}
