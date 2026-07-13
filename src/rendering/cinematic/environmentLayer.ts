import * as THREE from "three/webgpu";
import { float, length, mix, sin, smoothstep, uniform, uv, vec2, vec3 } from "three/tsl";

import type { RendererBackend } from "../../core/rendererBackend";
import { createSeededRandom } from "../../core/seed";
import {
  createCinematicParticleField,
  createCinematicParticleFieldFromProfile,
  CINEMATIC_ENVIRONMENT_PROFILES,
  getCinematicViewportSpan,
  type CinematicChapterId,
  type CinematicEnvironmentProfile,
} from "./model";

const BAND_ROTATION_SPEEDS = [0.0034, -0.0048, 0.0066] as const;
const BAND_POINT_SIZES = [0.028, 0.052, 0.09] as const;
const BAND_OPACITIES = [0.27, 0.22, 0.17] as const;
const NEBULA_TEXTURE_SIZE = 192;
const NEBULA_VEIL_COUNT = 5;
const FILAMENT_VEIL_COUNT = 6;
const FILAMENT_POINT_COUNT = 240;
const RESONANCE_HALO_COUNT = 7;
const RESONANCE_HALO_POINTS = 160;
const FLARE_COUNT = 9;
const FLARE_TEXTURE_SIZE = 64;
const WEBGL_PARTICLE_CAP = 8_000;

export interface CinematicEnvironmentLayerOptions {
  backend: RendererBackend;
  chapter?: CinematicChapterId;
  profile?: CinematicEnvironmentProfile;
  seed: number;
  maximumParticleCount: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
}

export function getCinematicEnvironmentParticleStyle(
  backend: RendererBackend,
  band: 0 | 1 | 2,
): Readonly<{ size: number; opacity: number }> {
  if (backend === "webgl") {
    return {
      size: [0.012, 0.022, 0.042][band]!,
      opacity: [0.2, 0.16, 0.11][band]!,
    };
  }
  return { size: BAND_POINT_SIZES[band], opacity: BAND_OPACITIES[band] };
}

interface NebulaLayer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial | THREE.MeshBasicNodeMaterial;
  baseOpacity: number;
  texture: THREE.DataTexture | null;
}

interface FilamentVeil {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  baseOpacity: number;
  phase: number;
}

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

function colorChannels(color: number): readonly [number, number, number] {
  return [((color >>> 16) & 0xff) / 255, ((color >>> 8) & 0xff) / 255, (color & 0xff) / 255];
}

function splitBand<T extends Float32Array | Uint8Array>(
  values: T,
  bands: Uint8Array,
  itemWidth: number,
): readonly [T, T, T] {
  const counts = [0, 0, 0];
  for (const band of bands) counts[band]! += 1;
  const result = counts.map(
    (count) => new (values.constructor as new (length: number) => T)(count * itemWidth),
  ) as [T, T, T];
  const offsets = [0, 0, 0];
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index]!;
    const target = result[band];
    const targetOffset = offsets[band]! * itemWidth;
    const sourceOffset = index * itemWidth;
    for (let component = 0; component < itemWidth; component += 1) {
      target[targetOffset + component] = values[sourceOffset + component]!;
    }
    offsets[band]! += 1;
  }
  return result;
}

function createNebulaTexture(
  seed: number,
  firstColor: number,
  secondColor: number,
): THREE.DataTexture {
  const random = createSeededRandom(seed);
  const first = colorChannels(firstColor);
  const second = colorChannels(secondColor);
  const phase = random() * Math.PI * 2;
  const data = new Uint8Array(NEBULA_TEXTURE_SIZE * NEBULA_TEXTURE_SIZE * 4);
  for (let row = 0; row < NEBULA_TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < NEBULA_TEXTURE_SIZE; column += 1) {
      const x = column / (NEBULA_TEXTURE_SIZE - 1) - 0.5;
      const y = (row / (NEBULA_TEXTURE_SIZE - 1) - 0.5) * 1.35;
      const distance = Math.hypot(x, y);
      const rings = Math.sin(distance * 42 + phase) * 0.5 + 0.5;
      const cloud = Math.max(0, 1 - distance * 1.42) ** 1.55;
      const noise = 0.62 + random() * 0.38;
      const offset = (row * NEBULA_TEXTURE_SIZE + column) * 4;
      data[offset] = Math.round((first[0] + (second[0] - first[0]) * rings) * 255);
      data[offset + 1] = Math.round((first[1] + (second[1] - first[1]) * rings) * 255);
      data[offset + 2] = Math.round((first[2] + (second[2] - first[2]) * rings) * 255);
      data[offset + 3] = Math.round(cloud * noise * 155);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    NEBULA_TEXTURE_SIZE,
    NEBULA_TEXTURE_SIZE,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createWebGpuNebulaMaterial(
  firstColor: number,
  secondColor: number,
  phase: number,
  time: THREE.UniformNode<"float", number>,
  energy: THREE.UniformNode<"float", number>,
  warmth: THREE.UniformNode<"float", number>,
): THREE.MeshBasicNodeMaterial {
  const first = colorChannels(firstColor);
  const second = colorChannels(secondColor);
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const centered = uv().sub(vec2(0.5, 0.5));
  const distance = length(centered.mul(vec2(1, 1.35)));
  const rings = sin(distance.mul(42).sub(time.mul(0.14)).add(float(phase)))
    .mul(0.5)
    .add(0.5);
  const cloud = float(1).sub(smoothstep(0.04, 0.7, distance));
  const coolTone = mix(vec3(...first), vec3(...second), rings);
  material.colorNode = mix(coolTone, vec3(1, 0.62, 0.28), warmth.mul(0.2));
  material.opacityNode = cloud.mul(rings.mul(0.003).add(0.0015).add(energy.mul(0.005)));
  return material;
}

function createFlareTexture(): THREE.DataTexture {
  const data = new Uint8Array(FLARE_TEXTURE_SIZE * FLARE_TEXTURE_SIZE * 4);
  for (let row = 0; row < FLARE_TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < FLARE_TEXTURE_SIZE; column += 1) {
      const x = (column / (FLARE_TEXTURE_SIZE - 1) - 0.5) * 2;
      const y = (row / (FLARE_TEXTURE_SIZE - 1) - 0.5) * 2;
      const radial = Math.hypot(x, y);
      const core = Math.max(0, 1 - radial) ** 3.2;
      const ray =
        Math.max(0, 1 - Math.abs(x) * 9) * Math.max(0, 1 - Math.abs(y) * 1.4) +
        Math.max(0, 1 - Math.abs(y) * 9) * Math.max(0, 1 - Math.abs(x) * 1.4);
      const alpha = Math.min(1, core + ray * 0.32);
      const offset = (row * FLARE_TEXTURE_SIZE + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    FLARE_TEXTURE_SIZE,
    FLARE_TEXTURE_SIZE,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createResonanceHaloGeometry(
  profile: CinematicEnvironmentProfile,
  index: number,
): THREE.BufferGeometry {
  const positions = new Float32Array((RESONANCE_HALO_POINTS + 1) * 3);
  const radius = 1.2 + index * 0.52;
  const [aspectX, aspectY] = profile.haloAspect;
  for (let pointIndex = 0; pointIndex <= RESONANCE_HALO_POINTS; pointIndex += 1) {
    const angle = (pointIndex / RESONANCE_HALO_POINTS) * Math.PI * 2;
    const harmonicRipple = 1 + Math.sin(angle * (3 + (index % 4)) + index * 0.7) * 0.018;
    const offset = pointIndex * 3;
    positions[offset] = Math.cos(angle) * radius * aspectX * harmonicRipple;
    positions[offset + 1] = Math.sin(angle) * radius * aspectY * harmonicRipple;
    positions[offset + 2] = 0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function createFilamentGeometry(
  seed: number,
  profile: CinematicEnvironmentProfile,
  index: number,
  extent: Readonly<{ x: number; y: number; z: number }>,
): THREE.BufferGeometry {
  const random = createSeededRandom(seed ^ Math.imul(index + 17, 0x45d9f3b));
  const positions = new Float32Array(FILAMENT_POINT_COUNT * 3);
  const lane = (index / Math.max(1, FILAMENT_VEIL_COUNT - 1)) * 2 - 1;
  const amplitudeY = extent.y * (0.11 + random() * 0.08);
  const amplitudeZ = extent.z * (0.08 + random() * 0.06);
  const baseY = lane * extent.y * 0.34 + (random() - 0.5) * extent.y * 0.18;
  const baseZ = -extent.z * (0.7 + random() * 0.35);
  const frequency = 1.25 + random() * 1.75;
  const phase = random() * Math.PI * 2 + profile.filamentPhase;

  for (let pointIndex = 0; pointIndex < FILAMENT_POINT_COUNT; pointIndex += 1) {
    const progress = pointIndex / (FILAMENT_POINT_COUNT - 1);
    const sweep = progress * 2 - 1;
    const wave = Math.sin(progress * Math.PI * 2 * frequency + phase);
    const cross = Math.cos(progress * Math.PI * (frequency + 0.65) - phase * 0.7);
    const offset = pointIndex * 3;
    positions[offset] = sweep * extent.x * (1.08 + random() * 0.03);
    positions[offset + 1] = baseY + wave * amplitudeY + cross * amplitudeY * 0.35;
    positions[offset + 2] =
      baseZ + cross * amplitudeZ + Math.sin(progress * Math.PI) * extent.z * 0.16;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function assertBounded(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be finite and between zero and one`);
  }
}

export class CinematicEnvironmentLayer {
  readonly group = new THREE.Group();

  private readonly maximumParticleCount: number;
  private readonly requestedMaximumParticleCount: number;
  private readonly extent: Readonly<{ x: number; y: number; z: number }>;
  private readonly particleBuffers: readonly [Float32Array, Float32Array, Float32Array];
  private readonly particlePoints: readonly [THREE.Points, THREE.Points, THREE.Points];
  private readonly particleMaterials: readonly [
    THREE.PointsMaterial,
    THREE.PointsMaterial,
    THREE.PointsMaterial,
  ];
  private readonly particleBaseOpacities: readonly [number, number, number];
  private readonly nebulaLayers: NebulaLayer[] = [];
  private readonly filamentVeils: FilamentVeil[] = [];
  private readonly resonanceHalos: ResonanceHalo[] = [];
  private readonly flares: CinematicFlare[] = [];
  private readonly flareTexture = createFlareTexture();
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
    this.particleBaseOpacities = [
      getCinematicEnvironmentParticleStyle(options.backend, 0).opacity,
      getCinematicEnvironmentParticleStyle(options.backend, 1).opacity,
      getCinematicEnvironmentParticleStyle(options.backend, 2).opacity,
    ];
    this.particleCount = this.maximumParticleCount;
    this.extent = options.extent;
    const profile =
      options.profile ??
      (options.chapter ? CINEMATIC_ENVIRONMENT_PROFILES[options.chapter] : undefined);
    if (!profile) throw new Error("Cinematic environment profile is required");
    const field = options.profile
      ? createCinematicParticleFieldFromProfile(options.seed, profile, this.maximumParticleCount)
      : createCinematicParticleField(options.seed, options.chapter!, this.maximumParticleCount);
    this.particleBuffers = splitBand(field.positions, field.bands, 3);
    const colorBuffers = splitBand(field.colors, field.bands, 3);
    const createPointsForBand = (band: 0 | 1 | 2): THREE.Points => {
      const positions = this.particleBuffers[band];
      const style = getCinematicEnvironmentParticleStyle(options.backend, band);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffers[band]!, 3));
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
      this.group.add(pointCloud);
      return pointCloud;
    };
    const points: [THREE.Points, THREE.Points, THREE.Points] = [
      createPointsForBand(0),
      createPointsForBand(1),
      createPointsForBand(2),
    ];
    this.particlePoints = points;
    this.particleMaterials = [
      points[0].material as THREE.PointsMaterial,
      points[1].material as THREE.PointsMaterial,
      points[2].material as THREE.PointsMaterial,
    ];

    for (let index = 0; index < NEBULA_VEIL_COUNT; index += 1) {
      const firstColor = options.palette[index % options.palette.length]!;
      const secondColor = options.palette[(index + 1) % options.palette.length]!;
      const baseOpacity = 0.018 - index * 0.002;
      const texture =
        options.backend === "webgl"
          ? createNebulaTexture(options.seed + index * 997, firstColor, secondColor)
          : null;
      const material =
        options.backend === "webgpu"
          ? createWebGpuNebulaMaterial(
              firstColor,
              secondColor,
              index * 2.1,
              this.sceneTime,
              this.sceneEnergy,
              this.sceneWarmth,
            )
          : new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: baseOpacity,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              toneMapped: false,
            });
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(options.extent.x * 3.1, options.extent.y * 2.9),
        material,
      );
      mesh.position.set(
        (index - 2) * options.extent.x * 0.1,
        (2 - index) * 0.42,
        -7 - index * 1.75,
      );
      mesh.rotation.z = (index - 2) * 0.24;
      mesh.renderOrder = -8 + index;
      this.group.add(mesh);
      this.nebulaLayers.push({
        mesh,
        material,
        baseOpacity,
        texture,
      });
    }

    for (let index = 0; index < FILAMENT_VEIL_COUNT; index += 1) {
      const material = new THREE.LineBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(
        createFilamentGeometry(options.seed, profile, index, options.extent),
        material,
      );
      line.frustumCulled = false;
      line.renderOrder = -3 + index;
      this.group.add(line);
      this.filamentVeils.push({
        line,
        material,
        baseOpacity: 0.042 + index * 0.005,
        phase: index * 0.9 + options.seed * 0.0001,
      });
    }

    for (let index = 0; index < RESONANCE_HALO_COUNT; index += 1) {
      const material = new THREE.LineBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.045,
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
      this.group.add(line);
      this.resonanceHalos.push({
        line,
        material,
        baseOpacity: 0.024 + index * 0.004,
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
      const baseScale = 0.32 + (index % 4) * 0.09;
      sprite.scale.setScalar(baseScale);
      sprite.renderOrder = 8 + index;
      this.group.add(sprite);
      this.flares.push({
        sprite,
        material,
        baseScale,
        baseY: chapterY,
        baseOpacity: 0.08 + (index % 3) * 0.025,
        phase: index * 1.73 + options.seed * 0.00017,
      });
    }
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
    this.particlePoints.forEach((points, index) => {
      points.rotation.z = timeSeconds * BAND_ROTATION_SPEEDS[index];
      points.position.x =
        Math.sin(timeSeconds * (0.013 + index * 0.004) + index) * (0.12 + index * 0.07);
      points.position.y =
        Math.cos(timeSeconds * (0.011 + index * 0.003) + index) * (0.08 + index * 0.05);
      this.particleMaterials[index].opacity = Math.min(
        0.5,
        this.particleBaseOpacities[index]! * (0.82 + energy * 0.46),
      );
    });
    this.nebulaLayers.forEach((layer, index) => {
      const rotationZ = (index - 2) * 0.24 + Math.sin(timeSeconds * 0.018 + index) * 0.08;
      if (camera) {
        layer.mesh.quaternion.copy(camera.quaternion);
        layer.mesh.rotateZ(rotationZ);
      } else {
        layer.mesh.rotation.set(0, 0, rotationZ);
      }
      if (layer.material instanceof THREE.MeshBasicMaterial) {
        layer.material.opacity = Math.min(
          0.11,
          layer.baseOpacity + energy * 0.024 + warmth * 0.008,
        );
      }
    });
    this.filamentVeils.forEach((veil, index) => {
      veil.line.position.x = Math.sin(timeSeconds * (0.018 + index * 0.003) + veil.phase) * 0.36;
      veil.line.position.y = Math.cos(timeSeconds * (0.013 + index * 0.004) - veil.phase) * 0.22;
      veil.line.rotation.z = Math.sin(timeSeconds * 0.01 + veil.phase) * 0.035;
      veil.material.opacity = Math.min(
        0.19,
        veil.baseOpacity * (0.88 + energy * 0.92 + warmth * 0.26),
      );
    });
    this.resonanceHalos.forEach((halo, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.34 + index * 0.021) + halo.phase);
      const scale = halo.baseScale * (0.985 + pulse * 0.018 + energy * 0.045);
      halo.line.scale.setScalar(scale);
      if (camera) {
        halo.line.quaternion.copy(camera.quaternion);
        halo.line.rotateZ(halo.rotationOffset + Math.sin(timeSeconds * 0.025 + halo.phase) * 0.08);
      } else {
        halo.line.rotation.set(0, 0, halo.rotationOffset);
      }
      halo.material.opacity = Math.min(
        0.18,
        halo.baseOpacity * (0.72 + pulse * 0.38 + energy * 1.45 + warmth * 0.22),
      );
    });
    this.flares.forEach((flare, index) => {
      const shimmer = Math.max(0, Math.sin(timeSeconds * (0.82 + index * 0.047) + flare.phase));
      const accent = Math.max(0, shimmer - 0.72) / 0.28;
      const scale = flare.baseScale * (0.86 + shimmer * 0.2 + energy * (0.7 + accent * 0.85));
      flare.sprite.scale.set(scale, scale, 1);
      flare.sprite.position.y =
        flare.baseY + Math.sin(timeSeconds * (0.09 + index * 0.003) + flare.phase) * 0.16;
      flare.material.opacity = Math.min(
        0.72,
        flare.baseOpacity * (0.6 + shimmer * 0.55 + energy * 2.2 + accent * 1.4),
      );
    });
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
    let remaining = this.particleCount;
    this.particlePoints.forEach((points, index) => {
      const maximum = this.particleBuffers[index].length / 3;
      const target =
        index === 0
          ? Math.min(maximum, Math.floor(this.particleCount * 0.52))
          : index === 1
            ? Math.min(maximum, Math.floor(this.particleCount * 0.34))
            : Math.min(maximum, remaining);
      points.geometry.setDrawRange(0, target);
      remaining -= target;
    });
  }

  getParticleBuffers(): readonly [Float32Array, Float32Array, Float32Array] {
    return this.particleBuffers;
  }

  getStats(): {
    particles: number;
    depthBands: 3;
    nebulaVeils: 5;
    filamentVeils: 6;
    resonanceHalos: 7;
    flares: 9;
  } {
    return {
      particles: this.particleCount,
      depthBands: 3,
      nebulaVeils: NEBULA_VEIL_COUNT,
      filamentVeils: FILAMENT_VEIL_COUNT,
      resonanceHalos: RESONANCE_HALO_COUNT,
      flares: FLARE_COUNT,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.particlePoints.forEach((points) => points.geometry.dispose());
    this.particleMaterials.forEach((material) => material.dispose());
    this.nebulaLayers.forEach((layer) => {
      layer.mesh.geometry.dispose();
      layer.material.dispose();
      layer.texture?.dispose();
    });
    this.filamentVeils.forEach((veil) => {
      veil.line.geometry.dispose();
      veil.material.dispose();
    });
    this.resonanceHalos.forEach((halo) => {
      halo.line.geometry.dispose();
      halo.material.dispose();
    });
    this.flares.forEach((flare) => flare.material.dispose());
    this.flareTexture.dispose();
    this.group.clear();
  }
}
