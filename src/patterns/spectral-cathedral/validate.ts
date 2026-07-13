import { validateSpectralCathedralDefinition } from "./math/model";
import type { SpectralCathedralPatternDefinition } from "./types";

const FORBIDDEN_REPEAT_EVENT_FIELDS = [
  "normalizedPhasorX",
  "normalizedPhasorY",
  "normalizedPhasorRadius",
  "brightness",
  "accent",
  "absoluteTimeSeconds",
] as const;

export function validateSpectralCathedralPattern(
  pattern: SpectralCathedralPatternDefinition,
): void {
  validateSpectralCathedralDefinition(pattern.definition);
  if (pattern.mathematics.mathematicalTime.wrapsWithScore !== false) {
    throw new Error("Mathematical time must not wrap with score");
  }
  if (pattern.mathematics.fftUsed !== false) {
    throw new Error("Analytic eigenmode pattern cannot declare FFT use");
  }

  const modeIds = new Set(pattern.definition.modes.map((mode) => mode.id));
  for (const event of pattern.audio.score.events) {
    for (const modeId of event.modeIds) {
      if (!modeIds.has(modeId)) {
        throw new Error(`Spectral Cathedral score references unknown mode ${modeId}`);
      }
    }
    for (const field of FORBIDDEN_REPEAT_EVENT_FIELDS) {
      if (field in event) {
        throw new Error("Repeat event contains evaluated mathematical data");
      }
    }
  }

  const program = pattern.audio.createProgram();
  if (program.worklet.kind !== "spectral-cathedral") {
    throw new Error("Spectral Cathedral audio program kind is invalid");
  }
  if (program.worklet.modes.length !== pattern.definition.modes.length) {
    throw new Error("Spectral Cathedral audio modes differ from mathematical definition");
  }
}
