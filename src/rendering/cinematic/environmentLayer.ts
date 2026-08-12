import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

import type { RendererBackend } from "../../core/rendererBackend";
import { CinematicAtmosphereLayers } from "./environmentAtmosphere";
import { CinematicAuroraLayers } from "./environmentAurora";
import { CinematicLightStructureLayers } from "./environmentLightStructures";
import { CinematicParticleBands } from "./environmentParticles";
import {
  assertBounded,
  AURORA_VEIL_COUNT,
  FILAMENT_VEIL_COUNT,
  FLARE_COUNT,
  getCinematicEnvironmentParticleStyle,
  getCinematicLayerArtDirection,
  LIGHT_PILLAR_COUNT,
  LUMINANCE_WELL_COUNT,
  NEBULA_VEIL_COUNT,
  RESONANCE_HALO_COUNT,
  WEBGL_PARTICLE_CAP,
} from "./environmentPrimitives";
import { CinematicResonanceLayers } from "./environmentResonance";
import {
  CINEMATIC_ENVIRONMENT_PROFILES,
  getCinematicViewportSpan,
  type CinematicChapterId,
  type CinematicEnvironmentProfile,
} from "./model";

export { getCinematicEnvironmentParticleStyle, getCinematicLayerArtDirection };

export interface CinematicEnvironmentLayerOptions {
  backend: RendererBackend;
  chapter?: CinematicChapterId;
  profile?: CinematicEnvironmentProfile;
  seed: number;
  maximumParticleCount: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
}

export class CinematicEnvironmentLayer {
  readonly group = new THREE.Group();

  private readonly maximumParticleCount: number;
  private readonly requestedMaximumParticleCount: number;
  private readonly extent: Readonly<{ x: number; y: number; z: number }>;
  private readonly particles: CinematicParticleBands;
  private readonly atmosphere: CinematicAtmosphereLayers;
  private readonly resonance: CinematicResonanceLayers;
  private readonly aurora: CinematicAuroraLayers;
  private readonly lightStructures: CinematicLightStructureLayers;
  private readonly sceneTime = uniform(0);
  private readonly sceneEnergy = uniform(0);
  private readonly sceneWarmth = uniform(0);
  private particleCount: number;
  private disposed = false;

  constructor(options: CinematicEnvironmentLayerOptions) {
    if (!Number.isInteger(options.maximumParticleCount) || options.maximumParticleCount < 0) {
      throw new Error("Cinematic maximum particle count must be a nonnegative integer");
    }
    this.requestedMaximumParticleCount = options.maximumParticleCount;
    this.maximumParticleCount =
      options.backend === "webgl"
        ? Math.min(options.maximumParticleCount, WEBGL_PARTICLE_CAP)
        : options.maximumParticleCount;
    this.particleCount = this.maximumParticleCount;
    this.extent = options.extent;
    const profile =
      options.profile ??
      (options.chapter ? CINEMATIC_ENVIRONMENT_PROFILES[options.chapter] : undefined);
    if (!profile) throw new Error("Cinematic environment profile is required");
    const artDirection = getCinematicLayerArtDirection(profile.layout);

    // Construction order is the rendering contract: tests and renderOrder tuning depend on it.
    this.particles = new CinematicParticleBands(this.group, {
      backend: options.backend,
      chapter: options.chapter,
      profile,
      profileWasProvided: options.profile !== undefined,
      seed: options.seed,
      maximumParticleCount: this.maximumParticleCount,
    });
    this.atmosphere = new CinematicAtmosphereLayers(this.group, {
      backend: options.backend,
      profile,
      seed: options.seed,
      palette: options.palette,
      extent: options.extent,
      artDirection,
      sceneTime: this.sceneTime,
      sceneEnergy: this.sceneEnergy,
      sceneWarmth: this.sceneWarmth,
    });
    this.resonance = new CinematicResonanceLayers(this.group, {
      profile,
      seed: options.seed,
      palette: options.palette,
      extent: options.extent,
      artDirection,
    });
    this.aurora = new CinematicAuroraLayers(this.group, {
      profile,
      seed: options.seed,
      palette: options.palette,
      extent: options.extent,
      artDirection,
    });
    this.lightStructures = new CinematicLightStructureLayers(this.group, {
      profile,
      seed: options.seed,
      palette: options.palette,
      extent: options.extent,
      artDirection,
    });
    this.setParticleCount(this.particleCount);
    this.resize(options.extent.x / options.extent.y);
  }

  update(timeSeconds: number, energy: number, warmth: number, camera?: THREE.Camera): void {
    if (this.disposed) throw new Error("Cinematic environment layer has been disposed");
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error("Cinematic environment time must be finite and nonnegative");
    }
    assertBounded("Cinematic environment energy", energy);
    assertBounded("Cinematic environment warmth", warmth);
    this.sceneTime.value = timeSeconds;
    this.sceneEnergy.value = energy;
    this.sceneWarmth.value = warmth;
    this.particles.update(timeSeconds, energy);
    this.atmosphere.update(timeSeconds, energy, warmth, this.extent, camera);
    this.resonance.update(timeSeconds, energy, warmth, camera);
    this.aurora.update(timeSeconds, energy, warmth);
    this.lightStructures.update(timeSeconds, energy, warmth);
  }

  resize(aspect: number): void {
    if (this.disposed) throw new Error("Cinematic environment layer has been disposed");
    const span = getCinematicViewportSpan(aspect);
    this.group.scale.set(
      Math.max(1, span.x / this.extent.x),
      1,
      Math.max(1, span.z / this.extent.z),
    );
  }

  setParticleCount(count: number): void {
    if (this.disposed) throw new Error("Cinematic environment layer has been disposed");
    if (!Number.isInteger(count) || count < 0 || count > this.requestedMaximumParticleCount) {
      throw new Error("Cinematic environment particle count is out of range");
    }
    this.particleCount = Math.min(count, this.maximumParticleCount);
    this.particles.setCount(this.particleCount);
  }

  getParticleBuffers(): readonly [Float32Array, Float32Array, Float32Array] {
    return this.particles.getBuffers();
  }

  getStats(): {
    particles: number;
    depthBands: 3;
    nebulaVeils: 5;
    filamentVeils: 6;
    resonanceHalos: 7;
    flares: 9;
    auroraVeils: 5;
    lightPillars: 11;
    luminanceWells: 4;
  } {
    return {
      particles: this.particleCount,
      depthBands: 3,
      nebulaVeils: NEBULA_VEIL_COUNT,
      filamentVeils: FILAMENT_VEIL_COUNT,
      resonanceHalos: RESONANCE_HALO_COUNT,
      flares: FLARE_COUNT,
      auroraVeils: AURORA_VEIL_COUNT,
      lightPillars: LIGHT_PILLAR_COUNT,
      luminanceWells: LUMINANCE_WELL_COUNT,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.particles.dispose();
    this.atmosphere.dispose();
    this.resonance.dispose();
    this.aurora.dispose();
    this.lightStructures.dispose();
    this.group.clear();
  }
}
