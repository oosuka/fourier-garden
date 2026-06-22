import type { QualityLevel } from "../../contracts";

export interface ResidueBloomQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
  seed: number;
  poeticLayers: boolean;
}

export function parseResidueBloomQaOptions(
  search: string,
  fallbackSeed: number,
): ResidueBloomQaOptions {
  const query = new URLSearchParams(search);
  const parsedTime = Number(query.get("time"));
  const requestedQuality = query.get("quality");
  const requestedSeed = query.get("seed");
  return {
    forceWebGL: query.get("renderer") === "webgl",
    fixedTimeSeconds:
      query.has("time") && Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : null,
    quality:
      requestedQuality === "low" ||
      requestedQuality === "medium" ||
      requestedQuality === "high" ||
      requestedQuality === "ultra"
        ? requestedQuality
        : "high",
    seed:
      requestedSeed === "qa"
        ? 41_041
        : requestedSeed !== null &&
            requestedSeed.trim() !== "" &&
            Number.isFinite(Number(requestedSeed))
          ? Math.trunc(Number(requestedSeed)) >>> 0
          : Math.trunc(fallbackSeed) >>> 0,
    poeticLayers: query.get("poetic") !== "off",
  };
}
