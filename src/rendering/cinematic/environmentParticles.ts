import * as THREE from "three/webgpu";

import type { RendererBackend } from "../../core/rendererBackend";
import {
  createCinematicParticleField,
  createCinematicParticleFieldFromProfile,
  type CinematicChapterId,
  type CinematicEnvironmentProfile,
} from "./model";
import {
  BAND_ROTATION_SPEEDS,
  getCinematicEnvironmentParticleStyle,
  splitBand,
} from "./environmentPrimitives";

export interface CinematicParticleBandsOptions {
  backend: RendererBackend;
  chapter?: CinematicChapterId;
  profile: CinematicEnvironmentProfile;
  profileWasProvided: boolean;
  seed: number;
  maximumParticleCount: number;
}

export class CinematicParticleBands {
  private readonly buffers: readonly [Float32Array, Float32Array, Float32Array];
  private readonly points: readonly [THREE.Points, THREE.Points, THREE.Points];
  private readonly materials: readonly [
    THREE.PointsMaterial,
    THREE.PointsMaterial,
    THREE.PointsMaterial,
  ];
  private readonly baseOpacities: readonly [number, number, number];

  constructor(group: THREE.Group, options: CinematicParticleBandsOptions) {
    this.baseOpacities = [
      getCinematicEnvironmentParticleStyle(options.backend, 0).opacity,
      getCinematicEnvironmentParticleStyle(options.backend, 1).opacity,
      getCinematicEnvironmentParticleStyle(options.backend, 2).opacity,
    ];
    const field = options.profileWasProvided
      ? createCinematicParticleFieldFromProfile(
          options.seed,
          options.profile,
          options.maximumParticleCount,
        )
      : createCinematicParticleField(options.seed, options.chapter!, options.maximumParticleCount);
    this.buffers = splitBand(field.positions, field.bands, 3);
    const colorBuffers = splitBand(field.colors, field.bands, 3);
    const createPointsForBand = (band: 0 | 1 | 2): THREE.Points => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(this.buffers[band], 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffers[band]!, 3));
      const style = getCinematicEnvironmentParticleStyle(options.backend, band);
      const material = new THREE.PointsMaterial({
        size: style.size,
        sizeAttenuation: true,
        transparent: true,
        opacity: style.opacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const pointCloud = new THREE.Points(geometry, material);
      pointCloud.frustumCulled = false;
      pointCloud.renderOrder = -4 + band;
      group.add(pointCloud);
      return pointCloud;
    };
    this.points = [createPointsForBand(0), createPointsForBand(1), createPointsForBand(2)];
    this.materials = [
      this.points[0].material as THREE.PointsMaterial,
      this.points[1].material as THREE.PointsMaterial,
      this.points[2].material as THREE.PointsMaterial,
    ];
  }

  update(timeSeconds: number, energy: number): void {
    this.points.forEach((points, index) => {
      points.rotation.z = timeSeconds * BAND_ROTATION_SPEEDS[index];
      points.position.x =
        Math.sin(timeSeconds * (0.029 + index * 0.008) + index) * (0.32 + index * 0.18);
      points.position.y =
        Math.cos(timeSeconds * (0.024 + index * 0.007) + index) * (0.22 + index * 0.13);
      this.materials[index].opacity = Math.min(
        0.65,
        this.baseOpacities[index]! * (0.92 + energy * 0.82),
      );
    });
  }

  setCount(count: number): void {
    let remaining = count;
    this.points.forEach((points, index) => {
      const maximum = this.buffers[index].length / 3;
      const target =
        index === 0
          ? Math.min(maximum, Math.floor(count * 0.52))
          : index === 1
            ? Math.min(maximum, Math.floor(count * 0.34))
            : Math.min(maximum, remaining);
      points.geometry.setDrawRange(0, target);
      remaining -= target;
    });
  }

  getBuffers(): readonly [Float32Array, Float32Array, Float32Array] {
    return this.buffers;
  }

  dispose(): void {
    this.points.forEach((points) => points.geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
