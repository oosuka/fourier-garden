import { besselTidePattern } from "./bessel-tide/definition";
import { dirichletLanternsPattern } from "./dirichlet-lanterns/definition";
import { lissajousOrchardPattern } from "./lissajous-orchard/definition";
import { mobiusChoirPattern } from "./mobius-choir/definition";
import { phaseTorusPattern } from "./phase-torus/definition";
import { primeConstellationPattern } from "./prime-constellation/definition";
import { residueBloomPattern } from "./residue-bloom/definition";
import { riemannVeilPattern } from "./riemann-veil/definition";
import { spectralCathedralPattern } from "./spectral-cathedral/definition";
import { waveletRainPattern } from "./wavelet-rain/definition";
import type { PatternDefinition } from "./contracts";
import { validatePatternDefinition } from "./validatePatternDefinition";

export function validatePatternRegistry(patterns: readonly PatternDefinition[]): void {
  const ids = new Set<string>();
  const kinds = new Set<string>();
  const orders = new Set<number>();
  let previousOrder = Number.NEGATIVE_INFINITY;

  for (const pattern of patterns) {
    if (pattern.publication !== "published" && pattern.publication !== "preview") {
      throw new Error(`Invalid pattern publication: ${String(pattern.publication)}`);
    }
    if (ids.has(pattern.id)) throw new Error(`Duplicate pattern id: ${pattern.id}`);
    if (kinds.has(pattern.kind)) throw new Error(`Duplicate pattern kind: ${pattern.kind}`);
    if (orders.has(pattern.order)) throw new Error(`Duplicate pattern order: ${pattern.order}`);
    if (pattern.order <= previousOrder) {
      throw new Error("Pattern registry must follow ascending chapter order");
    }

    ids.add(pattern.id);
    kinds.add(pattern.kind);
    orders.add(pattern.order);
    previousOrder = pattern.order;
  }

  for (let index = 1; index < patterns.length; index += 1) {
    const previous = patterns[index - 1]!.contrastProfile;
    const current = patterns[index]!.contrastProfile;
    const axes = ["composition", "motion", "space", "palette", "timbre", "rhythm", "time"] as const;
    const differentAxes = axes.filter((axis) => previous[axis] !== current[axis]);
    if (differentAxes.length < 5) {
      throw new Error("Adjacent patterns must differ on at least five expressive axes");
    }
    for (const required of ["composition", "motion", "palette", "timbre", "rhythm"] as const) {
      if (previous[required] === current[required]) {
        throw new Error(`Adjacent patterns must differ in ${required}`);
      }
    }
    const audioKeys = [
      "onsetPattern",
      "articulation",
      "pitchMapping",
      "spatialGesture",
      "wetCharacter",
    ] as const;
    if (audioKeys.filter((key) => previous.audio[key] !== current.audio[key]).length < 3) {
      throw new Error("Adjacent patterns must differ on at least three audio identity axes");
    }
  }
}

const registeredPatterns: readonly PatternDefinition[] = Object.freeze([
  residueBloomPattern,
  spectralCathedralPattern,
  primeConstellationPattern,
  mobiusChoirPattern,
  besselTidePattern,
  lissajousOrchardPattern,
  dirichletLanternsPattern,
  waveletRainPattern,
  riemannVeilPattern,
  phaseTorusPattern,
]);

for (const pattern of registeredPatterns) validatePatternDefinition(pattern);
validatePatternRegistry(registeredPatterns);

export const patternRegistry: readonly PatternDefinition[] = Object.freeze(
  registeredPatterns
    .filter((pattern) => pattern.publication === "published")
    .map((pattern, index) =>
      pattern.order === index + 1 ? pattern : Object.freeze({ ...pattern, order: index + 1 }),
    ),
);
validatePatternRegistry(patternRegistry);

export const patternPreviewRegistry: readonly PatternDefinition[] = registeredPatterns;

export function getPatternRegistry(search: string): readonly PatternDefinition[] {
  return new URLSearchParams(search).get("chapters") === "preview"
    ? patternPreviewRegistry
    : patternRegistry;
}
