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
  registerMultiplier: number;
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
  slotsPerBeat: 2;
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

const SLOT_PATTERNS_BY_SECTION = {
  breath: [0, 3, 5, 6],
  antiphon: [0, 2, 3, 6, 7],
  inversion: [0, 1, 3, 4, 6],
  interweave: [0, 1, 2, 4, 5, 7],
  confluence: [0, 3, 6],
} as const satisfies Readonly<Record<MobiusChoirSectionId, readonly number[]>>;

const CONFLUENCE_FINAL_BAR_SLOTS = [0, 2, 5, 7] as const;

const GESTURES_BY_SECTION = {
  breath: ["breath", "breath", "call"],
  antiphon: ["call", "answer", "call", "answer"],
  inversion: ["turn", "answer", "turn", "call", "breath"],
  interweave: ["braid", "turn", "answer", "braid", "converge"],
  confluence: ["converge", "answer", "converge"],
} as const satisfies Readonly<Record<MobiusChoirSectionId, readonly MobiusChoirGesture[]>>;

const MODE_SETS_BY_SECTION = {
  breath: [[1], [2], [3], [2, 3]],
  antiphon: [[2, 3], [5, 6], [1, 4], [2], [3]],
  inversion: [[1, 4], [5, 6], [2, 3], [4], [1]],
  interweave: [[2], [5], [3], [6], [1, 4], [1], [4]],
  confluence: [[1, 4], [5, 6], [2, 3], [1]],
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
    baseGain: 0.48,
    wetSend: 0.66,
    stereoSpread: 0.28,
    registers: [1],
    partialCount: 3,
    amplitudeMotionDepth: 0.12,
    brightnessMotionDepth: 0.22,
    panMotion: 0.14,
  },
  antiphon: {
    baseGain: 0.56,
    wetSend: 0.48,
    stereoSpread: 0.74,
    registers: [1, 4 / 3],
    partialCount: 4,
    amplitudeMotionDepth: 0.18,
    brightnessMotionDepth: 0.32,
    panMotion: 0.28,
  },
  inversion: {
    baseGain: 0.7,
    wetSend: 0.4,
    stereoSpread: 0.86,
    registers: [4 / 3, 3 / 2],
    partialCount: 5,
    amplitudeMotionDepth: 0.24,
    brightnessMotionDepth: 0.38,
    panMotion: 0.34,
  },
  interweave: {
    baseGain: 0.74,
    wetSend: 0.52,
    stereoSpread: 0.98,
    registers: [1, 4 / 3, 3 / 2],
    partialCount: 6,
    amplitudeMotionDepth: 0.3,
    brightnessMotionDepth: 0.46,
    panMotion: 0.44,
  },
  confluence: {
    baseGain: 0.52,
    wetSend: 0.82,
    stereoSpread: 0.5,
    registers: [1],
    partialCount: 4,
    amplitudeMotionDepth: 0.16,
    brightnessMotionDepth: 0.28,
    panMotion: 0.18,
  },
} as const satisfies Readonly<
  Record<
    MobiusChoirSectionId,
    {
      baseGain: number;
      wetSend: number;
      stereoSpread: number;
      registers: readonly number[];
      partialCount: number;
      amplitudeMotionDepth: number;
      brightnessMotionDepth: number;
      panMotion: number;
    }
  >
>;

const BEAT_SECONDS = 60 / 68;
const SLOT_SECONDS = BEAT_SECONDS / 2;
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
    const slots =
      section.id === "confluence" && barIndex === 15
        ? CONFLUENCE_FINAL_BAR_SLOTS
        : SLOT_PATTERNS_BY_SECTION[section.id];
    const gestures = GESTURES_BY_SECTION[section.id];
    const profile = SECTION_PROFILES[section.id];
    const modeSets = MODE_SETS_BY_SECTION[section.id];

    for (const [eventInBar, slotInBar] of slots.entries()) {
      const gesture = gestures[eventInBar % gestures.length]!;
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

      if (barIndex === 15 && slotInBar === 7) modeIds = [1, 4];
      const sectionOrdinal = sectionOrdinals[section.id] - 1;
      const [vowelStart, vowelEnd] = VOWELS_BY_GESTURE[gesture];
      const phraseAccent = [1, 0.86, 0.94, 0.82, 0.9, 0.78][eventInBar]!;
      events.push({
        index: events.length,
        barIndex,
        slotInBar,
        section: section.id,
        gesture,
        modeIds,
        localTimeSeconds: barIndex * BAR_SECONDS + slotInBar * SLOT_SECONDS,
        baseGain: profile.baseGain * phraseAccent,
        wetSend: profile.wetSend,
        stereoSpread: profile.stereoSpread,
        registerMultiplier: profile.registers[sectionOrdinal % profile.registers.length]!,
        partialCount: profile.partialCount,
        amplitudeMotionDepth: profile.amplitudeMotionDepth,
        brightnessMotionDepth: profile.brightnessMotionDepth,
        panMotion: profile.panMotion,
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
  slotsPerBeat: 2,
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
