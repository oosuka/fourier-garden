export type SpectralCathedralSectionId =
  | "illumination"
  | "procession"
  | "ascent"
  | "resonance"
  | "afterglow";

export type SpectralCathedralGesture = "toll" | "answer" | "cascade" | "pulse" | "choir";

export interface SpectralCathedralScoreSection {
  id: SpectralCathedralSectionId;
  startBar: number;
  barCount: number;
}

export interface SpectralCathedralScoreEvent {
  index: number;
  barIndex: number;
  slotInBar: number;
  section: SpectralCathedralSectionId;
  gesture: SpectralCathedralGesture;
  modeIds: readonly number[];
  localTimeSeconds: number;
  baseGain: number;
  baseBrightness: number;
  wetSend: number;
  stereoSpread: number;
  registerMultiplier: 0.5 | 1 | 2;
}

export interface SpectralCathedralScoreProgram {
  bpm: 72;
  beatsPerBar: 5;
  slotsPerBeat: 2;
  totalBars: 18;
  beatSeconds: number;
  slotSeconds: number;
  barSeconds: number;
  cycleSeconds: number;
  sections: readonly SpectralCathedralScoreSection[];
  events: readonly SpectralCathedralScoreEvent[];
}

export interface EvaluatedSpectralCathedralEvent extends SpectralCathedralScoreEvent {
  cycleIndex: number;
  absoluteEventIndex: number;
  absoluteTimeSeconds: number;
  ageSeconds: number;
}

const SECTIONS = [
  { id: "illumination", startBar: 0, barCount: 3 },
  { id: "procession", startBar: 3, barCount: 4 },
  { id: "ascent", startBar: 7, barCount: 4 },
  { id: "resonance", startBar: 11, barCount: 4 },
  { id: "afterglow", startBar: 15, barCount: 3 },
] as const satisfies readonly SpectralCathedralScoreSection[];

const BAR_EVENT_COUNTS = [2, 3, 3, 4, 5, 4, 5, 6, 6, 7, 7, 8, 9, 8, 9, 4, 3, 2] as const;

const SLOT_PATTERNS = {
  2: [0, 6],
  3: [0, 3, 7],
  4: [0, 3, 5, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 7, 9],
  7: [0, 1, 3, 4, 6, 7, 9],
  8: [0, 1, 2, 4, 5, 6, 8, 9],
  9: [0, 1, 2, 3, 4, 5, 6, 8, 9],
} as const;

const GESTURES_BY_SECTION = {
  illumination: ["toll", "answer", "toll"],
  procession: ["answer", "pulse", "toll", "cascade"],
  ascent: ["cascade", "pulse", "answer", "cascade", "choir"],
  resonance: ["choir", "cascade", "pulse", "answer", "choir", "pulse"],
  afterglow: ["toll", "answer", "toll", "cascade"],
} as const satisfies Readonly<
  Record<SpectralCathedralSectionId, readonly SpectralCathedralGesture[]>
>;

const MODES_BY_GESTURE = {
  toll: [[1], [3], [5], [7], [9], [11], [2, 4], [6, 8], [10, 12]],
  answer: [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
    [11, 12],
  ],
  cascade: [[1], [4], [2], [5], [3], [7], [6], [9], [8], [11], [10], [12]],
  pulse: [
    [1, 4],
    [2, 5],
    [3, 6],
    [7, 10],
    [8, 11],
    [9, 12],
  ],
  choir: [
    [1, 4, 7],
    [2, 5, 8, 11],
    [3, 6, 9, 12],
    [1, 6, 10],
    [4, 8, 12],
  ],
} as const satisfies Readonly<Record<SpectralCathedralGesture, readonly (readonly number[])[]>>;

const SECTION_PROFILES = {
  illumination: {
    baseGain: 0.58,
    brightness: 0.28,
    wetSend: 0.72,
    stereoSpread: 0.36,
    registerMultiplier: 0.5,
  },
  procession: {
    baseGain: 0.68,
    brightness: 0.46,
    wetSend: 0.62,
    stereoSpread: 0.58,
    registerMultiplier: 1,
  },
  ascent: {
    baseGain: 0.76,
    brightness: 0.68,
    wetSend: 0.5,
    stereoSpread: 0.72,
    registerMultiplier: 1,
  },
  resonance: {
    baseGain: 0.86,
    brightness: 0.86,
    wetSend: 0.68,
    stereoSpread: 0.88,
    registerMultiplier: 2,
  },
  afterglow: {
    baseGain: 0.54,
    brightness: 0.34,
    wetSend: 0.84,
    stereoSpread: 0.46,
    registerMultiplier: 0.5,
  },
} as const satisfies Readonly<
  Record<
    SpectralCathedralSectionId,
    {
      baseGain: number;
      brightness: number;
      wetSend: number;
      stereoSpread: number;
      registerMultiplier: 0.5 | 1 | 2;
    }
  >
>;

const BEAT_SECONDS = 60 / 72;
const SLOT_SECONDS = BEAT_SECONDS / 2;
const BAR_SECONDS = BEAT_SECONDS * 5;

function getSection(barIndex: number): SpectralCathedralScoreSection {
  const section = SECTIONS.find(
    (candidate) =>
      barIndex >= candidate.startBar && barIndex < candidate.startBar + candidate.barCount,
  );
  if (!section) throw new RangeError(`No Spectral Cathedral section contains bar ${barIndex}`);
  return section;
}

function buildEvents(): SpectralCathedralScoreEvent[] {
  const events: SpectralCathedralScoreEvent[] = [];
  const gestureOrdinals: Record<SpectralCathedralGesture, number> = {
    toll: 0,
    answer: 0,
    cascade: 0,
    pulse: 0,
    choir: 0,
  };

  for (const [barIndex, eventCount] of BAR_EVENT_COUNTS.entries()) {
    const section = getSection(barIndex);
    const slots = SLOT_PATTERNS[eventCount];
    const gestures = GESTURES_BY_SECTION[section.id];
    const profile = SECTION_PROFILES[section.id];

    for (const [eventInBar, slotInBar] of slots.entries()) {
      const index = events.length;
      const gesture = gestures[(barIndex + eventInBar) % gestures.length]!;
      const modeSets = MODES_BY_GESTURE[gesture];
      const modeSetIndex = gestureOrdinals[gesture] % modeSets.length;
      const modeIds = modeSets[modeSetIndex]!;
      gestureOrdinals[gesture] += 1;
      const phraseAccent = [1, 0.88, 0.94, 0.84][index % 4]!;

      events.push({
        index,
        barIndex,
        slotInBar,
        section: section.id,
        gesture,
        modeIds,
        localTimeSeconds: barIndex * BAR_SECONDS + slotInBar * SLOT_SECONDS,
        baseGain: profile.baseGain * phraseAccent,
        baseBrightness: profile.brightness,
        wetSend: profile.wetSend,
        stereoSpread: profile.stereoSpread,
        registerMultiplier: profile.registerMultiplier,
      });
    }
  }

  return events;
}

export const SPECTRAL_CATHEDRAL_SCORE: SpectralCathedralScoreProgram = {
  bpm: 72,
  beatsPerBar: 5,
  slotsPerBeat: 2,
  totalBars: 18,
  beatSeconds: BEAT_SECONDS,
  slotSeconds: SLOT_SECONDS,
  barSeconds: BAR_SECONDS,
  cycleSeconds: BAR_SECONDS * 18,
  sections: SECTIONS,
  events: buildEvents(),
};

export function evaluateSpectralCathedralEvents(
  score: SpectralCathedralScoreProgram,
  absoluteTimeSeconds: number,
  maximumAgeSeconds: number,
): EvaluatedSpectralCathedralEvent[] {
  if (
    !Number.isFinite(absoluteTimeSeconds) ||
    !Number.isFinite(maximumAgeSeconds) ||
    absoluteTimeSeconds < 0 ||
    maximumAgeSeconds <= 0
  ) {
    return [];
  }

  const currentCycleIndex = Math.floor(absoluteTimeSeconds / score.cycleSeconds);
  const evaluated: EvaluatedSpectralCathedralEvent[] = [];

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
