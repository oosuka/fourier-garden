import * as THREE from "three/webgpu";
import { float, length, mix, sin, smoothstep, uv, vec2, vec3 } from "three/tsl";

import type { RendererBackend } from "../../core/rendererBackend";
import { createSeededRandom } from "../../core/seed";
import type { CinematicEnvironmentLayout, CinematicEnvironmentProfile } from "./model";

export const BAND_ROTATION_SPEEDS = [0.0072, -0.0094, 0.0126] as const;
const BAND_POINT_SIZES = [0.028, 0.052, 0.09] as const;
const BAND_OPACITIES = [0.27, 0.22, 0.17] as const;
const NEBULA_TEXTURE_SIZE = 192;
export const NEBULA_VEIL_COUNT = 5;
export const FILAMENT_VEIL_COUNT = 6;
const FILAMENT_POINT_COUNT = 240;
export const RESONANCE_HALO_COUNT = 7;
const RESONANCE_HALO_POINTS = 160;
export const FLARE_COUNT = 9;
const FLARE_TEXTURE_SIZE = 64;
export const AURORA_VEIL_COUNT = 5;
export const AURORA_POINT_COUNT = 160;
export const LIGHT_PILLAR_COUNT = 11;
const LIGHT_PILLAR_TEXTURE_WIDTH = 24;
const LIGHT_PILLAR_TEXTURE_HEIGHT = 128;
export const LUMINANCE_WELL_COUNT = 4;
const GLOW_TEXTURE_SIZE = 96;
export const WEBGL_PARTICLE_CAP = 8_000;

export interface CinematicLayerArtDirection {
  nebula: number;
  filament: number;
  halo: number;
  flare: number;
  aurora: number;
  pillar: number;
  well: number;
}

export function getCinematicLayerArtDirection(
  layout: CinematicEnvironmentLayout,
): CinematicLayerArtDirection {
  if (layout === "constellation") {
    return {
      nebula: 0.56,
      filament: 0.42,
      halo: 1.34,
      flare: 1.34,
      aurora: 0.7,
      pillar: 0.12,
      well: 0.68,
    };
  }
  if (layout === "tidal") {
    return {
      nebula: 0.82,
      filament: 0.42,
      halo: 1.18,
      flare: 0.82,
      aurora: 1.2,
      pillar: 0.2,
      well: 1.22,
    };
  }
  if (layout === "orchard") {
    return {
      nebula: 1.08,
      filament: 1.24,
      halo: 0.66,
      flare: 1.18,
      aurora: 1.28,
      pillar: 0.28,
      well: 0.92,
    };
  }
  if (layout === "lanterns") {
    return {
      nebula: 0.72,
      filament: 0.52,
      halo: 0.48,
      flare: 0.92,
      aurora: 0.7,
      pillar: 1.3,
      well: 0.82,
    };
  }
  if (layout === "rain") {
    return {
      nebula: 0.68,
      filament: 0.24,
      halo: 0.42,
      flare: 0.82,
      aurora: 1.48,
      pillar: 0.52,
      well: 0.74,
    };
  }
  if (layout === "veil") {
    return {
      nebula: 1.12,
      filament: 1.38,
      halo: 0.72,
      flare: 0.68,
      aurora: 1.16,
      pillar: 0.08,
      well: 1.04,
    };
  }
  if (layout === "torus") {
    return {
      nebula: 0.72,
      filament: 0.3,
      halo: 1.42,
      flare: 0.88,
      aurora: 1.08,
      pillar: 0.08,
      well: 1.36,
    };
  }
  return { nebula: 1, filament: 1, halo: 1, flare: 1, aurora: 1, pillar: 1, well: 1 };
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

export function splitBand<T extends Float32Array | Uint8Array>(
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

function colorChannels(color: number): readonly [number, number, number] {
  return [((color >>> 16) & 0xff) / 255, ((color >>> 8) & 0xff) / 255, (color & 0xff) / 255];
}

export function createNebulaTexture(
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

export function createWebGpuNebulaMaterial(
  firstColor: number,
  secondColor: number,
  phase: number,
  time: THREE.UniformNode<"float", number>,
  energy: THREE.UniformNode<"float", number>,
  warmth: THREE.UniformNode<"float", number>,
  opacityScale: number,
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
  material.opacityNode = cloud
    .mul(rings.mul(0.003).add(0.0015).add(energy.mul(0.0045)))
    .mul(float(opacityScale));
  return material;
}

function createTexture(
  width: number,
  height: number,
  alphaAt: (x: number, y: number) => number,
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const offset = (row * width + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alphaAt(column / (width - 1), row / (height - 1)) * 255);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createFlareTexture(): THREE.DataTexture {
  return createTexture(FLARE_TEXTURE_SIZE, FLARE_TEXTURE_SIZE, (column, row) => {
    const x = (column - 0.5) * 2;
    const y = (row - 0.5) * 2;
    const radial = Math.hypot(x, y);
    const core = Math.max(0, 1 - radial) ** 3.2;
    const ray =
      Math.max(0, 1 - Math.abs(x) * 9) * Math.max(0, 1 - Math.abs(y) * 1.4) +
      Math.max(0, 1 - Math.abs(y) * 9) * Math.max(0, 1 - Math.abs(x) * 1.4);
    return Math.min(1, core + ray * 0.32);
  });
}

export function createLightPillarTexture(): THREE.DataTexture {
  return createTexture(LIGHT_PILLAR_TEXTURE_WIDTH, LIGHT_PILLAR_TEXTURE_HEIGHT, (column, row) => {
    const x = Math.abs(column - 0.5) * 2;
    const core = Math.max(0, 1 - x) ** 3.8;
    const verticalEnvelope = Math.sin(Math.PI * row) ** 0.48;
    return core * verticalEnvelope;
  });
}

export function createGlowTexture(): THREE.DataTexture {
  return createTexture(GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE, (column, row) => {
    const x = (column - 0.5) * 2;
    const y = (row - 0.5) * 2;
    return Math.max(0, 1 - Math.hypot(x, y)) ** 2.6;
  });
}

export function createAuroraGeometry(): {
  geometry: THREE.BufferGeometry;
  attribute: THREE.BufferAttribute;
  positions: Float32Array;
} {
  const positions = new Float32Array(AURORA_POINT_COUNT * 2 * 3);
  const indices = new Uint16Array((AURORA_POINT_COUNT - 1) * 6);
  for (let index = 0; index < AURORA_POINT_COUNT - 1; index += 1) {
    const vertex = index * 2;
    const offset = index * 6;
    indices[offset] = vertex;
    indices[offset + 1] = vertex + 2;
    indices[offset + 2] = vertex + 1;
    indices[offset + 3] = vertex + 1;
    indices[offset + 4] = vertex + 2;
    indices[offset + 5] = vertex + 3;
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return { geometry, attribute, positions };
}

export function getPillarPlacement(
  profile: CinematicEnvironmentProfile,
  index: number,
  extent: Readonly<{ x: number; y: number; z: number }>,
): Readonly<{
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}> {
  const lane = (index / Math.max(1, LIGHT_PILLAR_COUNT - 1)) * 2 - 1;
  const stagger = ((index * 5) % LIGHT_PILLAR_COUNT) / LIGHT_PILLAR_COUNT;
  if (profile.layout === "cathedral") {
    return {
      x: lane * extent.x * 0.43,
      y: -extent.y * 0.08 + Math.abs(lane) * extent.y * 0.06,
      z: -3.5 - (index % 3) * 1.1,
      width: 0.2 + (index % 3) * 0.05,
      height: extent.y * (0.55 + (1 - Math.abs(lane)) * 0.38),
      rotation: 0,
      opacity: 0.14,
    };
  }
  if (profile.layout === "rain") {
    return {
      x: lane * extent.x * 0.48,
      y: (stagger - 0.5) * extent.y * 0.2,
      z: -3.8 - (index % 4) * 0.8,
      width: 0.13 + (index % 2) * 0.04,
      height: extent.y * (0.44 + stagger * 0.36),
      rotation: Math.sin(index * 1.7) * 0.03,
      opacity: 0.12,
    };
  }
  if (profile.layout === "lanterns") {
    return {
      x: lane * extent.x * 0.42,
      y: -extent.y * 0.08 + Math.sin(index * 1.4) * extent.y * 0.12,
      z: -3.2 - (index % 3) * 1.2,
      width: 0.18 + (index % 3) * 0.04,
      height: extent.y * (0.38 + (index % 4) * 0.08),
      rotation: Math.sin(index * 2.2) * 0.05,
      opacity: 0.13,
    };
  }
  if (profile.layout === "torus" || profile.layout === "tidal") {
    const angle = (index / LIGHT_PILLAR_COUNT) * Math.PI * 2;
    return {
      x: Math.cos(angle) * extent.y * 0.36,
      y: Math.sin(angle) * extent.y * 0.24,
      z: -4.2 - (index % 3) * 0.7,
      width: 0.15,
      height: extent.y * (0.3 + stagger * 0.24),
      rotation: -angle + Math.PI / 2,
      opacity: 0.085,
    };
  }
  return {
    x: lane * extent.x * 0.44,
    y: Math.sin(index * 1.63 + profile.filamentPhase) * extent.y * 0.18,
    z: -3.6 - (index % 4) * 0.85,
    width: 0.15 + (index % 3) * 0.04,
    height: extent.y * (0.28 + stagger * 0.28),
    rotation: Math.sin(index * 0.91 + profile.filamentPhase) * 0.09,
    opacity: 0.08,
  };
}

export function createResonanceHaloGeometry(
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

export function createFilamentGeometry(
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

export function assertBounded(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be finite and between zero and one`);
  }
}
