import { createBesselTideWorkletProgram } from "../audio/synthesis";
import * as THREE from "three/webgpu";
import { BESSEL_TIDE_SCORE } from "../audio/score";
import { createEventResonance } from "../../../rendering/analytic/eventResonance";
import { configurePoeticObjects } from "../../../rendering/analytic/displayLayers";

import type { RendererBackend } from "../../../core/rendererBackend";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { BESSEL_MODES, BESSEL_ZEROS, evaluateBesselField, evaluateBesselMode } from "../math/model";

const PALETTE = [0x93c3ae, 0xd3ceab, 0x355f53] as const;
const RADIAL = 56;
const ANGULAR = 128;

export function createBesselTideContent(backend: RendererBackend = "webgpu", poeticLayers = true) {
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
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.54,
    metalness: 0.32,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: true,
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
      color: 0xdfe5d4,
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
  const boundary = createLine(boundaryPositions, 0xceceb1, 0.88);
  const nodalRings = Array.from({ length: 2 }, () => {
    const ringPositions = new Float32Array((ANGULAR + 1) * 3);
    for (let index = 0; index <= ANGULAR; index += 1) {
      const theta = (index / ANGULAR) * Math.PI * 2;
      ringPositions[index * 3] = Math.cos(theta);
      ringPositions[index * 3 + 1] = Math.sin(theta);
      ringPositions[index * 3 + 2] = 0.035;
    }
    const ring = createLine(ringPositions, 0xe1dcbf, 0.78);
    ring.line.renderOrder = 4;
    (ring.line.material as THREE.LineBasicMaterial).depthTest = false;
    group.add(ring.line);
    return ring.line;
  });
  const nodalDiameters = Array.from({ length: 4 }, () => {
    const diameter = createLine(new Float32Array(6), 0xd5d3b7, 0.72);
    diameter.line.renderOrder = 4;
    (diameter.line.material as THREE.LineBasicMaterial).depthTest = false;
    group.add(diameter.line);
    return diameter;
  });
  group.add(mesh, surfaceWire, surfaceSparkles, boundary.line);
  // Sparse polar contours sample the same surface vertices, without a diagonal
  // triangulation pattern competing with the selected mode's nodal structure.
  const contourVertices: number[] = [];
  for (let radial = 4; radial < RADIAL; radial += 4) {
    for (let angular = 0; angular < ANGULAR; angular++) {
      contourVertices.push(
        radial * ANGULAR + angular,
        radial * ANGULAR + ((angular + 1) % ANGULAR),
      );
    }
  }
  for (let angular = 0; angular < ANGULAR; angular += 8) {
    for (let radial = 0; radial < RADIAL; radial++) {
      contourVertices.push(radial * ANGULAR + angular, (radial + 1) * ANGULAR + angular);
    }
  }
  const contourData = new Float32Array(contourVertices.length * 3);
  const contourGeometry = new THREE.BufferGeometry();
  const contourAttribute = new THREE.BufferAttribute(contourData, 3);
  contourGeometry.setAttribute("position", contourAttribute);
  const contours = new THREE.LineSegments(
    contourGeometry,
    new THREE.LineBasicMaterial({
      color: 0x8eac9c,
      opacity: 0.13,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  contours.name = "bessel-surface-contours";
  contours.frustumCulled = false;
  group.add(contours);
  group.rotation.x = -0.94;
  group.scale.setScalar(0.94);
  const resonance = createEventResonance(BESSEL_TIDE_SCORE, backend, {
    gesture: "ripple",
    colors: PALETTE,
    timbre: createBesselTideWorkletProgram().timbre,
    locate(voice, time, target) {
      const mode = BESSEL_MODES[voice.event.sourceIndex % BESSEL_MODES.length]!;
      const radius = (mode.n === 1 ? 0.52 : 0.72) * 4.4;
      const theta = Math.acos(Math.max(-1, Math.min(1, voice.pan)));
      target.set(
        Math.cos(theta) * radius,
        Math.sin(theta) * radius,
        evaluateBesselField(radius / 4.4, theta, time) * 2.2,
      );
    },
  });
  group.add(resonance.group);
  configurePoeticObjects(poeticLayers, resonance.group, surfaceWire, surfaceSparkles);
  return {
    group,
    update(timeSeconds: number, reducedMotion = false) {
      const stagingTime = reducedMotion ? 0 : timeSeconds;
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
        colors[offset] = 0.025 + positive * 0.08 + magnitude * 0.03;
        colors[offset + 1] = 0.085 + magnitude * 0.1 + positive * 0.035;
        colors[offset + 2] = 0.055 + negative * 0.04 + magnitude * 0.04;
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      colorAttribute.needsUpdate = true;
      for (let index = 0; index < contourVertices.length; index++) {
        const source = contourVertices[index]! * 3;
        contourData[index * 3] = positions[source]!;
        contourData[index * 3 + 1] = positions[source + 1]!;
        contourData[index * 3 + 2] = positions[source + 2]! + 0.01;
      }
      contourAttribute.needsUpdate = true;
      const eventFrame = resonance.update(timeSeconds, reducedMotion);
      const sourceIndex = eventFrame.focus?.sourceIndex ?? 0;
      group.userData.sourceIndex = sourceIndex;
      const mode = BESSEL_MODES[sourceIndex % BESSEL_MODES.length]!;
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
      const energy = evaluateFiveActEnergy(timeSeconds, 72);
      group.rotation.x = -0.94 + Math.sin(stagingTime * 0.071) * 0.095;
      group.rotation.y = Math.sin(stagingTime * 0.043 + 1.1) * 0.12;
      group.rotation.z = Math.sin(stagingTime * 0.052) * 0.16;
      group.position.y = Math.sin(stagingTime * 0.038 + 0.4) * 0.16;
      (surfaceWire.material as THREE.MeshBasicMaterial).opacity = 0.002;
      (surfaceSparkles.material as THREE.PointsMaterial).size = 0.013 + energy * 0.009;
      (surfaceSparkles.material as THREE.PointsMaterial).opacity = 0.004;
      material.roughness = 0.57 - energy * 0.06;
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
