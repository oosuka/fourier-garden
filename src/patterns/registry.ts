import { mobiusChoirPattern } from "./mobius-choir/definition";
import { residueBloomPattern } from "./residue-bloom/definition";
import { spectralCathedralPattern } from "./spectral-cathedral/definition";
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
}

const registeredPatterns: readonly PatternDefinition[] = Object.freeze([
  residueBloomPattern,
  spectralCathedralPattern,
  mobiusChoirPattern,
]);

for (const pattern of registeredPatterns) validatePatternDefinition(pattern);
validatePatternRegistry(registeredPatterns);

export const patternRegistry: readonly PatternDefinition[] = Object.freeze(
  registeredPatterns.filter((pattern) => pattern.publication === "published"),
);

export const patternPreviewRegistry: readonly PatternDefinition[] = registeredPatterns;

export function getPatternRegistry(search: string): readonly PatternDefinition[] {
  return new URLSearchParams(search).get("chapters") === "preview"
    ? patternPreviewRegistry
    : patternRegistry;
}
