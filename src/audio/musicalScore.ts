import { evaluateEpicycle, type FourierSeriesDefinition } from "../math/fourier";

export type MusicalSectionId = "intro" | "growth" | "bloom" | "hush" | "return";

export interface MusicalSectionDefinition {
  id: MusicalSectionId;
  startBar: number;
  barCount: number;
}

export interface MusicalScoreDefinition {
  bpm: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  totalBars: number;
  carrierMultipliers: readonly [number, number, number, number];
  attackSeconds: number;
  decaySeconds: number;
  releaseSeconds: number;
  antiAliasRatio: number;
  timbreDamping: number;
  outputGain: number;
  sections: readonly MusicalSectionDefinition[];
}

export interface MusicalScoreEvent {
  globalStep: number;
  barIndex: number;
  stepInBar: number;
  section: MusicalSectionId;
  sectionProgress: number;
  active: boolean;
  activeNoteOrdinal: number;
  phraseIndex: 0 | 1 | 2 | 3;
  carrierHz: number;
  gain: number;
  accent: number;
  brightness: number;
  wetSend: number;
  stereoSpread: number;
  normalizedPhasorX: number;
  normalizedPhasorY: number;
  normalizedPhasorRadius: number;
}

export interface MusicalScoreProgram {
  definition: MusicalScoreDefinition;
  fundamentalHz: number;
  visualAngularRate: number;
  stepSeconds: number;
  stepsPerBar: number;
  totalSteps: number;
  cycleSeconds: number;
  amplitudeBound: number;
  events: readonly MusicalScoreEvent[];
}

export interface RecentMusicalImpulse {
  event: MusicalScoreEvent;
  ageSeconds: number;
  impact: number;
  tail: number;
}

export interface MusicalScoreFrame {
  cycleTimeSeconds: number;
  cycleIndex: number;
  globalStep: number;
  localStepTimeSeconds: number;
  event: MusicalScoreEvent;
  noteEnvelope: number;
  visualImpact: number;
  visualTail: number;
  recentImpulses: readonly RecentMusicalImpulse[];
}

export const RESIDUE_BLOOM_SCORE_DEFINITION: MusicalScoreDefinition = {
  bpm: 80,
  beatsPerBar: 4,
  stepsPerBeat: 4,
  totalBars: 48,
  carrierMultipliers: [9, 8, 8, 9],
  attackSeconds: 0.006,
  decaySeconds: 0.075,
  releaseSeconds: 0.024,
  antiAliasRatio: 0.9,
  timbreDamping: 1.4,
  outputGain: 0.5,
  sections: [
    { id: "intro", startBar: 0, barCount: 8 },
    { id: "growth", startBar: 8, barCount: 12 },
    { id: "bloom", startBar: 20, barCount: 12 },
    { id: "hush", startBar: 32, barCount: 8 },
    { id: "return", startBar: 40, barCount: 8 },
  ],
};

const QUARTER_NOTES = [0, 4, 8, 12] as const;
const EIGHTH_NOTES = [0, 2, 4, 6, 8, 10, 12, 14] as const;
const TWELVE_NOTES = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] as const;
const SIXTEENTH_NOTES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
const HALF_NOTES = [0, 8] as const;
const PHRASE_ACCENTS = [1, 0.82, 0.86, 0.92] as const;

const SECTION_TARGETS = {
  intro: {
    gain: [0.68, 0.76],
    brightness: [0.28, 0.4],
    wetSend: [0.72, 0.66],
    stereoSpread: [0.42, 0.5],
    visualIntensity: [0.62, 0.72],
  },
  growth: {
    gain: [0.76, 0.94],
    brightness: [0.4, 0.78],
    wetSend: [0.64, 0.54],
    stereoSpread: [0.5, 0.7],
    visualIntensity: [0.72, 0.94],
  },
  bloom: {
    gain: [0.94, 1],
    brightness: [0.78, 0.9],
    wetSend: [0.54, 0.62],
    stereoSpread: [0.7, 0.82],
    visualIntensity: [0.94, 1],
  },
  hush: {
    gain: [0.62, 0.5],
    brightness: [0.34, 0.2],
    wetSend: [0.82, 0.92],
    stereoSpread: [0.58, 0.42],
    visualIntensity: [0.58, 0.38],
  },
  return: {
    gain: [0.7, 0.9],
    brightness: [0.38, 0.74],
    wetSend: [0.74, 0.6],
    stereoSpread: [0.48, 0.72],
    visualIntensity: [0.64, 0.9],
  },
} as const;

interface SectionProfile {
  gain: number;
  brightness: number;
  wetSend: number;
  stereoSpread: number;
  visualIntensity: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function smoothstep01(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function getNoteEnvelope(
  localTimeSeconds: number,
  attackSeconds: number,
  decaySeconds: number,
  releaseSeconds: number,
  stepSeconds: number,
): number {
  const attack =
    localTimeSeconds < attackSeconds
      ? smoothstep01(localTimeSeconds / attackSeconds)
      : Math.exp(-(localTimeSeconds - attackSeconds) / decaySeconds);
  const release = smoothstep01((stepSeconds - localTimeSeconds) / releaseSeconds);
  return attack * release;
}

function getSection(
  definition: MusicalScoreDefinition,
  barIndex: number,
): MusicalSectionDefinition {
  const section = definition.sections.find(
    (candidate) =>
      barIndex >= candidate.startBar && barIndex < candidate.startBar + candidate.barCount,
  );
  if (!section) {
    throw new RangeError(`No musical section contains bar ${barIndex}`);
  }
  return section;
}

function getActiveSteps(section: MusicalSectionId, barInSection: number): readonly number[] {
  if (section === "intro") return QUARTER_NOTES;
  if (section === "growth") {
    if (barInSection < 4) return EIGHTH_NOTES;
    if (barInSection < 8) return TWELVE_NOTES;
    return SIXTEENTH_NOTES;
  }
  if (section === "bloom") return SIXTEENTH_NOTES;
  if (section === "hush") return barInSection < 4 ? QUARTER_NOTES : HALF_NOTES;
  if (barInSection < 2) return QUARTER_NOTES;
  if (barInSection < 4) return EIGHTH_NOTES;
  if (barInSection < 7) return SIXTEENTH_NOTES;
  return QUARTER_NOTES;
}

function getSectionProfile(section: MusicalSectionId, sectionProgress: number): SectionProfile {
  const progress = clamp(sectionProgress, 0, 1);
  const target = SECTION_TARGETS[section];
  const profile = {
    gain: lerp(target.gain[0], target.gain[1], progress),
    brightness: lerp(target.brightness[0], target.brightness[1], progress),
    wetSend: lerp(target.wetSend[0], target.wetSend[1], progress),
    stereoSpread: lerp(target.stereoSpread[0], target.stereoSpread[1], progress),
    visualIntensity: lerp(target.visualIntensity[0], target.visualIntensity[1], progress),
  };

  if (section !== "return" || progress < 7 / 8) {
    return profile;
  }

  const finalBarProgress = clamp((progress - 7 / 8) * 8, 0, 1);
  const returnAtFinalBar = {
    gain: lerp(target.gain[0], target.gain[1], 7 / 8),
    brightness: lerp(target.brightness[0], target.brightness[1], 7 / 8),
    wetSend: lerp(target.wetSend[0], target.wetSend[1], 7 / 8),
    stereoSpread: lerp(target.stereoSpread[0], target.stereoSpread[1], 7 / 8),
    visualIntensity: lerp(target.visualIntensity[0], target.visualIntensity[1], 7 / 8),
  };
  const intro = SECTION_TARGETS.intro;

  return {
    gain: lerp(returnAtFinalBar.gain, intro.gain[0], finalBarProgress),
    brightness: lerp(returnAtFinalBar.brightness, intro.brightness[0], finalBarProgress),
    wetSend: lerp(returnAtFinalBar.wetSend, intro.wetSend[0], finalBarProgress),
    stereoSpread: lerp(returnAtFinalBar.stereoSpread, intro.stereoSpread[0], finalBarProgress),
    visualIntensity: lerp(
      returnAtFinalBar.visualIntensity,
      intro.visualIntensity[0],
      finalBarProgress,
    ),
  };
}

export function buildMusicalScoreProgram(
  definition: MusicalScoreDefinition,
  series: FourierSeriesDefinition,
  fundamentalHz: number,
  visualAngularRate: number,
): MusicalScoreProgram {
  const stepsPerBar = definition.beatsPerBar * definition.stepsPerBeat;
  const stepSeconds = 60 / definition.bpm / definition.stepsPerBeat;
  const totalSteps = definition.totalBars * stepsPerBar;
  const cycleSeconds = totalSteps * stepSeconds;
  const amplitudeBound = series.terms.reduce((sum, term) => sum + term.amplitude, 0);
  let activeNoteOrdinal = 0;
  const events = Array.from({ length: totalSteps }, (_, globalStep): MusicalScoreEvent => {
    const barIndex = Math.floor(globalStep / stepsPerBar);
    const stepInBar = globalStep % stepsPerBar;
    const section = getSection(definition, barIndex);
    const barInSection = barIndex - section.startBar;
    const sectionProgress = (barInSection + stepInBar / stepsPerBar) / section.barCount;
    const profile = getSectionProfile(section.id, sectionProgress);
    const active = getActiveSteps(section.id, barInSection).includes(stepInBar);
    const eventOrdinal = active ? activeNoteOrdinal : -1;
    const phraseIndex = (active ? eventOrdinal % 4 : 0) as 0 | 1 | 2 | 3;
    const downbeatAccent = stepInBar === 0 ? 1.08 : 1;
    const carrierHz = active ? definition.carrierMultipliers[phraseIndex] * fundamentalHz : 0;
    const eventTimeSeconds = globalStep * stepSeconds;
    const endpoint = evaluateEpicycle(series, eventTimeSeconds * visualAngularRate);
    const normalizedPhasorX = clamp(endpoint.x / amplitudeBound, -1, 1);
    const normalizedPhasorY = clamp(endpoint.y / amplitudeBound, -1, 1);
    const normalizedPhasorRadius = clamp(Math.hypot(endpoint.x, endpoint.y) / amplitudeBound, 0, 1);
    const phasorBrightness = (normalizedPhasorY + 1) * 0.5;
    const brightness = clamp(profile.brightness * 0.72 + phasorBrightness * 0.28, 0, 1);
    const phasorAccent = 0.9 + normalizedPhasorRadius * 0.2;

    if (active) {
      activeNoteOrdinal += 1;
    }

    return {
      globalStep,
      barIndex,
      stepInBar,
      section: section.id,
      sectionProgress,
      active,
      activeNoteOrdinal: eventOrdinal,
      phraseIndex,
      carrierHz,
      gain: active ? profile.gain : 0,
      accent: active ? PHRASE_ACCENTS[phraseIndex] * downbeatAccent * phasorAccent : 0,
      brightness,
      wetSend: profile.wetSend,
      stereoSpread: profile.stereoSpread,
      normalizedPhasorX,
      normalizedPhasorY,
      normalizedPhasorRadius,
    };
  });

  return {
    definition,
    fundamentalHz,
    visualAngularRate,
    stepSeconds,
    stepsPerBar,
    totalSteps,
    cycleSeconds,
    amplitudeBound,
    events,
  };
}

export function evaluateMusicalScore(
  program: MusicalScoreProgram,
  transportTimeSeconds: number,
): MusicalScoreFrame {
  const timeSeconds = Math.max(0, transportTimeSeconds);
  const cycleIndex = Math.floor(timeSeconds / program.cycleSeconds);
  const cycleTimeSeconds = positiveModulo(timeSeconds, program.cycleSeconds);
  const globalStep = Math.min(
    program.totalSteps - 1,
    Math.floor(cycleTimeSeconds / program.stepSeconds),
  );
  const localStepTimeSeconds = cycleTimeSeconds - globalStep * program.stepSeconds;
  const event = program.events[globalStep]!;
  const decayScale = 0.88 + event.normalizedPhasorRadius * 0.24;
  const noteEnvelope = event.active
    ? getNoteEnvelope(
        localStepTimeSeconds,
        program.definition.attackSeconds,
        program.definition.decaySeconds * decayScale,
        program.definition.releaseSeconds,
        program.stepSeconds,
      )
    : 0;
  const recentImpulses: RecentMusicalImpulse[] = [];
  const maximumImpulseAgeSeconds = 0.75;
  const maximumStepOffset = Math.ceil(maximumImpulseAgeSeconds / program.stepSeconds);

  for (
    let stepOffset = 0;
    stepOffset <= maximumStepOffset && recentImpulses.length < 4;
    stepOffset += 1
  ) {
    const eventIndex = positiveModulo(globalStep - stepOffset, program.totalSteps);
    const eventAgeSeconds = localStepTimeSeconds + stepOffset * program.stepSeconds;
    if (eventAgeSeconds > maximumImpulseAgeSeconds) break;

    const recentEvent = program.events[eventIndex]!;
    if (!recentEvent.active) continue;

    const visualAttack = smoothstep01(eventAgeSeconds / 0.025);
    const profileVisualIntensity = getSectionProfile(
      recentEvent.section,
      recentEvent.sectionProgress,
    ).visualIntensity;
    const impact =
      recentEvent.accent *
      profileVisualIntensity *
      visualAttack *
      Math.exp(-Math.max(0, eventAgeSeconds - 0.025) / 0.18);

    recentImpulses.push({
      event: recentEvent,
      ageSeconds: eventAgeSeconds,
      impact: clamp(impact, 0, 1.4),
      tail: clamp(Math.exp(-eventAgeSeconds / 0.42), 0, 1),
    });
  }

  return {
    cycleTimeSeconds,
    cycleIndex,
    globalStep,
    localStepTimeSeconds,
    event,
    noteEnvelope,
    visualImpact: clamp(Math.max(...recentImpulses.map((impulse) => impulse.impact), 0), 0, 1.4),
    visualTail: clamp(
      recentImpulses.reduce((sum, impulse) => sum + impulse.tail * 0.35, 0),
      0,
      1,
    ),
    recentImpulses,
  };
}
