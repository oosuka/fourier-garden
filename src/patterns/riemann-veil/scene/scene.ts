import * as THREE from "three/webgpu";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import {
  RIEMANN_TRUNCATIONS,
  evaluateRiemannPartial,
  getRiemannObservation,
  getRiemannSampleCount,
} from "../math/model";
const PALETTE = [0xf4f7ff, 0xb99aff, 0x4255a8] as const;
export function createRiemannVeilContent() {
  const group = new THREE.Group();
  const layers = RIEMANN_TRUNCATIONS.map((order, layerIndex) => {
    const count = getRiemannSampleCount(order);
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const x = -Math.PI + (index / count) * Math.PI * 2;
      const offset = index * 3;
      positions[offset] = (x / Math.PI) * 7.4;
      positions[offset + 1] = evaluateRiemannPartial(order, x) * 2.2 + (layerIndex - 1.5) * 0.38;
      positions[offset + 2] = -layerIndex * 1.15;
    }
    const line = createLine(positions, PALETTE[layerIndex % 3]!, 0.62 + layerIndex * 0.08);
    group.add(line.line);
    return line;
  });
  const veilEchoes = layers.flatMap((layer, layerIndex) =>
    Array.from({ length: 5 }, (_, echoIndex) => {
      const material = new THREE.LineBasicMaterial({
        color: PALETTE[(layerIndex + echoIndex + 1) % PALETTE.length]!,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(layer.line.geometry, material);
      line.position.z = -0.24 - echoIndex * 0.28;
      line.frustumCulled = false;
      group.add(line);
      return { layerIndex, echoIndex, line, material };
    }),
  );
  const focusPositions = new Float32Array([0, -4.5, 0.5, 0, 4.5, 0.5]);
  const focus = createLine(focusPositions, 0xffffff, 0.76);
  group.add(focus.line);
  return {
    group,
    update(timeSeconds: number) {
      focus.line.position.x = (getRiemannObservation(timeSeconds) / Math.PI) * 7.4;
      layers.forEach(({ line }, index) => {
        line.position.y = Math.sin(timeSeconds * 0.071 + index) * 0.12;
      });
      veilEchoes.forEach(({ layerIndex, echoIndex, line, material }) => {
        const drift = Math.sin(
          timeSeconds * (0.047 + echoIndex * 0.006) + layerIndex * 1.3 + echoIndex,
        );
        line.position.x = drift * (0.035 + echoIndex * 0.018);
        line.position.y =
          Math.cos(timeSeconds * (0.054 + layerIndex * 0.004) - echoIndex) *
          (0.06 + echoIndex * 0.035);
        line.position.z = -0.24 - echoIndex * 0.28 + drift * 0.12;
        material.opacity = 0.055 + echoIndex * 0.016 + (0.5 + 0.5 * drift) * 0.045;
      });
      group.rotation.y = Math.sin(timeSeconds * 0.029) * 0.075;
      group.rotation.z = Math.sin(timeSeconds * 0.018 + 1.4) * 0.018;
      return {
        energy: evaluateFiveActEnergy(timeSeconds, 80),
        warmth: 0.28,
        cameraX: Math.sin(timeSeconds * 0.017) * 0.2,
      };
    },
  };
}
export function createRiemannVeilScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.7, 0.58], 2.1, "veil"),
    palette: PALETTE,
    particleBudgets: { low: 4_000, medium: 10_000, high: 20_000, ultra: 32_000 },
    extent: { x: 26, y: 15, z: 24 },
    camera: { distance: 12.6, height: 0, targetY: 0, fovDegrees: 46 },
    exposure: 1.08,
    createContent: createRiemannVeilContent,
  });
}
