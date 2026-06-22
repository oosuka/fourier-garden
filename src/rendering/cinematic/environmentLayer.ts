import * as THREE from "three/webgpu";
import { Fn, float, length, mix, sin, smoothstep, uniform, uv, vec2, vec3, vec4 } from "three/tsl";

import type { RendererBackend } from "../../core/rendererBackend";
import { createSeededRandom } from "../../core/seed";
import {
  createCinematicParticleField,
  getCinematicViewportSpan,
  type CinematicChapterId,
} from "./model";

const BAND_ROTATION_SPEEDS = [0.0021, -0.0034, 0.0052] as const;
const BAND_POINT_SIZES = [0.018, 0.032, 0.058] as const;
const BAND_OPACITIES = [0.38, 0.3, 0.2] as const;
const NEBULA_TEXTURE_SIZE = 128;

export interface CinematicEnvironmentLayerOptions {
  backend: RendererBackend;
  chapter: CinematicChapterId;
  seed: number;
  maximumParticleCount: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
}

interface NebulaLayer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial | THREE.MeshBasicNodeMaterial;
  baseOpacity: number;
  texture: THREE.DataTexture | null;
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
      const rings = Math.sin(distance * 36 + phase) * 0.5 + 0.5;
      const cloud = Math.max(0, 1 - distance * 1.6) ** 1.8;
      const noise = 0.72 + random() * 0.28;
      const offset = (row * NEBULA_TEXTURE_SIZE + column) * 4;
      data[offset] = Math.round((first[0] + (second[0] - first[0]) * rings) * 255);
      data[offset + 1] = Math.round((first[1] + (second[1] - first[1]) * rings) * 255);
      data[offset + 2] = Math.round((first[2] + (second[2] - first[2]) * rings) * 255);
      data[offset + 3] = Math.round(cloud * noise * 115);
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
  material.colorNode = Fn(() => {
    const centered = uv().sub(vec2(0.5, 0.5));
    const distance = length(centered.mul(vec2(1, 1.35)));
    const rings = sin(distance.mul(36).sub(time.mul(0.12)).add(float(phase)))
      .mul(0.5)
      .add(0.5);
    const cloud = float(1).sub(smoothstep(0.04, 0.7, distance));
    const coolTone = mix(vec3(...first), vec3(...second), rings);
    const tone = mix(coolTone, vec3(1, 0.62, 0.28), warmth.mul(0.2));
    const alpha = cloud.mul(rings.mul(0.06).add(0.025).add(energy.mul(0.09)));
    return vec4(tone, alpha);
  })();
  return material;
}

function assertBounded(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be finite and between zero and one`);
  }
}

export class CinematicEnvironmentLayer {
  readonly group = new THREE.Group();

  private readonly maximumParticleCount: number;
  private readonly extent: Readonly<{ x: number; y: number; z: number }>;
  private readonly particleBuffers: readonly [Float32Array, Float32Array, Float32Array];
  private readonly particlePoints: readonly [THREE.Points, THREE.Points, THREE.Points];
  private readonly particleMaterials: readonly [
    THREE.PointsMaterial,
    THREE.PointsMaterial,
    THREE.PointsMaterial,
  ];
  private readonly nebulaLayers: NebulaLayer[] = [];
  private readonly sceneTime = uniform(0);
  private readonly sceneEnergy = uniform(0);
  private readonly sceneWarmth = uniform(0);
  private particleCount: number;
  private disposed = false;

  constructor(options: CinematicEnvironmentLayerOptions) {
    if (!Number.isInteger(options.maximumParticleCount) || options.maximumParticleCount < 0) {
      throw new Error("Cinematic maximum particle count must be a nonnegative integer");
    }
    this.maximumParticleCount = options.maximumParticleCount;
    this.particleCount = options.maximumParticleCount;
    this.extent = options.extent;
    const field = createCinematicParticleField(
      options.seed,
      options.chapter,
      options.maximumParticleCount,
    );
    this.particleBuffers = splitBand(field.positions, field.bands, 3);
    const colorBuffers = splitBand(field.colors, field.bands, 3);
    const createPointsForBand = (band: 0 | 1 | 2): THREE.Points => {
      const positions = this.particleBuffers[band];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffers[band]!, 3));
      const material = new THREE.PointsMaterial({
        size: BAND_POINT_SIZES[band],
        sizeAttenuation: true,
        transparent: true,
        opacity: BAND_OPACITIES[band],
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

    for (let index = 0; index < 3; index += 1) {
      const firstColor = options.palette[index]!;
      const secondColor = options.palette[(index + 1) % options.palette.length]!;
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
              opacity: 0.14 - index * 0.025,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              toneMapped: false,
            });
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(options.extent.x * 1.45, options.extent.y * 1.35),
        material,
      );
      mesh.position.set((index - 1) * options.extent.x * 0.12, (1 - index) * 0.5, -7 - index * 2);
      mesh.rotation.z = (index - 1) * 0.32;
      mesh.renderOrder = -8 + index;
      this.group.add(mesh);
      this.nebulaLayers.push({
        mesh,
        material,
        baseOpacity: 0.14 - index * 0.025,
        texture,
      });
    }
    this.setParticleCount(this.particleCount);
    this.resize(options.extent.x / options.extent.y);
  }

  update(timeSeconds: number, energy: number, warmth: number): void {
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
        0.72,
        BAND_OPACITIES[index] * (0.86 + energy * 0.42),
      );
    });
    this.nebulaLayers.forEach((layer, index) => {
      layer.mesh.rotation.z = (index - 1) * 0.32 + Math.sin(timeSeconds * 0.018 + index) * 0.08;
      if (layer.material instanceof THREE.MeshBasicMaterial) {
        layer.material.opacity = Math.min(0.38, layer.baseOpacity + energy * 0.09 + warmth * 0.025);
      }
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
    if (!Number.isInteger(count) || count < 0 || count > this.maximumParticleCount) {
      throw new Error("Cinematic environment particle count is out of range");
    }
    this.particleCount = count;
    let remaining = count;
    this.particlePoints.forEach((points, index) => {
      const maximum = this.particleBuffers[index].length / 3;
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

  getParticleBuffers(): readonly [Float32Array, Float32Array, Float32Array] {
    return this.particleBuffers;
  }

  getStats(): { particles: number; depthBands: 3; nebulaVeils: 3 } {
    return { particles: this.particleCount, depthBands: 3, nebulaVeils: 3 };
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
    this.group.clear();
  }
}
