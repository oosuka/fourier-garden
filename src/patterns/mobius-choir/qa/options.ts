import { dateSeed } from "../../../core/seed";
import type { QualityLevel } from "../../types";

export interface MobiusChoirQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
  seed: number;
  poeticLayers: boolean;
}

function parseQuality(value: string | null): QualityLevel {
  return value === "low" || value === "medium" || value === "high" || value === "ultra"
    ? value
    : "high";
}

function parseSeed(value: string | null, fallback: number): number {
  if (value === "qa") return 41_041;
  if (value === null || value.trim() === "") return Math.trunc(fallback) >>> 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) >>> 0 : Math.trunc(fallback) >>> 0;
}

export function parseMobiusChoirQaOptions(
  search: string,
  fallbackSeed = dateSeed(),
): MobiusChoirQaOptions {
  const parameters = new URLSearchParams(search);
  const requestedTime = Number(parameters.get("time"));
  return {
    forceWebGL: parameters.get("renderer") === "webgl",
    fixedTimeSeconds:
      parameters.has("time") && Number.isFinite(requestedTime) && requestedTime >= 0
        ? requestedTime
        : null,
    quality: parseQuality(parameters.get("quality")),
    seed: parseSeed(parameters.get("seed"), fallbackSeed),
    poeticLayers: parameters.get("poetic") !== "off",
  };
}
