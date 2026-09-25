import * as THREE from "three/webgpu";
import { attribute, sin, vec3, uniform, positionGeometry } from "three/tsl";

import type { RendererBackend } from "../../core/rendererBackend";
import { getSubpixelPointCoverage } from "../pointCoverage";
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

type GardenParticleMaterial = THREE.PointsMaterial | THREE.PointsNodeMaterial;

export class CinematicParticleBands {
  private readonly clock = uniform(0);
  private readonly buffers: readonly [Float32Array, Float32Array, Float32Array];
  private readonly points: readonly [THREE.Points, THREE.Points, THREE.Points];
  private readonly materials: readonly [
    GardenParticleMaterial,
    GardenParticleMaterial,
    GardenParticleMaterial,
  ];
  private readonly baseOpacities: readonly [number, number, number];
  private readonly fixedPixelPoints: boolean;
  private pointCoverage = 1;
  private energy = 0;

  constructor(group: THREE.Group, options: CinematicParticleBandsOptions) {
    // The chain uses an orthographic camera, so its tiny WebGL points also
    // remain below the one-pixel minimum. Perspective WebGL sizes vary by depth.
    this.fixedPixelPoints = options.backend === "webgpu" || options.profile.layout === "chain";
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
    const phaseBuffers = splitBand(field.phases, field.bands, 1);
    const createPointsForBand = (band: 0 | 1 | 2): THREE.Points => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(this.buffers[band], 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffers[band]!, 3));
      geometry.setAttribute("gardenPhase", new THREE.BufferAttribute(phaseBuffers[band], 1));
      const style = getCinematicEnvironmentParticleStyle(options.backend, band);
      const params = {
        size: style.size,
        sizeAttenuation: true,
        transparent: true,
        opacity: style.opacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      };
      const drift =
        options.profile.layout === "rain" || options.profile.layout === "lanterns"
          ? [0.04, 0.28, 0.1]
          : options.profile.layout === "veil"
            ? [0.24, 0.04, 0.16]
            : [0.1, 0.07, 0.21];
      let material: GardenParticleMaterial;
      if (options.backend === "webgpu") {
        const nodes = new THREE.PointsNodeMaterial(params);
        const phase = attribute<"float">("gardenPhase", "float");
        const rate = sin(phase.mul(1.7)).mul(0.07).add(0.12);
        const wave = this.clock.mul(rate).add(phase);
        const depth = 0.45 + band * 0.4;
        nodes.positionNode = positionGeometry.add(
          vec3(
            sin(wave).mul(drift[0]! * depth),
            sin(wave.mul(0.83).add(phase)).mul(drift[1]! * depth),
            sin(wave.mul(0.63).sub(phase)).mul(drift[2]! * depth),
          ),
        );
        nodes.colorNode = attribute<"vec3">("color", "vec3").mul(
          sin(wave.mul(1.9)).pow(2).mul(0.65).add(0.35),
        );
        material = nodes;
      } else {
        const classic = new THREE.PointsMaterial(params);
        classic.onBeforeCompile = (shader) => {
          shader.uniforms.gardenTime = this.clock;
          shader.vertexShader =
            "uniform float gardenTime; attribute float gardenPhase;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
            #include <begin_vertex>
            float gardenWave = gardenTime * (0.12 + 0.07 * sin(gardenPhase * 1.7)) + gardenPhase;
            transformed += vec3(sin(gardenWave) * ${drift[0]}, sin(gardenWave * .83 + gardenPhase) * ${drift[1]},
              sin(gardenWave * .63 - gardenPhase) * ${drift[2]}) * ${0.45 + band * 0.4};
          `,
          );
          shader.vertexShader = shader.vertexShader.replace(
            "#include <color_vertex>",
            `
            #include <color_vertex>
            float gardenTwinkle = sin((gardenTime * (0.12 + 0.07 * sin(gardenPhase * 1.7)) + gardenPhase) * 1.9);
            vColor *= .35 + .65 * gardenTwinkle * gardenTwinkle;
          `,
          );
        };
        classic.customProgramCacheKey = () => `garden-dust-v2-${band}-${options.profile.layout}`;
        material = classic;
      }
      const pointCloud = new THREE.Points(geometry, material);
      pointCloud.frustumCulled = false;
      pointCloud.renderOrder = -4 + band;
      group.add(pointCloud);
      return pointCloud;
    };
    this.points = [createPointsForBand(0), createPointsForBand(1), createPointsForBand(2)];
    this.materials = [
      this.points[0].material as GardenParticleMaterial,
      this.points[1].material as GardenParticleMaterial,
      this.points[2].material as GardenParticleMaterial,
    ];
  }

  update(timeSeconds: number, energy: number): void {
    this.clock.value = timeSeconds;
    this.energy = energy;
    this.points.forEach((points, index) => {
      points.rotation.z = timeSeconds * BAND_ROTATION_SPEEDS[index];
      points.position.x =
        Math.sin(timeSeconds * (0.029 + index * 0.008) + index) * (0.32 + index * 0.18);
      points.position.y =
        Math.cos(timeSeconds * (0.024 + index * 0.007) + index) * (0.22 + index * 0.13);
    });
    this.updateOpacities();
  }

  setPixelRatio(pixelRatio: number): void {
    const coverage = getSubpixelPointCoverage(pixelRatio);
    this.pointCoverage = this.fixedPixelPoints ? coverage : 1;
    this.updateOpacities();
  }

  private updateOpacities(): void {
    this.materials.forEach((material, index) => {
      material.opacity =
        this.pointCoverage *
        Math.min(0.65, this.baseOpacities[index]! * (0.92 + this.energy * 0.82));
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
