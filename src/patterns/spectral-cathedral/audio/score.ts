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
  registerMultiplier: 1;
}

export interface SpectralCathedralScoreProgram {
  bpm: 72;
  beatsPerBar: 5;
  slotsPerBeat: 4;
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

const GESTURES_BY_SECTION = {
  illumination: ["pulse", "answer", "pulse", "toll"],
  procession: ["pulse", "cascade", "answer", "pulse"],
  ascent: ["cascade", "pulse", "answer", "cascade"],
  resonance: ["pulse", "choir", "cascade", "answer"],
  afterglow: ["pulse", "answer", "toll", "pulse"],
} as const satisfies Readonly<
  Record<SpectralCathedralSectionId, readonly SpectralCathedralGesture[]>
>;

const MODES_BY_GESTURE = {
  toll: [[1], [5], [9], [3]],
  answer: [[2], [6], [10], [4]],
  cascade: [[1], [4], [7], [10], [2], [5], [8], [11]],
  pulse: [[1], [3], [5], [7], [9], [11]],
  choir: [[2], [4], [6], [8], [10], [12]],
} as const satisfies Readonly<Record<SpectralCathedralGesture, readonly (readonly number[])[]>>;

const SECTION_PROFILES = {
  illumination: {
    baseGain: 0.58,
    brightness: 0.2,
    wetSend: 0.1,
    stereoSpread: 0.24,
    registerMultiplier: 1,
  },
  procession: {
    baseGain: 0.66,
    brightness: 0.34,
    wetSend: 0.08,
    stereoSpread: 0.42,
    registerMultiplier: 1,
  },
  ascent: {
    baseGain: 0.72,
    brightness: 0.52,
    wetSend: 0.06,
    stereoSpread: 0.58,
    registerMultiplier: 1,
  },
  resonance: {
    baseGain: 0.78,
    brightness: 0.68,
    wetSend: 0.08,
    stereoSpread: 0.74,
    registerMultiplier: 1,
  },
  afterglow: {
    baseGain: 0.52,
    brightness: 0.26,
    wetSend: 0.12,
    stereoSpread: 0.32,
    registerMultiplier: 1,
  },
} as const satisfies Readonly<
  Record<
    SpectralCathedralSectionId,
    {
      baseGain: number;
      brightness: number;
      wetSend: number;
      stereoSpread: number;
      registerMultiplier: 1;
    }
  >
>;

const BEAT_SECONDS = 60 / 72;
const SLOT_SECONDS = BEAT_SECONDS / 4;
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

  for (let barIndex = 0; barIndex < 18; barIndex += 1) {
    const section = getSection(barIndex);
    const gestures = GESTURES_BY_SECTION[section.id];
    const profile = SECTION_PROFILES[section.id];

    for (let slotInBar = 0; slotInBar < 20; slotInBar += 1) {
      const index = events.length;
      const gesture = gestures[(barIndex + slotInBar) % gestures.length]!;
      const modeSets = MODES_BY_GESTURE[gesture];
      const modeSetIndex = gestureOrdinals[gesture] % modeSets.length;
      const modeIds = modeSets[modeSetIndex]!;
      gestureOrdinals[gesture] += 1;
      const phraseAccent = [1, 0.92, 0.98, 0.88][slotInBar % 4]!;

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
  slotsPerBeat: 4,
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
