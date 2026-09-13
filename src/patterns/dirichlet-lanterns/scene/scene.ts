import { createDirichletLanternsWorkletProgram } from "../audio/synthesis";
import { createCurveVeil } from "../../../rendering/analytic/curveVeil";
import * as THREE from "three/webgpu";
import { DIRICHLET_LANTERNS_SCORE, getDirichletAudioMapping } from "../audio/score";
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
  DIRICHLET_ORDERS,
  dirichletKernel,
  fejerSquareWave,
  getDirichletObservation,
  squareWavePartialSum,
} from "../math/model";
const PALETTE = [0xe6b377, 0xe7d9b6, 0x995440] as const;
const SAMPLES = 1_024;
function smoothstep(edge0: number, edge1: number, value: number): number {
  const unit = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return unit * unit * (3 - 2 * unit);
}

export function createDirichletLanternsContent(
  backend: "webgpu" | "webgl" = "webgpu",
  poeticLayers = true,
) {
  const group = new THREE.Group();
  const curves = DIRICHLET_ORDERS.map((order, index) => {
    const positions = new Float32Array(SAMPLES * 3);
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const x = -Math.PI + (sample / (SAMPLES - 1)) * Math.PI * 2;
      const offset = sample * 3;
      positions[offset] = (x / Math.PI) * 2.3 + (index - 1.5) * 3.1;
      positions[offset + 1] = (dirichletKernel(order, x) / (2 * order + 1)) * 4.2;
      positions[offset + 2] = -Math.abs(index - 1.5) * 0.55;
    }
    const line = createLine(positions, PALETTE[index % 3]!, 0.72);
    group.add(line.line);
    return { order, ...line };
  });
  const kernelVeils = curves.map((curve, index) => {
    const veil = createCurveVeil(
      curve.attribute.array as Float32Array,
      PALETTE[index % 3]!,
      1.8,
      0.65,
      2,
    );
    group.add(veil.mesh);
    return veil;
  });
  const curveEchoes = curves.flatMap((curve, curveIndex) =>
    Array.from({ length: 5 }, (_, echoIndex) => {
      const material = new THREE.LineBasicMaterial({
        color: PALETTE[(curveIndex + echoIndex) % PALETTE.length]!,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(curve.line.geometry, material);
      line.frustumCulled = false;
      line.position.z = -0.18 - echoIndex * 0.24;
      group.add(line);
      return { curveIndex, echoIndex, line, material };
    }),
  );
  const lanternColumns = DIRICHLET_ORDERS.map((_, index) => {
    const x = (index - 1.5) * 3.1;
    const column = createLine(new Float32Array([x, -4.8, -0.6, x, 5.1, -0.6]), 0xffd69a, 0.16);
    group.add(column.line);
    return column.line;
  });
  const partialPositions = new Float32Array(SAMPLES * 3);
  const partial = createLine(partialPositions, 0xfffaf0, 0.55);
  const fejerPositions = new Float32Array(SAMPLES * 3);
  const fejer = createLine(fejerPositions, 0xffb05e, 0.48);
  partial.line.name = "dirichlet-partial";
  fejer.line.name = "dirichlet-fejer";
  group.add(partial.line, fejer.line);
  const mappings = DIRICHLET_LANTERNS_SCORE.events.map((event) =>
    getDirichletAudioMapping(event.sourceIndex),
  );
  const resonance = createEventResonance(DIRICHLET_LANTERNS_SCORE, backend, {
    gesture: "ember",
    colors: PALETTE,
    timbre: createDirichletLanternsWorkletProgram().timbre,
    locate(voice, _time, target) {
      const mapping = mappings[voice.event.sourceIndex]!;
      const x =
        ((mapping.harmonic - 1) / (mapping.order + 1)) *
        Math.PI *
        (mapping.packet % 2 === 0 ? 1 : -1);
      target.set(
        (x / Math.PI) * 2.3 + (mapping.orderIndex - 1.5) * 3.1,
        (dirichletKernel(mapping.order, x) / (2 * mapping.order + 1)) * 4.2,
        -Math.abs(mapping.orderIndex - 1.5) * 0.55,
      );
    },
  });
  group.add(resonance.group);
  configurePoeticObjects(
    poeticLayers,
    resonance.group,
    ...kernelVeils.map((veil) => veil.mesh),
    ...curveEchoes.map((echo) => echo.line),
    ...lanternColumns,
  );
  return {
    group,
    update(timeSeconds: number, reducedMotion = false) {
      const stagingTime = reducedMotion ? 0 : timeSeconds;
      const frame = resonance.update(timeSeconds);
      const selected = mappings[frame.focus?.sourceIndex ?? 0]!.orderIndex;
      const cycleTime = ((timeSeconds % 60) + 60) % 60;
      const fejerFocus =
        smoothstep(36.5, 38.5, cycleTime) * (1 - smoothstep(51.5, 53.5, cycleTime));
      kernelVeils.forEach((veil, index) => {
        veil.material.opacity = index === selected ? 0.38 : 0.12;
      });
      curves.forEach((curve, index) => {
        (curve.line.material as THREE.LineBasicMaterial).opacity = index === selected ? 0.98 : 0.28;
        curve.line.scale.y = 1;
      });
      curveEchoes.forEach(({ curveIndex, echoIndex, line, material }) => {
        const selectedWeight = curveIndex === selected ? 1 : 0.24;
        const drift = Math.sin(stagingTime * (0.073 + echoIndex * 0.008) + curveIndex * 1.4);
        line.scale.y = (curveIndex === selected ? 1.18 : 0.88) * (0.985 + drift * 0.018);
        line.position.y = drift * (0.05 + echoIndex * 0.025);
        line.position.z =
          -0.18 - echoIndex * 0.24 + Math.cos(stagingTime * 0.04 + curveIndex) * 0.08;
        material.opacity = (0.045 + echoIndex * 0.014) * (0.72 + selectedWeight * 1.35);
      });
      lanternColumns.forEach((column, index) => {
        const pulse = 0.5 + 0.5 * Math.sin(stagingTime * (0.39 + index * 0.031) + index * 1.7);
        (column.material as THREE.LineBasicMaterial).opacity =
          0.08 + pulse * 0.12 + (index === selected ? 0.22 : 0);
        column.scale.y = 0.9 + pulse * 0.18;
      });
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const x = -Math.PI + (sample / (SAMPLES - 1)) * Math.PI * 2;
        const offset = sample * 3;
        partialPositions[offset] = (x / Math.PI) * 7.2;
        partialPositions[offset + 1] =
          squareWavePartialSum(DIRICHLET_ORDERS[selected]!, x) * 1.3 - 4.2;
        partialPositions[offset + 2] = 0.2;
        fejerPositions[offset] = partialPositions[offset]!;
        fejerPositions[offset + 1] = fejerSquareWave(DIRICHLET_ORDERS[selected]!, x) * 1.3 - 4.2;
        fejerPositions[offset + 2] = 0.24;
      }
      partial.attribute.needsUpdate = true;
      fejer.attribute.needsUpdate = true;
      (partial.line.material as THREE.LineBasicMaterial).opacity = 0.72 - fejerFocus * 0.3;
      (fejer.line.material as THREE.LineBasicMaterial).opacity = 0.4 + fejerFocus * 0.52;
      const scan = getDirichletObservation(stagingTime) / Math.PI;
      group.position.x = -scan * 0.12;
      group.rotation.y = Math.sin(stagingTime * 0.035) * 0.08;
      group.rotation.z = Math.sin(stagingTime * 0.022 + 0.7) * 0.025;
      return { energy: evaluateFiveActEnergy(timeSeconds, 60), warmth: 0.88 };
    },
  };
}
export function createDirichletLanternsScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.46, 1.75], 0.15, "lanterns"),
    palette: PALETTE,
    particleBudgets: { low: 3_000, medium: 9_000, high: 18_000, ultra: 28_000 },
    extent: { x: 25, y: 17, z: 21 },
    camera: { distance: 13.5, height: 0.2, targetY: -0.3, fovDegrees: 47 },
    exposure: 1.02,
    createContent: createDirichletLanternsContent,
  });
}
