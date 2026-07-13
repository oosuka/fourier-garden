import { getLongFormMotion } from "../../../audio/longFormMotion";

export type MobiusChoirSectionId =
  | "breath"
  | "antiphon"
  | "inversion"
  | "interweave"
  | "confluence";

export type MobiusChoirGesture = "breath" | "call" | "answer" | "turn" | "braid" | "converge";

export type MobiusChoirVowel = "u" | "o" | "e" | "a";

export interface MobiusChoirScoreSection {
  id: MobiusChoirSectionId;
  startBar: number;
  barCount: number;
}

export interface MobiusChoirScoreEvent {
  index: number;
  barIndex: number;
  slotInBar: number;
  section: MobiusChoirSectionId;
  gesture: MobiusChoirGesture;
  modeIds: readonly number[];
  localTimeSeconds: number;
  baseGain: number;
  wetSend: number;
  stereoSpread: number;
  registerMultiplier: 1;
  partialCount: number;
  amplitudeMotionDepth: number;
  brightnessMotionDepth: number;
  panMotion: number;
  vowelStart: MobiusChoirVowel;
  vowelEnd: MobiusChoirVowel;
}

export interface MobiusChoirScoreProgram {
  bpm: 68;
  beatsPerBar: 4;
  slotsPerBeat: 4;
  totalBars: 16;
  beatSeconds: number;
  slotSeconds: number;
  barSeconds: number;
  cycleSeconds: number;
  sections: readonly MobiusChoirScoreSection[];
  events: readonly MobiusChoirScoreEvent[];
}

export interface EvaluatedMobiusChoirEvent extends MobiusChoirScoreEvent {
  cycleIndex: number;
  absoluteEventIndex: number;
  absoluteTimeSeconds: number;
  ageSeconds: number;
}

const SECTIONS = [
  { id: "breath", startBar: 0, barCount: 3 },
  { id: "antiphon", startBar: 3, barCount: 3 },
  { id: "inversion", startBar: 6, barCount: 4 },
  { id: "interweave", startBar: 10, barCount: 4 },
  { id: "confluence", startBar: 14, barCount: 2 },
] as const satisfies readonly MobiusChoirScoreSection[];

const GESTURES_BY_SECTION = {
  breath: ["call", "answer", "call", "breath"],
  antiphon: ["call", "answer", "turn", "answer"],
  inversion: ["turn", "call", "answer", "turn"],
  interweave: ["braid", "turn", "answer", "braid"],
  confluence: ["converge", "answer", "converge", "call"],
} as const satisfies Readonly<Record<MobiusChoirSectionId, readonly MobiusChoirGesture[]>>;

const MODE_SETS_BY_SECTION = {
  breath: [[1], [2], [3], [4]],
  antiphon: [[2], [3], [5], [6]],
  inversion: [[1], [4], [2], [5], [3], [6]],
  interweave: [[2], [5], [3], [6], [1], [4]],
  confluence: [[1], [4], [2], [3]],
} as const satisfies Readonly<Record<MobiusChoirSectionId, readonly (readonly number[])[]>>;

const VOWELS_BY_GESTURE = {
  breath: ["u", "o"],
  call: ["o", "e"],
  answer: ["e", "a"],
  turn: ["e", "u"],
  braid: ["a", "e"],
  converge: ["a", "u"],
} as const satisfies Readonly<
  Record<MobiusChoirGesture, readonly [MobiusChoirVowel, MobiusChoirVowel]>
>;

const SECTION_PROFILES = {
  breath: {
    baseGain: 0.52,
    wetSend: 0.12,
    stereoSpread: 0.64,
    registers: [1],
    partialCount: 1,
    amplitudeMotionDepth: 0.18,
    brightnessMotionDepth: 0.14,
    panMotion: 0.32,
  },
  antiphon: {
    baseGain: 0.6,
    wetSend: 0.1,
    stereoSpread: 0.86,
    registers: [1],
    partialCount: 1,
    amplitudeMotionDepth: 0.24,
    brightnessMotionDepth: 0.18,
    panMotion: 0.48,
  },
  inversion: {
    baseGain: 0.71,
    wetSend: 0.09,
    stereoSpread: 0.98,
    registers: [1],
    partialCount: 1,
    amplitudeMotionDepth: 0.3,
    brightnessMotionDepth: 0.22,
    panMotion: 0.62,
  },
  interweave: {
    baseGain: 0.75,
    wetSend: 0.11,
    stereoSpread: 1,
    registers: [1],
    partialCount: 1,
    amplitudeMotionDepth: 0.34,
    brightnessMotionDepth: 0.24,
    panMotion: 0.72,
  },
  confluence: {
    baseGain: 0.56,
    wetSend: 0.14,
    stereoSpread: 0.76,
    registers: [1],
    partialCount: 1,
    amplitudeMotionDepth: 0.22,
    brightnessMotionDepth: 0.16,
    panMotion: 0.4,
  },
} as const satisfies Readonly<
  Record<
    MobiusChoirSectionId,
    {
      baseGain: number;
      wetSend: number;
      stereoSpread: number;
      registers: readonly 1[];
      partialCount: number;
      amplitudeMotionDepth: number;
      brightnessMotionDepth: number;
      panMotion: number;
    }
  >
>;

const BEAT_SECONDS = 60 / 68;
const SLOT_SECONDS = BEAT_SECONDS / 4;
const BAR_SECONDS = BEAT_SECONDS * 4;

function getSection(barIndex: number): MobiusChoirScoreSection {
  const section = SECTIONS.find(
    (candidate) =>
      barIndex >= candidate.startBar && barIndex < candidate.startBar + candidate.barCount,
  );
  if (!section) throw new RangeError(`No Möbius Choir section contains bar ${barIndex}`);
  return section;
}

function sameModeSet(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((modeId, index) => modeId === right[index]);
}

function buildEvents(): MobiusChoirScoreEvent[] {
  const events: MobiusChoirScoreEvent[] = [];
  const sectionOrdinals: Record<MobiusChoirSectionId, number> = {
    breath: 0,
    antiphon: 0,
    inversion: 0,
    interweave: 0,
    confluence: 0,
  };

  for (let barIndex = 0; barIndex < 16; barIndex += 1) {
    const section = getSection(barIndex);
    const gestures = GESTURES_BY_SECTION[section.id];
    const profile = SECTION_PROFILES[section.id];
    const modeSets = MODE_SETS_BY_SECTION[section.id];

    for (let slotInBar = 0; slotInBar < 16; slotInBar += 1) {
      const gesture = gestures[(barIndex + slotInBar) % gestures.length]!;
      let modeIds: readonly number[];
      do {
        modeIds = modeSets[sectionOrdinals[section.id] % modeSets.length]!;
        sectionOrdinals[section.id] += 1;
      } while (
        events.some(
          (event) =>
            event.barIndex === barIndex - 1 &&
            event.slotInBar === slotInBar &&
            sameModeSet(event.modeIds, modeIds),
        )
      );

      if (barIndex === 15 && slotInBar === 15) modeIds = [1];
      const sectionOrdinal = sectionOrdinals[section.id] - 1;
      const [vowelStart, vowelEnd] = VOWELS_BY_GESTURE[gesture];
      const phraseAccent = [0.78, 1, 0.68, 0.92][slotInBar % 4]!;
      const longForm = getLongFormMotion({
        eventIndex: events.length,
        eventCount: 256,
        stepsPerBar: 16,
        rotation: 5,
        phaseOffset: 3,
        depth: 0.88,
      });
      events.push({
        index: events.length,
        barIndex,
        slotInBar,
        section: section.id,
        gesture,
        modeIds,
        localTimeSeconds: barIndex * BAR_SECONDS + slotInBar * SLOT_SECONDS,
        baseGain: profile.baseGain * phraseAccent * longForm.accent,
        wetSend: Math.min(0.18, profile.wetSend * longForm.spaceScale),
        stereoSpread: Math.min(
          1,
          Math.max(profile.stereoSpread, profile.stereoSpread * longForm.motionScale),
        ),
        registerMultiplier: profile.registers[sectionOrdinal % profile.registers.length]!,
        partialCount: profile.partialCount,
        amplitudeMotionDepth: Math.min(0.42, profile.amplitudeMotionDepth * longForm.tailScale),
        brightnessMotionDepth: Math.min(0.3, profile.brightnessMotionDepth * longForm.spaceScale),
        panMotion: Math.min(0.84, Math.max(0.32, profile.panMotion * longForm.motionScale)),
        vowelStart,
        vowelEnd,
      });
    }
  }
  return events;
}

export const MOBIUS_CHOIR_SCORE: MobiusChoirScoreProgram = Object.freeze({
  bpm: 68,
  beatsPerBar: 4,
  slotsPerBeat: 4,
  totalBars: 16,
  beatSeconds: BEAT_SECONDS,
  slotSeconds: SLOT_SECONDS,
  barSeconds: BAR_SECONDS,
  cycleSeconds: BAR_SECONDS * 16,
  sections: SECTIONS,
  events: Object.freeze(buildEvents().map((event) => Object.freeze(event))),
});

export function evaluateMobiusChoirEvents(
  score: MobiusChoirScoreProgram,
  absoluteTimeSeconds: number,
  maximumAgeSeconds: number,
): EvaluatedMobiusChoirEvent[] {
  if (
    !Number.isFinite(absoluteTimeSeconds) ||
    absoluteTimeSeconds < 0 ||
    !Number.isFinite(maximumAgeSeconds) ||
    maximumAgeSeconds <= 0
  ) {
    return [];
  }
  const currentCycleIndex = Math.floor(absoluteTimeSeconds / score.cycleSeconds);
  const evaluated: EvaluatedMobiusChoirEvent[] = [];
  for (const cycleIndex of [currentCycleIndex - 1, currentCycleIndex]) {
    if (cycleIndex < 0) continue;
    for (const event of score.events) {
      const eventTimeSeconds = cycleIndex * score.cycleSeconds + event.localTimeSeconds;
      const ageSeconds = absoluteTimeSeconds - eventTimeSeconds;
      if (ageSeconds < 0 || ageSeconds >= maximumAgeSeconds) continue;
      evaluated.push({
        ...event,
        cycleIndex,
        absoluteEventIndex: cycleIndex * score.events.length + event.index,
        absoluteTimeSeconds: eventTimeSeconds,
        ageSeconds,
      });
    }
  }
  return evaluated.toSorted((left, right) => left.absoluteTimeSeconds - right.absoluteTimeSeconds);
}
