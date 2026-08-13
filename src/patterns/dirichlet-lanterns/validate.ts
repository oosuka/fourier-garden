import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { DirichletLanternsPatternDefinition } from "./types";
export function validateDirichletLanternsPattern(
  pattern: DirichletLanternsPatternDefinition,
): void {
  validateAnalyticPikoPattern(pattern);
}
