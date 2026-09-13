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
  coronaContact: number;
  spokeNodeOpacity: number;
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
  const emphasizedImpact = impact;
  const tail = clamp(frame.visualTail, 0, 1);
  const phraseWarmth = [0.9, 0.12, 0.18, 0.62][frame.event.phraseIndex]!;
  const phasorWarmth = (frame.event.normalizedPhasorY + 1) * 0.5;
  let totalImpact = 0;
  let totalContact = 0;
  for (const impulse of frame.recentImpulses) {
    totalImpact += impulse.impact;
    totalContact += impulse.impact * impulse.contact;
  }

  return {
    haloScale: clamp(0.8 + emphasizedImpact * 0.75 + tail * 0.15, 0.8, 2.05),
    haloOpacity: clamp(0.09 + emphasizedImpact * 0.26 + tail * 0.055, 0.09, 0.5),
    bloomBoost: clamp(emphasizedImpact * 0.21 + tail * 0.06, 0, 0.34),
    membraneDisplacement: clamp(emphasizedImpact * 0.13 + tail * 0.045, 0, 0.23),
    membraneOpacityBoost: clamp(emphasizedImpact * 0.12 + tail * 0.035, 0, 0.19),
    flowEnergy: clamp(0.18 + emphasizedImpact * 0.58 + tail * 0.24, 0.18, 1),
    burstEnergy: clamp(emphasizedImpact * 1.08 + tail * 0.2, 0, 1.45),
    warmth: clamp(phraseWarmth * 0.7 + phasorWarmth * 0.3, 0, 1),
    sectionDensity: getSectionDensity(frame.event.section, frame.event.sectionProgress),
    coronaStrength: clamp(impact * 0.84, 0, 1),
    coronaContact: totalImpact > 0 ? totalContact / totalImpact : 0,
    spokeNodeOpacity: clamp(impact * 0.92, 0, 1),
  };
}
