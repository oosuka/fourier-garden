import * as THREE from "three/webgpu";
import { createImmersiveAnalyticScene } from "../../../rendering/analytic/immersiveScene";
import {
  createAnalyticProfile,
  createLine,
  evaluateFiveActEnergy,
} from "../../../rendering/analytic/primitives";
import type { PatternSceneOptions } from "../../contracts";
import { LISSAJOUS_RATIOS, evaluateLissajous } from "../math/model";
const PALETTE = [0xff78c8, 0xc96aff, 0xffc66d] as const;
const POINTS = 384;
export function createLissajousOrchardContent() {
  const group = new THREE.Group();
  const curves = LISSAJOUS_RATIOS.map((ratio, index) => {
    const positions = new Float32Array((POINTS + 1) * 3);
    const line = createLine(positions, PALETTE[index % PALETTE.length]!, index === 4 ? 0.92 : 0.42);
    group.add(line.line);
    return { ratio, positions, line: line.line, attribute: line.attribute };
  });
  return {
    group,
    update(timeSeconds: number) {
      const active = Math.floor(timeSeconds / (60 / 9)) % 9;
      curves.forEach((curve, index) => {
        const distance = (index - active + 9) % 9;
        const hero = index === active;
        for (let point = 0; point <= POINTS; point += 1) {
          const parameter = (point / POINTS) * Math.PI * 2;
          const [x, y] = evaluateLissajous(curve.ratio[0], curve.ratio[1], parameter, timeSeconds);
          const offset = point * 3;
          const scale = hero ? 3.65 : 1.15;
          curve.positions[offset] = x * scale + (hero ? 0 : (distance - 4) * 1.45);
          curve.positions[offset + 1] = y * scale + (hero ? 0 : -3.45 + (distance % 3) * 1.2);
          curve.positions[offset + 2] = hero ? 0.5 : -2.4 - Math.floor(distance / 3) * 0.7;
        }
        curve.attribute.needsUpdate = true;
        (curve.line.material as THREE.LineBasicMaterial).opacity = hero
          ? 0.94
          : 0.2 + 0.18 * Math.sin(timeSeconds * 0.7 + index) ** 2;
      });
      const energy = evaluateFiveActEnergy(timeSeconds, 60);
      return { energy, warmth: 0.62, cameraX: Math.sin(timeSeconds * 0.03) * 0.18 };
    },
  };
}
export function createLissajousOrchardScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.1, 0.9], 2.7),
    palette: PALETTE,
    particleBudgets: { low: 4_000, medium: 11_000, high: 22_000, ultra: 34_000 },
    extent: { x: 24, y: 15, z: 20 },
    camera: { distance: 12, height: 0, targetY: 0, fovDegrees: 45 },
    exposure: 1.08,
    createContent: createLissajousOrchardContent,
  });
}
