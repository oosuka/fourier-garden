import type { MusicalScoreFrame, MusicalSectionId } from "../audio/score";

export interface ResidueBloomVisualResponse {
  haloScale: number;
  haloOpacity: number;
  bloomBoost: number;
  membraneDisplacement: number;
  membraneOpacityBoost: number;
  flowEnergy: number;
  burstEnergy: number;
  warmth: number;
  sectionDensity: number;
  coronaStrength: number;
  spokeNodeOpacity: number;
  historyPulseOpacity: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function getSectionDensity(section: MusicalSectionId, sectionProgress: number): number {
  const progress = clamp(sectionProgress, 0, 1);
  if (section === "intro") return lerp(0.35, 0.45, progress);
  if (section === "growth") return lerp(0.45, 0.85, progress);
  if (section === "bloom") return lerp(0.85, 1, progress);
  if (section === "hush") return lerp(0.5, 0.25, progress);

  const returnDensity = lerp(0.4, 0.82, progress);
  if (progress < 7 / 8) return returnDensity;

  const finalBarProgress = clamp((progress - 7 / 8) * 8, 0, 1);
  const densityAtFinalBar = lerp(0.4, 0.82, 7 / 8);
  return lerp(densityAtFinalBar, 0.35, finalBarProgress);
}

export function getResidueBloomVisualResponse(
  frame: MusicalScoreFrame,
): ResidueBloomVisualResponse {
  const impact = clamp(frame.visualImpact, 0, 1.4);
  const phraseEmphasis = [1.12, 0.88, 0.92, 1][frame.event.phraseIndex]!;
  const emphasizedImpact = clamp(impact * phraseEmphasis, 0, 1.4);
  const tail = clamp(frame.visualTail, 0, 1);
  const phraseWarmth = [0.9, 0.12, 0.18, 0.62][frame.event.phraseIndex]!;
  const phasorWarmth = (frame.event.normalizedPhasorY + 1) * 0.5;

  return {
    haloScale: clamp(0.82 + emphasizedImpact * 0.56 + tail * 0.12, 0.82, 1.75),
    haloOpacity: clamp(0.08 + emphasizedImpact * 0.17 + tail * 0.04, 0.08, 0.34),
    bloomBoost: clamp(emphasizedImpact * 0.13 + tail * 0.04, 0, 0.22),
    membraneDisplacement: clamp(emphasizedImpact * 0.1 + tail * 0.035, 0, 0.18),
    membraneOpacityBoost: clamp(emphasizedImpact * 0.08 + tail * 0.025, 0, 0.13),
    flowEnergy: clamp(0.15 + emphasizedImpact * 0.45 + tail * 0.2, 0.15, 0.9),
    burstEnergy: clamp(emphasizedImpact * 0.9 + tail * 0.15, 0, 1.25),
    warmth: clamp(phraseWarmth * 0.7 + phasorWarmth * 0.3, 0, 1),
    sectionDensity: getSectionDensity(frame.event.section, frame.event.sectionProgress),
    coronaStrength: clamp(emphasizedImpact * 0.66 + tail * 0.12, 0, 0.82),
    spokeNodeOpacity: clamp(emphasizedImpact * 0.74 + tail * 0.1, 0, 0.88),
    historyPulseOpacity: clamp(emphasizedImpact * 0.78 + tail * 0.14, 0, 0.92),
  };
}
