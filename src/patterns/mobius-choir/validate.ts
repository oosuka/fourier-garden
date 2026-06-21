import { validateMobiusChoirDefinition } from "./math/model";
import type { MobiusChoirPatternDefinition } from "./types";

const FORBIDDEN_REPEAT_EVENT_FIELDS = [
  "normalizedPhasorX",
  "normalizedPhasorY",
  "normalizedPhasorRadius",
  "brightness",
  "accent",
  "absoluteTimeSeconds",
] as const;

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-12;
}

export function validateMobiusChoirPattern(pattern: MobiusChoirPatternDefinition): void {
  validateMobiusChoirDefinition(pattern.definition);
  if (pattern.mathematics.mathematicalTime.wrapsWithScore !== false) {
    throw new Error("Mathematical time must not wrap with score");
  }
  if (
    pattern.mathematics.fftUsed !== false ||
    pattern.mathematics.numericalEigenanalysisUsed !== false
  ) {
    throw new Error("Analytic Möbius eigenmode pattern cannot use FFT or numerical eigenanalysis");
  }
  if (
    !sameNumber(
      pattern.mathematics.mathematicalTime.waveTimeScale,
      pattern.definition.waveTimeScale,
    )
  ) {
    throw new Error("Möbius Choir mathematical time scale differs from its definition");
  }

  const modesById = new Map(pattern.definition.modes.map((mode) => [mode.id, mode]));
  for (const event of pattern.audio.score.events) {
    for (const modeId of event.modeIds) {
      if (!modesById.has(modeId)) {
        throw new Error(`Möbius Choir score references unknown mode ${modeId}`);
      }
    }
    for (const field of FORBIDDEN_REPEAT_EVENT_FIELDS) {
      if (field in event) {
        throw new Error("Repeat event contains evaluated mathematical data");
      }
    }
  }

  const program = pattern.audio.createProgram();
  if (program.worklet.kind !== "mobius-choir") {
    throw new Error("Möbius Choir audio program kind is invalid");
  }
  if (program.worklet.modes.length !== pattern.definition.modes.length) {
    throw new Error("Möbius Choir audio modes differ from mathematical definition");
  }
  for (const [index, audioMode] of program.worklet.modes.entries()) {
    const mathematicalMode = pattern.definition.modes[index];
    if (
      !mathematicalMode ||
      audioMode.id !== mathematicalMode.id ||
      audioMode.m !== mathematicalMode.m ||
      audioMode.n !== mathematicalMode.n ||
      audioMode.eigenvalue !== mathematicalMode.eigenvalue ||
      audioMode.voiceKind !== mathematicalMode.voiceKind ||
      !sameNumber(audioMode.coefficient, mathematicalMode.coefficient)
    ) {
      throw new Error("Möbius Choir audio mode provenance differs from mathematics");
    }
  }
}
