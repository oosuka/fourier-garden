import * as THREE from "three/webgpu";
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
const PALETTE = [0xffc46c, 0xfff3ce, 0x9d284e] as const;
const SAMPLES = 1_024;
function smoothstep(edge0: number, edge1: number, value: number): number {
  const unit = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return unit * unit * (3 - 2 * unit);
}

export function createDirichletLanternsContent() {
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
  const partialPositions = new Float32Array(SAMPLES * 3);
  const partial = createLine(partialPositions, 0xfffaf0, 0.55);
  const fejerPositions = new Float32Array(SAMPLES * 3);
  const fejer = createLine(fejerPositions, 0xffb05e, 0.48);
  group.add(partial.line, fejer.line);
  return {
    group,
    update(timeSeconds: number) {
      const selected = Math.floor((timeSeconds % 60) / 15) % 4;
      const cycleTime = ((timeSeconds % 60) + 60) % 60;
      const fejerFocus =
        smoothstep(36.5, 38.5, cycleTime) * (1 - smoothstep(51.5, 53.5, cycleTime));
      curves.forEach((curve, index) => {
        (curve.line.material as THREE.LineBasicMaterial).opacity = index === selected ? 0.98 : 0.28;
        curve.line.scale.y = index === selected ? 1.18 : 0.88;
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
      const scan = getDirichletObservation(timeSeconds) / Math.PI;
      group.position.x = -scan * 0.12;
      return { energy: evaluateFiveActEnergy(timeSeconds, 60), warmth: 0.88 };
    },
  };
}
export function createDirichletLanternsScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [0.46, 1.75], 0.15),
    palette: PALETTE,
    particleBudgets: { low: 3_000, medium: 9_000, high: 18_000, ultra: 28_000 },
    extent: { x: 25, y: 17, z: 21 },
    camera: { distance: 13.5, height: 0.2, targetY: -0.3, fovDegrees: 47 },
    exposure: 1.02,
    createContent: createDirichletLanternsContent,
  });
}
