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
function smoothstep(edge0: number, edge1: number, value: number): number {
  const unit = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return unit * unit * (3 - 2 * unit);
}

function mix(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

export function createLissajousOrchardContent() {
  const group = new THREE.Group();
  const curves = LISSAJOUS_RATIOS.map((ratio, index) => {
    const positions = new Float32Array((POINTS + 1) * 3);
    const line = createLine(positions, PALETTE[index % PALETTE.length]!, index === 4 ? 0.92 : 0.42);
    const glow = new THREE.Points(
      line.line.geometry,
      new THREE.PointsMaterial({
        color: PALETTE[(index + 1) % PALETTE.length]!,
        size: 0.035,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    glow.frustumCulled = false;
    group.add(line.line, glow);
    return { ratio, positions, line: line.line, attribute: line.attribute, glow };
  });
  return {
    group,
    update(timeSeconds: number) {
      const activePosition = timeSeconds / (60 / 9);
      const activeCycle = Math.floor(activePosition);
      const active = ((activeCycle % 9) + 9) % 9;
      const nextActive = (active + 1) % 9;
      const transition = smoothstep(0.78, 1, activePosition - activeCycle);
      curves.forEach((curve, index) => {
        const activeDistance = (index - active + 9) % 9;
        const nextDistance = (index - nextActive + 9) % 9;
        const activeAngle = (activeDistance / 9) * Math.PI * 2 - Math.PI / 2;
        const nextAngle = (nextDistance / 9) * Math.PI * 2 - Math.PI / 2;
        const gridX = mix(Math.cos(activeAngle) * 5.2, Math.cos(nextAngle) * 5.2, transition);
        const gridY = mix(Math.sin(activeAngle) * 3.05, Math.sin(nextAngle) * 3.05, transition);
        const gridZ = mix(
          -1.9 - (activeDistance % 3) * 0.34,
          -1.9 - (nextDistance % 3) * 0.34,
          transition,
        );
        const heroWeight =
          (index === active ? 1 - transition : 0) + (index === nextActive ? transition : 0);
        for (let point = 0; point <= POINTS; point += 1) {
          const parameter = (point / POINTS) * Math.PI * 2;
          const [x, y] = evaluateLissajous(curve.ratio[0], curve.ratio[1], parameter, timeSeconds);
          const offset = point * 3;
          const scale = mix(0.82, 4.05, heroWeight);
          curve.positions[offset] = x * scale + gridX * (1 - heroWeight);
          curve.positions[offset + 1] = y * scale + gridY * (1 - heroWeight);
          curve.positions[offset + 2] =
            mix(gridZ, 0.55, heroWeight) +
            Math.sin(parameter * (2 + (index % 3)) - timeSeconds * 0.18) * 0.08 * (1 - heroWeight);
        }
        curve.attribute.needsUpdate = true;
        const gridOpacity = 0.2 + 0.18 * Math.sin(timeSeconds * 0.7 + index) ** 2;
        (curve.line.material as THREE.LineBasicMaterial).opacity = mix(
          gridOpacity,
          0.94,
          heroWeight,
        );
        const glowMaterial = curve.glow.material as THREE.PointsMaterial;
        glowMaterial.opacity = mix(0.2, 0.74, heroWeight);
        glowMaterial.size = mix(0.026, 0.075, heroWeight);
      });
      const energy = evaluateFiveActEnergy(timeSeconds, 60);
      group.rotation.y = Math.sin(timeSeconds * 0.041) * 0.14;
      group.rotation.z = Math.sin(timeSeconds * 0.027 + 0.8) * 0.055;
      group.position.y = Math.cos(timeSeconds * 0.036) * 0.12;
      return { energy, warmth: 0.62, cameraX: Math.sin(timeSeconds * 0.03) * 0.18 };
    },
  };
}
export function createLissajousOrchardScene(options: PatternSceneOptions) {
  return createImmersiveAnalyticScene(options, {
    profile: createAnalyticProfile(PALETTE, [1.1, 0.9], 2.7, "orchard"),
    palette: PALETTE,
    particleBudgets: { low: 4_000, medium: 11_000, high: 22_000, ultra: 34_000 },
    extent: { x: 24, y: 15, z: 20 },
    camera: { distance: 12, height: 0, targetY: 0, fovDegrees: 45 },
    exposure: 1.08,
    createContent: createLissajousOrchardContent,
  });
}
