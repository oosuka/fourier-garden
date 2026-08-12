import { createSeededRandom } from "../../core/seed";
import type { QualityLevel } from "../../patterns/contracts";

export type CinematicChapterId = "residue-bloom" | "spectral-cathedral" | "mobius-choir";

export type CinematicEnvironmentLayout =
  | "chain"
  | "cathedral"
  | "constellation"
  | "ribbon"
  | "tidal"
  | "orchard"
  | "lanterns"
  | "rain"
  | "veil"
  | "torus"
  | "field";

export interface CinematicEnvironmentProfile {
  particlePalette: readonly [number, number, number];
  haloAspect: readonly [number, number];
  filamentPhase: number;
  layout: CinematicEnvironmentLayout;
}

export const CINEMATIC_PARTICLE_BUDGETS: Readonly<
  Record<CinematicChapterId, Readonly<Record<QualityLevel, number>>>
> = Object.freeze({
  "residue-bloom": Object.freeze({
    low: 14_000,
    medium: 32_000,
    high: 64_000,
    ultra: 96_000,
  }),
  "spectral-cathedral": Object.freeze({
    low: 16_000,
    medium: 44_000,
    high: 86_000,
    ultra: 128_000,
  }),
  "mobius-choir": Object.freeze({
    low: 16_000,
    medium: 42_000,
    high: 82_000,
    ultra: 112_000,
  }),
});

const CHAPTER_PALETTES: Readonly<Record<CinematicChapterId, readonly [number, number, number]>> = {
  "residue-bloom": [0x78f3ff, 0xa798ff, 0xffc782],
  "spectral-cathedral": [0x62eaff, 0xb678ff, 0xffb56e],
  "mobius-choir": [0x76efff, 0xa766ff, 0xffbd78],
};

export const CINEMATIC_ENVIRONMENT_PROFILES: Readonly<
  Record<CinematicChapterId, CinematicEnvironmentProfile>
> = Object.freeze({
  "residue-bloom": Object.freeze({
    particlePalette: CHAPTER_PALETTES["residue-bloom"],
    haloAspect: [1, 1] as const,
    filamentPhase: 2.4,
    layout: "chain",
  }),
  "spectral-cathedral": Object.freeze({
    particlePalette: CHAPTER_PALETTES["spectral-cathedral"],
    haloAspect: [0.42, 1.7] as const,
    filamentPhase: 0.25,
    layout: "cathedral",
  }),
  "mobius-choir": Object.freeze({
    particlePalette: CHAPTER_PALETTES["mobius-choir"],
    haloAspect: [1.38, 0.68] as const,
    filamentPhase: 1.45,
    layout: "ribbon",
  }),
});

const BAND_RANGES = [
  { spanX: 44, spanY: 27, minimumZ: -24, maximumZ: -10, minimumSize: 0.35, maximumSize: 0.8 },
  { spanX: 36, spanY: 22, minimumZ: -11, maximumZ: -2, minimumSize: 0.75, maximumSize: 1.45 },
  { spanX: 30, spanY: 17, minimumZ: -2, maximumZ: 4, minimumSize: 1.25, maximumSize: 2.65 },
] as const;

export interface CinematicParticleField {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly phases: Float32Array;
  readonly bands: Uint8Array;
}

function colorChannel(color: number, shift: number): number {
  return ((color >>> shift) & 0xff) / 255;
}

function getBand(index: number, count: number): 0 | 1 | 2 {
  const progress = index / Math.max(1, count);
  if (progress < 0.52) return 0;
  if (progress < 0.86) return 1;
  return 2;
}

export function createCinematicParticleField(
  seed: number,
  chapter: CinematicChapterId,
  count: number,
): CinematicParticleField {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Cinematic particle count must be a nonnegative integer");
  }
  const random = createSeededRandom(seed);
  const palette = CHAPTER_PALETTES[chapter];
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const bands = new Uint8Array(count);

  for (let index = 0; index < count; index += 1) {
    const band = getBand(index, count);
    const range = BAND_RANGES[band];
    const positionOffset = index * 3;
    const radialBias = 0.22 + 0.78 * random() ** 0.62;
    const streamPhase = random() * Math.PI * 2;
    const streamDepth = random() ** 0.72;
    const streamOffset = (band + 1) * 0.58;
    positions[positionOffset] =
      (random() - 0.5) * range.spanX * radialBias +
      Math.sin(streamPhase * 1.7 + streamOffset) * range.spanX * 0.12 * streamDepth;
    positions[positionOffset + 1] =
      (random() - 0.5) * range.spanY +
      Math.cos(streamPhase * 1.13 - streamOffset) * range.spanY * 0.08 * streamDepth;
    positions[positionOffset + 2] = range.minimumZ + random() * (range.maximumZ - range.minimumZ);

    const firstColorIndex = Math.floor(random() * palette.length);
    const secondColorIndex = (firstColorIndex + 1) % palette.length;
    const firstColor = palette[firstColorIndex]!;
    const secondColor = palette[secondColorIndex]!;
    const colorMix = random();
    const brightness = 0.14 + random() * 0.62;
    for (let channel = 0; channel < 3; channel += 1) {
      const shift = (2 - channel) * 8;
      const first = colorChannel(firstColor, shift);
      const second = colorChannel(secondColor, shift);
      colors[positionOffset + channel] = (first + (second - first) * colorMix) * brightness;
    }

    sizes[index] = range.minimumSize + random() * (range.maximumSize - range.minimumSize);
    phases[index] = random() * Math.PI * 2;
    bands[index] = band;
  }

  return { positions, colors, sizes, phases, bands };
}

export function createCinematicParticleFieldFromProfile(
  seed: number,
  profile: CinematicEnvironmentProfile,
  count: number,
): CinematicParticleField {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Cinematic particle count must be a nonnegative integer");
  }
  const random = createSeededRandom(seed);
  const palette = profile.particlePalette;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const bands = new Uint8Array(count);

  for (let index = 0; index < count; index += 1) {
    const band = getBand(index, count);
    const range = BAND_RANGES[band];
    const positionOffset = index * 3;
    const radialBias = 0.22 + 0.78 * random() ** 0.62;
    const streamPhase = random() * Math.PI * 2;
    const streamDepth = random() ** 0.72;
    const streamOffset = (band + 1) * 0.58;
    positions[positionOffset] =
      (random() - 0.5) * range.spanX * radialBias +
      Math.sin(streamPhase * 1.7 + streamOffset) * range.spanX * 0.12 * streamDepth;
    positions[positionOffset + 1] =
      (random() - 0.5) * range.spanY +
      Math.cos(streamPhase * 1.13 - streamOffset) * range.spanY * 0.08 * streamDepth;
    positions[positionOffset + 2] = range.minimumZ + random() * (range.maximumZ - range.minimumZ);

    const layoutPhase = streamPhase + profile.filamentPhase;
    const depthSpan = range.maximumZ - range.minimumZ;
    if (profile.layout === "constellation") {
      const radius = range.spanX * (0.13 + radialBias * 0.25);
      positions[positionOffset] =
        Math.sin(layoutPhase * (1.8 + band * 0.24)) * radius +
        Math.sin(layoutPhase * 4.1) * range.spanX * 0.035;
      positions[positionOffset + 1] =
        (random() - 0.5) * range.spanY + Math.cos(layoutPhase * 2.3) * range.spanY * 0.09;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.cos(layoutPhase * 1.7) * depthSpan * 0.08;
    } else if (profile.layout === "tidal") {
      const radius = range.spanY * (0.17 + radialBias * 0.27);
      positions[positionOffset] = Math.cos(layoutPhase) * radius * 1.52;
      positions[positionOffset + 1] = Math.sin(layoutPhase) * radius * 0.68;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.sin(layoutPhase * 3.1) * depthSpan * 0.1;
    } else if (profile.layout === "orchard") {
      const branch = (index % 7) - 3;
      positions[positionOffset] =
        branch * range.spanX * 0.075 +
        Math.sin(layoutPhase * (1.2 + (index % 3) * 0.2)) * range.spanX * 0.09;
      positions[positionOffset + 1] =
        (random() - 0.5) * range.spanY + Math.abs(Math.sin(layoutPhase * 0.7)) * range.spanY * 0.12;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.cos(layoutPhase * 2) * 0.8;
    } else if (profile.layout === "lanterns") {
      const lane = (index % 4) - 1.5;
      positions[positionOffset] =
        lane * range.spanX * 0.18 + Math.sin(layoutPhase * 2.7) * range.spanX * 0.035;
      positions[positionOffset + 1] = (random() - 0.5) * range.spanY;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.cos(layoutPhase) * depthSpan * 0.045;
    } else if (profile.layout === "rain") {
      const lane = ((index * 13) % 37) / 36 - 0.5;
      positions[positionOffset] =
        lane * range.spanX + Math.sin(layoutPhase * 3.2) * range.spanX * 0.018;
      positions[positionOffset + 1] = (random() - 0.5) * range.spanY;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.sin(layoutPhase * 0.6) * depthSpan * 0.035;
    } else if (profile.layout === "veil") {
      const sweep = positions[positionOffset]! / (range.spanX * 0.5);
      positions[positionOffset + 1] =
        Math.sin(sweep * Math.PI * (1.3 + band * 0.22) + layoutPhase) * range.spanY * 0.18 +
        (band - 1) * range.spanY * 0.08;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.cos(sweep * Math.PI * 2) * 0.65;
    } else if (profile.layout === "torus") {
      const minorAngle = layoutPhase * (2.2 + band * 0.19);
      const majorRadius = range.spanY * (0.24 + band * 0.035);
      const minorRadius = range.spanY * (0.045 + streamDepth * 0.08);
      positions[positionOffset] =
        Math.cos(layoutPhase) * (majorRadius + Math.cos(minorAngle) * minorRadius) * 1.45;
      positions[positionOffset + 1] =
        Math.sin(layoutPhase) * (majorRadius + Math.cos(minorAngle) * minorRadius) * 0.72;
      positions[positionOffset + 2] =
        range.minimumZ + streamDepth * depthSpan + Math.sin(minorAngle) * minorRadius;
    }

    const firstColorIndex = Math.floor(random() * palette.length);
    const secondColorIndex = (firstColorIndex + 1) % palette.length;
    const firstColor = palette[firstColorIndex]!;
    const secondColor = palette[secondColorIndex]!;
    const colorMix = random();
    const brightness = 0.14 + random() * 0.62;
    for (let channel = 0; channel < 3; channel += 1) {
      const shift = (2 - channel) * 8;
      const first = colorChannel(firstColor, shift);
      const second = colorChannel(secondColor, shift);
      colors[positionOffset + channel] = (first + (second - first) * colorMix) * brightness;
    }
    sizes[index] = range.minimumSize + random() * (range.maximumSize - range.minimumSize);
    phases[index] = random() * Math.PI * 2;
    bands[index] = band;
  }
  return { positions, colors, sizes, phases, bands };
}

export function getCinematicEnvironmentParticleCount(
  chapter: CinematicChapterId,
  quality: QualityLevel,
  localPoeticParticles: number,
): number {
  const total = CINEMATIC_PARTICLE_BUDGETS[chapter][quality];
  if (
    !Number.isInteger(localPoeticParticles) ||
    localPoeticParticles < 0 ||
    localPoeticParticles > total
  ) {
    throw new Error("Local poetic particle count exceeds the cinematic budget");
  }
  return total - localPoeticParticles;
}

export function getCinematicViewportSpan(aspect: number): { x: number; y: number; z: number } {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new Error("Cinematic aspect must be positive and finite");
  }
  return { x: Math.max(18, 11.5 * aspect), y: 13, z: 18 };
}
