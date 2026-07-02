import type { FourierSeriesDefinition } from "../../../math/fourierSeries";

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
  stereoDetuneRatio: number;
  timbreDamping: number;
  outputGain: number;
  sections: readonly MusicalSectionDefinition[];
}

export interface SerializablePhasorMapping {
  visualAngularRate: number;
  amplitudeBound: number;
  terms: readonly {
    harmonic: number;
    amplitude: number;
    sinePhase: number;
  }[];
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
  baseGain: number;
  baseAccent: number;
  baseBrightness: number;
  wetSend: number;
  stereoSpread: number;
  visualIntensity: number;
}

export interface EvaluatedMusicalScoreEvent extends MusicalScoreEvent {
  absoluteTimeSeconds: number;
  accent: number;
  brightness: number;
  normalizedPhasorX: number;
  normalizedPhasorY: number;
  normalizedPhasorRadius: number;
}

export interface MusicalScoreProgram {
  definition: MusicalScoreDefinition;
  fundamentalHz: number;
  stepSeconds: number;
  stepsPerBar: number;
  totalSteps: number;
  cycleSeconds: number;
  phasorMapping: SerializablePhasorMapping;
  events: readonly MusicalScoreEvent[];
}

export interface RecentMusicalImpulse {
  event: EvaluatedMusicalScoreEvent;
  ageSeconds: number;
  impact: number;
  tail: number;
}

export interface MusicalScoreFrame {
  cycleTimeSeconds: number;
  cycleIndex: number;
  globalStep: number;
  localStepTimeSeconds: number;
  event: EvaluatedMusicalScoreEvent;
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
  attackSeconds: 0.012,
  decaySeconds: 0.11,
  releaseSeconds: 0.055,
  antiAliasRatio: 0.9,
  stereoDetuneRatio: 0.00125,
  timbreDamping: 1.85,
  outputGain: 0.5,
  sections: [
    { id: "intro", startBar: 0, barCount: 8 },
    { id: "growth", startBar: 8, barCount: 12 },
    { id: "bloom", startBar: 20, barCount: 12 },
    { id: "hush", startBar: 32, barCount: 8 },
    { id: "return", startBar: 40, barCount: 8 },
  ],
};

const SIXTEENTH_NOTES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
const PHRASE_ACCENTS = [1, 0.64, 0.9, 0.72] as const;

const SECTION_TARGETS = {
  intro: {
    gain: [0.62, 0.72],
    brightness: [0.16, 0.3],
    wetSend: [0.54, 0.46],
    stereoSpread: [0.36, 0.48],
    visualIntensity: [0.56, 0.7],
  },
  growth: {
    gain: [0.72, 0.94],
    brightness: [0.3, 0.78],
    wetSend: [0.42, 0.28],
    stereoSpread: [0.48, 0.7],
    visualIntensity: [0.7, 0.94],
  },
  bloom: {
    gain: [0.94, 1],
    brightness: [0.78, 0.94],
    wetSend: [0.26, 0.34],
    stereoSpread: [0.7, 0.82],
    visualIntensity: [0.94, 1],
  },
  hush: {
    gain: [0.5, 0.42],
    brightness: [0.18, 0.08],
    wetSend: [0.78, 0.88],
    stereoSpread: [0.52, 0.34],
    visualIntensity: [0.52, 0.32],
  },
  return: {
    gain: [0.66, 0.9],
    brightness: [0.24, 0.72],
    wetSend: [0.62, 0.42],
    stereoSpread: [0.42, 0.72],
    visualIntensity: [0.6, 0.9],
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

function getActiveSteps(): readonly number[] {
  return SIXTEENTH_NOTES;
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
  const phasorMapping: SerializablePhasorMapping = {
    visualAngularRate,
    amplitudeBound: series.terms.reduce((sum, term) => sum + Math.abs(term.amplitude), 0),
    terms: series.terms.map((term) => ({
      harmonic: term.harmonic,
      amplitude: term.amplitude,
      sinePhase: term.sinePhase,
    })),
  };
  let activeNoteOrdinal = 0;
  const events = Array.from({ length: totalSteps }, (_, globalStep): MusicalScoreEvent => {
    const barIndex = Math.floor(globalStep / stepsPerBar);
    const stepInBar = globalStep % stepsPerBar;
    const section = getSection(definition, barIndex);
    const barInSection = barIndex - section.startBar;
    const sectionProgress = (barInSection + stepInBar / stepsPerBar) / section.barCount;
    const profile = getSectionProfile(section.id, sectionProgress);
    const active = getActiveSteps().includes(stepInBar);
    const eventOrdinal = active ? activeNoteOrdinal : -1;
    const phraseIndex = (active ? eventOrdinal % 4 : 0) as 0 | 1 | 2 | 3;
    const downbeatAccent = stepInBar === 0 ? 1.08 : 1;
    const carrierHz = active ? definition.carrierMultipliers[phraseIndex] * fundamentalHz : 0;

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
      baseGain: active ? profile.gain : 0,
      baseAccent: active ? PHRASE_ACCENTS[phraseIndex] * downbeatAccent : 0,
      baseBrightness: profile.brightness,
      wetSend: profile.wetSend,
      stereoSpread: profile.stereoSpread,
      visualIntensity: profile.visualIntensity,
    };
  });

  return {
    definition,
    fundamentalHz,
    stepSeconds,
    stepsPerBar,
    totalSteps,
    cycleSeconds,
    phasorMapping,
    events,
  };
}

export function evaluateSerializedPhasor(
  mapping: SerializablePhasorMapping,
  absoluteTimeSeconds: number,
): Readonly<{
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}> {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  return {
    normalizedX: clamp(x / mapping.amplitudeBound, -1, 1),
    normalizedY: clamp(y / mapping.amplitudeBound, -1, 1),
    normalizedRadius: clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1),
  };
}

export function evaluateScoreEvent(
  program: MusicalScoreProgram,
  event: MusicalScoreEvent,
  cycleIndex: number,
): EvaluatedMusicalScoreEvent {
  const absoluteTimeSeconds =
    cycleIndex * program.cycleSeconds + event.globalStep * program.stepSeconds;
  const phasor = evaluateSerializedPhasor(program.phasorMapping, absoluteTimeSeconds);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  return {
    ...event,
    absoluteTimeSeconds,
    brightness: clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1),
    accent: event.active ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2) : 0,
    normalizedPhasorX: phasor.normalizedX,
    normalizedPhasorY: phasor.normalizedY,
    normalizedPhasorRadius: phasor.normalizedRadius,
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
  const baseEvent = program.events[globalStep]!;
  const event = evaluateScoreEvent(program, baseEvent, cycleIndex);
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

    const wrappedIntoPreviousCycle = eventIndex > globalStep;
    const eventCycleIndex = wrappedIntoPreviousCycle ? cycleIndex - 1 : cycleIndex;
    if (eventCycleIndex < 0) continue;

    const recentBaseEvent = program.events[eventIndex]!;
    if (!recentBaseEvent.active) continue;
    const recentEvent = evaluateScoreEvent(program, recentBaseEvent, eventCycleIndex);
    const visualAttack = smoothstep01(eventAgeSeconds / 0.025);
    const impact =
      recentEvent.accent *
      recentEvent.visualIntensity *
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
