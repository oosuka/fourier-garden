import type { PikoWorkletProgram } from "../audio/pikoProgram";
import type { PatternDefinition, PatternDramaturgySection } from "./contracts";

export function createFiveActSections(
  cycleSeconds: number,
  acts: readonly Readonly<{
    id: string;
    endSeconds: number;
    audioEnergy: number;
    visualEnergy: number;
    motionEnergy: number;
  }>[],
): readonly PatternDramaturgySection[] {
  let startSeconds = 0;
  return acts.map((act) => {
    const section = {
      id: act.id,
      startRatio: startSeconds / cycleSeconds,
      endRatio: act.endSeconds / cycleSeconds,
      audioEnergy: act.audioEnergy,
      visualEnergy: act.visualEnergy,
      motionEnergy: act.motionEnergy,
    };
    startSeconds = act.endSeconds;
    return section;
  });
}

export function validateAnalyticPikoPattern(pattern: PatternDefinition): void {
  const program = pattern.audio.createProgram().worklet as PikoWorkletProgram;
  if (
    program.kind !== pattern.kind ||
    program.score.cycleSeconds !== pattern.audio.score.cycleSeconds
  ) {
    throw new Error("Analytic chapter audio program must match its pattern identity and cycle");
  }
  if (program.score.events.length < 64) {
    throw new Error("Analytic chapter score must sustain a finite piko continuum");
  }
  if (program.score.events.some((event) => event.frequencyHz < 360 || event.frequencyHz > 1_200)) {
    throw new Error("Analytic chapter piko carriers must remain in the approved midrange");
  }
}
