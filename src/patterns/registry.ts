import { residueBloomPattern } from "./residueBloomPattern";
import { spectralCathedralPattern } from "./spectralCathedralPattern";
import type { PatternDefinition } from "./types";
import { validatePatternDefinition } from "./validatePatternDefinition";

validatePatternDefinition(residueBloomPattern);
validatePatternDefinition(spectralCathedralPattern);

export const patternRegistry: readonly PatternDefinition[] = Object.freeze([
  residueBloomPattern,
  spectralCathedralPattern,
]);

export const patternPreviewRegistry: readonly PatternDefinition[] = Object.freeze([
  ...patternRegistry,
]);

export function getPatternRegistry(search: string): readonly PatternDefinition[] {
  return new URLSearchParams(search).get("chapters") === "preview"
    ? patternPreviewRegistry
    : patternRegistry;
}
