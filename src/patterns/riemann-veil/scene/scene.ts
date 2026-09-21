import { createRiemannVeilWorkletProgram } from "../audio/synthesis";
import { createCurveVeil } from "../../../rendering/analytic/curveVeil";
import * as THREE from "three/webgpu";
import { RIEMANN_VEIL_SCORE, getRiemannEventMapping } from "../audio/score";
import { createEventResonance } from "../../../rendering/analytic/eventResonance";
import { configurePoeticObjects } from "../../../rendering/analytic/displayLayers";
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
const PALETTE = [0xe2be9e, 0xa57862, 0x596963] as const;
export function createRiemannVeilContent(
  backend: "webgpu" | "webgl" = "webgpu",
  poeticLayers = true,
) {
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
    const veil = createCurveVeil(
      positions,
      PALETTE[layerIndex % 3]!,
      0.44 + layerIndex * 0.16,
      0.6,
      8,
    );
    group.add(line.line, veil.mesh);
    configurePoeticObjects(poeticLayers, veil.mesh);
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
  const mappings = RIEMANN_VEIL_SCORE.events.map((event) =>
    getRiemannEventMapping(event.sourceIndex),
  );
  const resonance = createEventResonance(RIEMANN_VEIL_SCORE, backend, {
    gesture: "veil",
    colors: PALETTE,
    timbre: createRiemannVeilWorkletProgram().timbre,
    locate(voice, time, target) {
      const mapping = mappings[voice.event.sourceIndex]!;
      const x = Math.sin(mapping.indexN ** 2 * 0.037 * time) * Math.PI;
      const layer = mapping.responseStep;
      target.set(
        (x / Math.PI) * 7.4,
        evaluateRiemannPartial(RIEMANN_TRUNCATIONS[layer]!, x) * 2.2 + (layer - 1.5) * 0.38,
        -layer * 1.15,
      );
    },
  });
  group.add(resonance.group);
  configurePoeticObjects(poeticLayers, resonance.group, ...veilEchoes.map((echo) => echo.line));
  return {
    group,
    update(timeSeconds: number, reducedMotion = false) {
      const stagingTime = reducedMotion ? 0 : timeSeconds;
      focus.line.position.x = (getRiemannObservation(timeSeconds) / Math.PI) * 7.4;
      resonance.update(timeSeconds, reducedMotion);
      veilEchoes.forEach(({ layerIndex, echoIndex, line, material }) => {
        const drift = Math.sin(
          stagingTime * (0.047 + echoIndex * 0.006) + layerIndex * 1.3 + echoIndex,
        );
        line.position.x = drift * (0.035 + echoIndex * 0.018);
        line.position.y =
          Math.cos(stagingTime * (0.054 + layerIndex * 0.004) - echoIndex) *
          (0.06 + echoIndex * 0.035);
        line.position.z = -0.24 - echoIndex * 0.28 + drift * 0.12;
        material.opacity = 0.055 + echoIndex * 0.016 + (0.5 + 0.5 * drift) * 0.045;
      });
      group.rotation.y = Math.sin(stagingTime * 0.029) * 0.075;
      group.rotation.z = Math.sin(stagingTime * 0.018 + 1.4) * 0.018;
      return {
        energy: evaluateFiveActEnergy(timeSeconds, 80),
        warmth: 0.28,
        cameraX: Math.sin(stagingTime * 0.017) * 0.2,
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
