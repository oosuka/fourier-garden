import { mobiusChoirPattern } from "./mobius-choir/definition";
import { residueBloomPattern } from "./residue-bloom/definition";
import { spectralCathedralPattern } from "./spectral-cathedral/definition";
import type { PatternDefinition } from "./contracts";
import { validatePatternDefinition } from "./validatePatternDefinition";

validatePatternDefinition(residueBloomPattern);
validatePatternDefinition(spectralCathedralPattern);
validatePatternDefinition(mobiusChoirPattern);

export const patternRegistry: readonly PatternDefinition[] = Object.freeze([
  residueBloomPattern,
  spectralCathedralPattern,
  mobiusChoirPattern,
]);

export const patternPreviewRegistry: readonly PatternDefinition[] = Object.freeze([
  ...patternRegistry,
]);

export function getPatternRegistry(search: string): readonly PatternDefinition[] {
  return new URLSearchParams(search).get("chapters") === "preview"
    ? patternPreviewRegistry
    : patternRegistry;
}
