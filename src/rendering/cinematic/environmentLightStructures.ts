import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "./model";
import {
  createGlowTexture,
  createLightPillarTexture,
  getPillarPlacement,
  LIGHT_PILLAR_COUNT,
  type CinematicLayerArtDirection,
  LUMINANCE_WELL_COUNT,
} from "./environmentPrimitives";

interface LightPillar {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
  baseOpacity: number;
  phase: number;
}

interface LuminanceWell {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  baseX: number;
  baseY: number;
  baseScale: number;
  baseOpacity: number;
  phase: number;
}

interface CinematicLightStructureOptions {
  profile: CinematicEnvironmentProfile;
  seed: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
  artDirection: CinematicLayerArtDirection;
}

export class CinematicLightStructureLayers {
  private readonly pillars: LightPillar[] = [];
  private readonly wells: LuminanceWell[] = [];
  private readonly pillarTexture = createLightPillarTexture();
  private readonly glowTexture = createGlowTexture();

  constructor(group: THREE.Group, options: CinematicLightStructureOptions) {
    const { profile } = options;
    for (let index = 0; index < LIGHT_PILLAR_COUNT; index += 1) {
      const placement = getPillarPlacement(profile, index, options.extent);
      const material = new THREE.SpriteMaterial({
        map: this.pillarTexture,
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: placement.opacity * options.artDirection.pillar,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        rotation: placement.rotation,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(placement.x, placement.y, placement.z);
      sprite.scale.set(placement.width, placement.height, 1);
      sprite.renderOrder = 1 + index;
      group.add(sprite);
      this.pillars.push({
        sprite,
        material,
        baseX: placement.x,
        baseY: placement.y,
        baseWidth: placement.width,
        baseHeight: placement.height,
        baseOpacity: placement.opacity * options.artDirection.pillar,
        phase: index * 1.91 + options.seed * 0.00019,
      });
    }

    for (let index = 0; index < LUMINANCE_WELL_COUNT; index += 1) {
      const angle = (index / LUMINANCE_WELL_COUNT) * Math.PI * 2 + profile.filamentPhase;
      const ringLayout = profile.layout === "torus" || profile.layout === "tidal";
      const cathedralLayout = profile.layout === "cathedral";
      const baseX = ringLayout
        ? Math.cos(angle) * options.extent.y * 0.34
        : cathedralLayout
          ? (index - 1.5) * options.extent.x * 0.19
          : (index - 1.5) * options.extent.x * 0.17 + Math.sin(angle) * 1.2;
      const baseY = ringLayout
        ? Math.sin(angle) * options.extent.y * 0.22
        : cathedralLayout
          ? -options.extent.y * 0.12 + (index % 2) * options.extent.y * 0.2
          : Math.cos(angle * 1.3) * options.extent.y * 0.2;
      const material = new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      const baseScale = options.extent.y * (0.14 + index * 0.02);
      sprite.position.set(baseX, baseY, -6.4 - index * 0.85);
      sprite.scale.setScalar(baseScale);
      sprite.renderOrder = -5 + index;
      group.add(sprite);
      this.wells.push({
        sprite,
        material,
        baseX,
        baseY,
        baseScale,
        baseOpacity: (0.006 + index * 0.002) * options.artDirection.well,
        phase: angle + options.seed * 0.00007,
      });
    }
  }

  update(timeSeconds: number, energy: number, warmth: number): void {
    this.pillars.forEach((pillar, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.42 + index * 0.019) + pillar.phase);
      const localAccent = Math.max(0, pulse - 0.62) / 0.38;
      pillar.sprite.position.x =
        pillar.baseX + Math.sin(timeSeconds * (0.052 + index * 0.003) + pillar.phase) * 0.22;
      pillar.sprite.position.y =
        pillar.baseY + Math.cos(timeSeconds * (0.063 + index * 0.004) - pillar.phase) * 0.28;
      pillar.sprite.scale.set(
        pillar.baseWidth * (0.82 + pulse * 0.44 + energy * 0.28),
        pillar.baseHeight * (0.92 + pulse * 0.12 + energy * 0.22),
        1,
      );
      pillar.material.opacity = Math.min(
        0.28,
        pillar.baseOpacity * (0.52 + pulse * 0.72 + energy * 1.45 + localAccent * 0.55),
      );
    });
    this.wells.forEach((well, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.17 + index * 0.013) + well.phase);
      const scale = well.baseScale * (0.86 + pulse * 0.18 + energy * 0.14);
      well.sprite.scale.set(scale * (1.12 + index * 0.06), scale, 1);
      well.sprite.position.x =
        well.baseX + Math.sin(timeSeconds * (0.034 + index * 0.004) + well.phase) * 0.48;
      well.sprite.position.y =
        well.baseY + Math.cos(timeSeconds * (0.029 + index * 0.005) - well.phase) * 0.38;
      well.material.opacity = Math.min(
        0.035,
        well.baseOpacity * (0.68 + pulse * 0.68 + energy * 1.18 + warmth * 0.35),
      );
    });
  }

  dispose(): void {
    this.pillars.forEach((pillar) => pillar.material.dispose());
    this.wells.forEach((well) => well.material.dispose());
    this.pillarTexture.dispose();
    this.glowTexture.dispose();
  }
}
