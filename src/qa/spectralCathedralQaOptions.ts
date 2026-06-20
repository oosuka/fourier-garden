import { dateSeed } from "../core/seed";
import type { QualityLevel } from "../patterns/types";

export interface SpectralCathedralQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
  seed: number;
  poeticLayers: boolean;
}

function parseQuality(value: string | null): QualityLevel {
  if (value === "low" || value === "medium" || value === "high" || value === "ultra") {
    return value;
  }
  return "high";
}

function parseSeed(value: string | null, fallbackSeed: number): number {
  if (value === "qa") return 41_041;
  if (value === null || value.trim() === "") return Math.trunc(fallbackSeed) >>> 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) >>> 0 : Math.trunc(fallbackSeed) >>> 0;
}

export function parseSpectralCathedralQaOptions(
  search: string,
  fallbackSeed = dateSeed(),
): SpectralCathedralQaOptions {
  const parameters = new URLSearchParams(search);
  const requestedTime = Number(parameters.get("time"));
  return {
    forceWebGL: parameters.get("renderer") === "webgl",
    fixedTimeSeconds:
      Number.isFinite(requestedTime) && requestedTime >= 0 && parameters.has("time")
        ? requestedTime
        : null,
    quality: parseQuality(parameters.get("quality")),
    seed: parseSeed(parameters.get("seed"), fallbackSeed),
    poeticLayers: parameters.get("poetic") !== "off",
  };
}
