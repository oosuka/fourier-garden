import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "./model";
import {
  createFlareTexture,
  createResonanceHaloGeometry,
  FLARE_COUNT,
  type CinematicLayerArtDirection,
  RESONANCE_HALO_COUNT,
} from "./environmentPrimitives";

interface ResonanceHalo {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  baseOpacity: number;
  phase: number;
  baseScale: number;
  rotationOffset: number;
}

interface CinematicFlare {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  baseScale: number;
  baseY: number;
  baseOpacity: number;
  phase: number;
}

interface CinematicResonanceOptions {
  profile: CinematicEnvironmentProfile;
  seed: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
  artDirection: CinematicLayerArtDirection;
}

export class CinematicResonanceLayers {
  private readonly halos: ResonanceHalo[] = [];
  private readonly flares: CinematicFlare[] = [];
  private readonly flareTexture = createFlareTexture();

  constructor(group: THREE.Group, options: CinematicResonanceOptions) {
    const { profile } = options;
    for (let index = 0; index < RESONANCE_HALO_COUNT; index += 1) {
      const material = new THREE.LineBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(createResonanceHaloGeometry(profile, index), material);
      const horizontalOffset =
        profile.layout === "cathedral"
          ? (index - (RESONANCE_HALO_COUNT - 1) / 2) * 2.35
          : profile.layout === "ribbon"
            ? ((index % 3) - 1) * 2.8
            : -2.8 + index * 0.66;
      const verticalOffset =
        profile.layout === "ribbon" ? (Math.floor(index / 3) - 1) * 1.8 : -0.25;
      line.position.set(horizontalOffset, verticalOffset, -5.2 - index * 0.36);
      line.frustumCulled = false;
      line.renderOrder = -2 + index;
      group.add(line);
      this.halos.push({
        line,
        material,
        baseOpacity: (0.04 + index * 0.006) * options.artDirection.halo,
        phase: index * 0.83 + options.seed * 0.00013,
        baseScale: 0.82 + index * 0.035,
        rotationOffset:
          profile.layout === "ribbon"
            ? index * 0.4
            : profile.layout === "cathedral"
              ? (index - 3) * 0.035
              : index * 0.13,
      });
    }

    for (let index = 0; index < FLARE_COUNT; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: this.flareTexture,
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      const lane = (index / Math.max(1, FLARE_COUNT - 1)) * 2 - 1;
      const chapterX =
        profile.layout === "cathedral"
          ? lane * options.extent.x * 0.34
          : profile.layout === "ribbon"
            ? Math.sin(index * 2.21) * options.extent.x * 0.3
            : -options.extent.x * 0.18 + lane * options.extent.x * 0.28;
      const chapterY =
        profile.layout === "cathedral"
          ? -options.extent.y * 0.28 + Math.abs(lane) * options.extent.y * 0.15
          : profile.layout === "ribbon"
            ? Math.cos(index * 1.37) * options.extent.y * 0.28
            : Math.sin(index * 1.63) * options.extent.y * 0.22;
      sprite.position.set(chapterX, chapterY, -2.8 - (index % 3) * 1.4);
      const baseScale = 0.42 + (index % 4) * 0.13;
      sprite.scale.setScalar(baseScale);
      sprite.renderOrder = 8 + index;
      group.add(sprite);
      this.flares.push({
        sprite,
        material,
        baseScale,
        baseY: chapterY,
        baseOpacity: (0.13 + (index % 3) * 0.04) * options.artDirection.flare,
        phase: index * 1.73 + options.seed * 0.00017,
      });
    }
  }

  update(timeSeconds: number, energy: number, warmth: number, camera?: THREE.Camera): void {
    this.halos.forEach((halo, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.48 + index * 0.026) + halo.phase);
      const scale = halo.baseScale * (0.96 + pulse * 0.065 + energy * 0.08);
      halo.line.scale.setScalar(scale);
      if (camera) {
        halo.line.quaternion.copy(camera.quaternion);
        halo.line.rotateZ(halo.rotationOffset + Math.sin(timeSeconds * 0.061 + halo.phase) * 0.15);
      } else {
        halo.line.rotation.set(0, 0, halo.rotationOffset);
      }
      halo.material.opacity = Math.min(
        0.22,
        halo.baseOpacity * (0.82 + pulse * 0.62 + energy * 1.85 + warmth * 0.3),
      );
    });
    this.flares.forEach((flare, index) => {
      const shimmer = Math.max(0, Math.sin(timeSeconds * (0.82 + index * 0.047) + flare.phase));
      const accent = Math.max(0, shimmer - 0.72) / 0.28;
      const scale = flare.baseScale * (0.86 + shimmer * 0.2 + energy * (0.7 + accent * 0.85));
      flare.sprite.scale.set(scale, scale, 1);
      flare.sprite.position.y =
        flare.baseY + Math.sin(timeSeconds * (0.16 + index * 0.007) + flare.phase) * 0.34;
      flare.material.opacity = Math.min(
        0.9,
        flare.baseOpacity * (0.68 + shimmer * 0.72 + energy * 2.5 + accent * 1.55),
      );
    });
  }

  dispose(): void {
    this.halos.forEach((halo) => {
      halo.line.geometry.dispose();
      halo.material.dispose();
    });
    this.flares.forEach((flare) => flare.material.dispose());
    this.flareTexture.dispose();
  }
}
