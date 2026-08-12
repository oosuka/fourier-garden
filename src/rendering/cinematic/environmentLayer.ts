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
  type CinematicEnvironmentLayout,
  type CinematicEnvironmentProfile,
} from "./model";

const BAND_ROTATION_SPEEDS = [0.0072, -0.0094, 0.0126] as const;
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
const AURORA_VEIL_COUNT = 5;
const AURORA_POINT_COUNT = 160;
const LIGHT_PILLAR_COUNT = 11;
const LIGHT_PILLAR_TEXTURE_WIDTH = 24;
const LIGHT_PILLAR_TEXTURE_HEIGHT = 128;
const LUMINANCE_WELL_COUNT = 4;
const GLOW_TEXTURE_SIZE = 96;
const WEBGL_PARTICLE_CAP = 8_000;

interface CinematicLayerArtDirection {
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

interface AuroraVeil {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  material: THREE.MeshBasicMaterial;
  attribute: THREE.BufferAttribute;
  positions: Float32Array;
  phase: number;
  index: number;
  baseOpacity: number;
  baseWidth: number;
}

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

function createLightPillarTexture(): THREE.DataTexture {
  const data = new Uint8Array(LIGHT_PILLAR_TEXTURE_WIDTH * LIGHT_PILLAR_TEXTURE_HEIGHT * 4);
  for (let row = 0; row < LIGHT_PILLAR_TEXTURE_HEIGHT; row += 1) {
    for (let column = 0; column < LIGHT_PILLAR_TEXTURE_WIDTH; column += 1) {
      const x = Math.abs(column / (LIGHT_PILLAR_TEXTURE_WIDTH - 1) - 0.5) * 2;
      const y = row / (LIGHT_PILLAR_TEXTURE_HEIGHT - 1);
      const core = Math.max(0, 1 - x) ** 3.8;
      const verticalEnvelope = Math.sin(Math.PI * y) ** 0.48;
      const alpha = core * verticalEnvelope;
      const offset = (row * LIGHT_PILLAR_TEXTURE_WIDTH + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    LIGHT_PILLAR_TEXTURE_WIDTH,
    LIGHT_PILLAR_TEXTURE_HEIGHT,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createGlowTexture(): THREE.DataTexture {
  const data = new Uint8Array(GLOW_TEXTURE_SIZE * GLOW_TEXTURE_SIZE * 4);
  for (let row = 0; row < GLOW_TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < GLOW_TEXTURE_SIZE; column += 1) {
      const x = (column / (GLOW_TEXTURE_SIZE - 1) - 0.5) * 2;
      const y = (row / (GLOW_TEXTURE_SIZE - 1) - 0.5) * 2;
      const radius = Math.hypot(x, y);
      const alpha = Math.max(0, 1 - radius) ** 2.6;
      const offset = (row * GLOW_TEXTURE_SIZE + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(
    data,
    GLOW_TEXTURE_SIZE,
    GLOW_TEXTURE_SIZE,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createAuroraGeometry(): {
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

function getPillarPlacement(
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
  private readonly profile: CinematicEnvironmentProfile;
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
  private readonly auroraVeils: AuroraVeil[] = [];
  private readonly lightPillars: LightPillar[] = [];
  private readonly luminanceWells: LuminanceWell[] = [];
  private readonly flareTexture = createFlareTexture();
  private readonly pillarTexture = createLightPillarTexture();
  private readonly glowTexture = createGlowTexture();
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
    this.profile = profile;
    const artDirection = getCinematicLayerArtDirection(profile.layout);
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
      const baseOpacity = (0.03 - index * 0.0035) * artDirection.nebula;
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
              artDirection.nebula,
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
        opacity: 0.1,
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
        baseOpacity: (0.068 + index * 0.007) * artDirection.filament,
        phase: index * 0.9 + options.seed * 0.0001,
      });
    }

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
      this.group.add(line);
      this.resonanceHalos.push({
        line,
        material,
        baseOpacity: (0.04 + index * 0.006) * artDirection.halo,
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
      this.group.add(sprite);
      this.flares.push({
        sprite,
        material,
        baseScale,
        baseY: chapterY,
        baseOpacity: (0.13 + (index % 3) * 0.04) * artDirection.flare,
        phase: index * 1.73 + options.seed * 0.00017,
      });
    }

    for (let index = 0; index < AURORA_VEIL_COUNT; index += 1) {
      const { geometry, attribute, positions } = createAuroraGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = -2 + index;
      this.group.add(mesh);
      this.auroraVeils.push({
        mesh,
        material,
        attribute,
        positions,
        phase: profile.filamentPhase + index * 1.27 + options.seed * 0.00011,
        index,
        baseOpacity: (0.004 + index * 0.0015) * artDirection.aurora,
        baseWidth: 0.012 + index * 0.006,
      });
    }

    for (let index = 0; index < LIGHT_PILLAR_COUNT; index += 1) {
      const placement = getPillarPlacement(profile, index, options.extent);
      const material = new THREE.SpriteMaterial({
        map: this.pillarTexture,
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: placement.opacity * artDirection.pillar,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        rotation: placement.rotation,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(placement.x, placement.y, placement.z);
      sprite.scale.set(placement.width, placement.height, 1);
      sprite.renderOrder = 1 + index;
      this.group.add(sprite);
      this.lightPillars.push({
        sprite,
        material,
        baseX: placement.x,
        baseY: placement.y,
        baseWidth: placement.width,
        baseHeight: placement.height,
        baseOpacity: placement.opacity * artDirection.pillar,
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
      this.group.add(sprite);
      this.luminanceWells.push({
        sprite,
        material,
        baseX,
        baseY,
        baseScale,
        baseOpacity: (0.006 + index * 0.002) * artDirection.well,
        phase: angle + options.seed * 0.00007,
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
        Math.sin(timeSeconds * (0.029 + index * 0.008) + index) * (0.32 + index * 0.18);
      points.position.y =
        Math.cos(timeSeconds * (0.024 + index * 0.007) + index) * (0.22 + index * 0.13);
      this.particleMaterials[index].opacity = Math.min(
        0.65,
        this.particleBaseOpacities[index]! * (0.92 + energy * 0.82),
      );
    });
    this.nebulaLayers.forEach((layer, index) => {
      const rotationZ = (index - 2) * 0.24 + Math.sin(timeSeconds * 0.036 + index) * 0.16;
      if (camera) {
        layer.mesh.quaternion.copy(camera.quaternion);
        layer.mesh.rotateZ(rotationZ);
      } else {
        layer.mesh.rotation.set(0, 0, rotationZ);
      }
      const breath = 1 + Math.sin(timeSeconds * (0.041 + index * 0.006) + index) * 0.035;
      layer.mesh.scale.set(breath * (1 + energy * 0.035), breath, 1);
      layer.mesh.position.x =
        (index - 2) * this.extent.x * 0.1 + Math.sin(timeSeconds * 0.027 + index) * 0.58;
      layer.mesh.position.y = (2 - index) * 0.42 + Math.cos(timeSeconds * 0.031 - index) * 0.34;
      if (layer.material instanceof THREE.MeshBasicMaterial) {
        layer.material.opacity = Math.min(0.1, layer.baseOpacity + energy * 0.026 + warmth * 0.01);
      }
    });
    this.filamentVeils.forEach((veil, index) => {
      veil.line.position.x = Math.sin(timeSeconds * (0.044 + index * 0.006) + veil.phase) * 0.82;
      veil.line.position.y = Math.cos(timeSeconds * (0.036 + index * 0.005) - veil.phase) * 0.54;
      veil.line.rotation.z = Math.sin(timeSeconds * 0.028 + veil.phase) * 0.075;
      veil.material.opacity = Math.min(
        0.22,
        veil.baseOpacity * (0.92 + energy * 1.35 + warmth * 0.36),
      );
    });
    this.resonanceHalos.forEach((halo, index) => {
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
    this.auroraVeils.forEach((veil) => {
      this.updateAuroraVeil(veil, timeSeconds, energy);
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.31 + veil.index * 0.027) + veil.phase);
      veil.material.opacity = Math.min(
        0.035,
        veil.baseOpacity * (0.72 + pulse * 0.6 + energy * 1.3 + warmth * 0.2),
      );
    });
    this.lightPillars.forEach((pillar, index) => {
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
    this.luminanceWells.forEach((well, index) => {
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

  private updateAuroraVeil(veil: AuroraVeil, timeSeconds: number, energy: number): void {
    const positions = veil.positions;
    const layout = this.profile.layout;
    const motionTime = timeSeconds * (0.12 + veil.index * 0.012) + veil.phase;
    const width = veil.baseWidth * (0.88 + energy * 0.55);
    for (let pointIndex = 0; pointIndex < AURORA_POINT_COUNT; pointIndex += 1) {
      const progress = pointIndex / (AURORA_POINT_COUNT - 1);
      const sweep = progress * 2 - 1;
      const angle = progress * Math.PI * 2;
      let centerX = sweep * this.extent.x * 0.62;
      let centerY = 0;
      let centerZ = -4.2 - veil.index * 0.62;

      if (layout === "cathedral") {
        const arch = (1 - Math.abs(sweep) ** 1.65) * this.extent.y;
        centerY =
          -this.extent.y * 0.34 +
          arch * (0.72 - veil.index * 0.035) +
          Math.sin(angle * 1.5 + motionTime) * 0.16;
        centerZ += Math.cos(angle + motionTime) * 0.34;
      } else if (layout === "chain") {
        centerX -= this.extent.x * 0.08;
        centerY =
          Math.sin(sweep * Math.PI * (1.15 + veil.index * 0.08) + motionTime) *
          this.extent.y *
          (0.13 + veil.index * 0.008);
        centerZ += Math.cos(angle * 1.7 - motionTime) * 0.52;
      } else if (layout === "constellation") {
        centerY =
          Math.sin(sweep * Math.PI * (1.8 + veil.index * 0.13) + motionTime) *
            this.extent.y *
            0.26 +
          sweep * this.extent.y * 0.08;
        centerZ += Math.cos(angle * 2.1 + motionTime) * 0.72;
      } else if (layout === "ribbon") {
        centerY =
          Math.sin(sweep * Math.PI * (1.4 + veil.index * 0.16) + motionTime) *
          this.extent.y *
          (0.2 + veil.index * 0.014);
        centerZ += Math.cos(sweep * Math.PI * 2.2 - motionTime) * 0.9;
      } else if (layout === "tidal") {
        const radius =
          this.extent.y * (0.26 + veil.index * 0.025) +
          Math.sin(angle * (2 + (veil.index % 3)) - motionTime) * 0.52;
        centerX = Math.cos(angle) * radius * 1.34;
        centerY = Math.sin(angle) * radius * 0.72;
        centerZ += Math.sin(angle * 3 - motionTime) * 0.72;
      } else if (layout === "orchard") {
        const petal = 1 + Math.sin(angle * (3 + veil.index) - motionTime) * 0.24;
        const radius = this.extent.y * (0.29 + veil.index * 0.022) * petal;
        centerX = Math.cos(angle + veil.index * 0.12) * radius * 1.2;
        centerY = Math.sin(angle) * radius * 0.82;
        centerZ += Math.cos(angle * 2 + motionTime) * 0.66;
      } else if (layout === "lanterns") {
        const peak = Math.exp(-(sweep * sweep) * (7.2 + veil.index * 0.9));
        centerY =
          -this.extent.y * 0.3 +
          peak * this.extent.y * (0.67 - veil.index * 0.035) +
          Math.sin(angle * (1.3 + veil.index * 0.08) + motionTime) * 0.38;
        centerZ += Math.cos(angle - motionTime) * 0.44;
      } else if (layout === "rain") {
        centerX =
          (veil.index - (AURORA_VEIL_COUNT - 1) / 2) * this.extent.x * 0.19 +
          Math.sin(progress * Math.PI * (3 + veil.index) + motionTime) * 0.54;
        centerY = this.extent.y * (0.56 - progress * 1.12);
        centerZ += Math.cos(progress * Math.PI * 4 - motionTime) * 0.58;
      } else if (layout === "veil") {
        centerY =
          Math.sin(sweep * Math.PI * (1.2 + veil.index * 0.22) + motionTime) *
            this.extent.y *
            (0.17 + veil.index * 0.014) +
          Math.cos(sweep * Math.PI * 3.4 - motionTime) * 0.56;
        centerZ += Math.sin(angle * 1.7 + motionTime) * 0.78;
      } else if (layout === "torus") {
        const radius = this.extent.y * (0.25 + veil.index * 0.028);
        centerX = Math.cos(angle) * radius * 1.48;
        centerY = Math.sin(angle) * radius * 0.74;
        centerZ += Math.sin(angle * 2 + motionTime) * 0.82;
      } else {
        centerY =
          Math.sin(sweep * Math.PI * (1.25 + veil.index * 0.14) + motionTime) *
          this.extent.y *
          (0.18 + veil.index * 0.01);
        centerZ += Math.cos(angle * 1.6 - motionTime) * 0.58;
      }

      const sideX = layout === "rain" ? width : Math.sin(angle + veil.phase) * width * 0.16;
      const sideY = layout === "rain" ? 0 : width;
      const firstOffset = pointIndex * 6;
      positions[firstOffset] = centerX - sideX;
      positions[firstOffset + 1] = centerY - sideY;
      positions[firstOffset + 2] = centerZ;
      positions[firstOffset + 3] = centerX + sideX;
      positions[firstOffset + 4] = centerY + sideY;
      positions[firstOffset + 5] = centerZ + 0.025;
    }
    veil.attribute.needsUpdate = true;
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
    this.auroraVeils.forEach((veil) => {
      veil.mesh.geometry.dispose();
      veil.material.dispose();
    });
    this.lightPillars.forEach((pillar) => pillar.material.dispose());
    this.luminanceWells.forEach((well) => well.material.dispose());
    this.flareTexture.dispose();
    this.pillarTexture.dispose();
    this.glowTexture.dispose();
    this.group.clear();
  }
}
