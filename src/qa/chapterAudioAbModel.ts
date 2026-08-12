export const REQUIRED_LISTENING_OUTPUT = {
  id: "mac-built-in-speakers",
  label: "MAC BUILT-IN SPEAKERS",
  labelJa: "Mac内蔵スピーカー",
} as const;

export const AUDIO_AB_CRITERIA = [
  {
    id: "comfort",
    label: "聴きやすさ",
    low: "刺激が強い",
    middle: "許容範囲",
    high: "ずっと聴ける",
  },
  {
    id: "distinctness",
    label: "章の独立性",
    low: "似て聞こえる",
    middle: "区別できる",
    high: "一聴で別世界",
  },
  {
    id: "continuity",
    label: "句の連続性",
    low: "途切れ・跳躍",
    middle: "自然",
    high: "没入が続く",
  },
  {
    id: "spatialBalance",
    label: "定位と広がり",
    low: "片寄る",
    middle: "安定",
    high: "意図的で立体的",
  },
  {
    id: "fatigue",
    label: "30秒後の疲労",
    low: "疲れる",
    middle: "軽微",
    high: "疲れない",
  },
] as const;

export const LISTENING_SAMPLE_PLANS = [
  {
    id: "opening",
    label: "OPENING",
    labelJa: "序盤",
    startRatio: 0.12,
    purpose: "立ち上がり、第一印象、音像の形成",
  },
  {
    id: "middle",
    label: "MIDDLE",
    labelJa: "中盤",
    startRatio: 0.5,
    purpose: "長周期変化、密度、章固有の運動",
  },
  {
    id: "loop-bridge",
    label: "LOOP BRIDGE",
    labelJa: "終盤→次周期",
    startRatio: 0.86,
    purpose: "終盤から次周期への連続性と反復疲労",
  },
] as const;

export type AudioAbCriterionId = (typeof AUDIO_AB_CRITERIA)[number]["id"];
export type AudioAbRating = 1 | 2 | 3;
export type AudioAbSide = "A" | "B";
export type ListeningSampleAct = (typeof LISTENING_SAMPLE_PLANS)[number]["id"];
export type ListeningSamplePlan = (typeof LISTENING_SAMPLE_PLANS)[number];

export interface PlaybackEvidence {
  act: ListeningSampleAct;
  startRatio: number;
  startSeconds: number;
  segmentSeconds: 30;
  completedAt: string;
  sampleRateHz: number | null;
  masterVolume: number;
}

export interface PairAssessment {
  played: Record<AudioAbSide, PlaybackEvidence | null>;
  ratings: Partial<Record<AudioAbCriterionId, AudioAbRating>>;
  note: string;
}

export interface ListeningEnvironment {
  platform: string;
  language: string;
  sampleRateHz: number | null;
  masterVolume: number | null;
}

export interface ListeningSession {
  version: 4;
  startedAt: string;
  updatedAt: string;
  environment: ListeningEnvironment;
  assessments: Record<string, PairAssessment>;
}

export interface ListeningProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface ListeningVerdict {
  status: "incomplete" | "pass" | "review";
  average: number;
  weakestCriterion: AudioAbCriterionId | null;
  distinctnessAverage: number;
  comfortAverage: number;
  fatigueAverage: number;
}

export type ListeningPrimaryAction = "play-a" | "play-b" | "rate" | "complete";

const DEFAULT_ENVIRONMENT: ListeningEnvironment = {
  platform: "unknown",
  language: "unknown",
  sampleRateHz: null,
  masterVolume: null,
};

function createAssessment(): PairAssessment {
  return {
    played: { A: null, B: null },
    ratings: {},
    note: "",
  };
}

function createAssessments(pairIds: readonly string[]): Record<string, PairAssessment> {
  return Object.fromEntries(pairIds.map((pairId) => [pairId, createAssessment()]));
}

export function getListeningSamplePlan(pairIndex: number): ListeningSamplePlan {
  if (!Number.isInteger(pairIndex) || pairIndex < 0) {
    throw new Error("Pair index must be a non-negative integer");
  }
  return LISTENING_SAMPLE_PLANS[pairIndex % LISTENING_SAMPLE_PLANS.length]!;
}

export function createListeningSession(
  pairIds: readonly string[],
  timestamp: string,
  environment: Partial<ListeningEnvironment> = {},
): ListeningSession {
  return {
    version: 4,
    startedAt: timestamp,
    updatedAt: timestamp,
    environment: {
      ...DEFAULT_ENVIRONMENT,
      ...environment,
    },
    assessments: createAssessments(pairIds),
  };
}

function isRating(value: unknown): value is AudioAbRating {
  return value === 1 || value === 2 || value === 3;
}

function isSampleAct(value: unknown): value is ListeningSampleAct {
  return LISTENING_SAMPLE_PLANS.some((plan) => plan.id === value);
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function restorePlaybackEvidence(value: unknown): PlaybackEvidence | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof PlaybackEvidence, unknown>>;
  const startRatio = finiteNumberOrNull(candidate.startRatio);
  const startSeconds = finiteNumberOrNull(candidate.startSeconds);
  const masterVolume = finiteNumberOrNull(candidate.masterVolume);
  if (
    !isSampleAct(candidate.act) ||
    startRatio === null ||
    startRatio < 0 ||
    startRatio >= 1 ||
    startSeconds === null ||
    startSeconds < 0 ||
    candidate.segmentSeconds !== 30 ||
    typeof candidate.completedAt !== "string" ||
    masterVolume === null ||
    masterVolume < 0 ||
    masterVolume > 1
  ) {
    return null;
  }
  const sampleRateHz = finiteNumberOrNull(candidate.sampleRateHz);
  return {
    act: candidate.act,
    startRatio,
    startSeconds,
    segmentSeconds: 30,
    completedAt: candidate.completedAt,
    sampleRateHz:
      sampleRateHz !== null && sampleRateHz >= 8_000 && sampleRateHz <= 384_000
        ? sampleRateHz
        : null,
    masterVolume,
  };
}

function restoreAssessment(value: unknown): PairAssessment {
  if (!value || typeof value !== "object") return createAssessment();
  const candidate = value as {
    played?: Partial<Record<AudioAbSide, unknown>>;
    ratings?: Partial<Record<AudioAbCriterionId, unknown>>;
    note?: unknown;
  };
  const ratings: Partial<Record<AudioAbCriterionId, AudioAbRating>> = {};
  for (const criterion of AUDIO_AB_CRITERIA) {
    const rating = candidate.ratings?.[criterion.id];
    if (isRating(rating)) ratings[criterion.id] = rating;
  }
  return {
    played: {
      A: restorePlaybackEvidence(candidate.played?.A),
      B: restorePlaybackEvidence(candidate.played?.B),
    },
    ratings,
    note: typeof candidate.note === "string" ? candidate.note.slice(0, 2_000) : "",
  };
}

function restoreEnvironment(
  value: unknown,
  fallback: Partial<ListeningEnvironment>,
): ListeningEnvironment {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof ListeningEnvironment, unknown>>)
      : {};
  const sampleRateHz = finiteNumberOrNull(candidate.sampleRateHz);
  const masterVolume = finiteNumberOrNull(candidate.masterVolume);
  return {
    platform:
      typeof candidate.platform === "string"
        ? candidate.platform.slice(0, 120)
        : (fallback.platform ?? DEFAULT_ENVIRONMENT.platform),
    language:
      typeof candidate.language === "string"
        ? candidate.language.slice(0, 40)
        : (fallback.language ?? DEFAULT_ENVIRONMENT.language),
    sampleRateHz:
      sampleRateHz !== null && sampleRateHz >= 8_000 && sampleRateHz <= 384_000
        ? sampleRateHz
        : (fallback.sampleRateHz ?? null),
    masterVolume:
      masterVolume !== null && masterVolume >= 0 && masterVolume <= 1
        ? masterVolume
        : (fallback.masterVolume ?? null),
  };
}

export function restoreListeningSession(
  serialized: string | null,
  pairIds: readonly string[],
  timestamp: string,
  environment: Partial<ListeningEnvironment> = {},
): ListeningSession {
  if (!serialized) return createListeningSession(pairIds, timestamp, environment);
  try {
    const parsed = JSON.parse(serialized) as {
      version?: unknown;
      startedAt?: unknown;
      updatedAt?: unknown;
      environment?: unknown;
      assessments?: Record<string, unknown>;
    };
    if (parsed.version !== 4 || !parsed.assessments) {
      return createListeningSession(pairIds, timestamp, environment);
    }
    const restored = createListeningSession(pairIds, timestamp, environment);
    restored.startedAt =
      typeof parsed.startedAt === "string" ? parsed.startedAt : restored.startedAt;
    restored.updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : restored.updatedAt;
    restored.environment = restoreEnvironment(parsed.environment, environment);
    for (const pairId of pairIds) {
      restored.assessments[pairId] = restoreAssessment(parsed.assessments[pairId]);
    }
    return restored;
  } catch {
    return createListeningSession(pairIds, timestamp, environment);
  }
}

export function isAssessmentComplete(assessment: PairAssessment): boolean {
  return (
    assessment.played.A !== null &&
    assessment.played.B !== null &&
    AUDIO_AB_CRITERIA.every((criterion) => isRating(assessment.ratings[criterion.id]))
  );
}

export function getListeningPrimaryAction(assessment: PairAssessment): ListeningPrimaryAction {
  if (assessment.played.A === null) return "play-a";
  if (assessment.played.B === null) return "play-b";
  return isAssessmentComplete(assessment) ? "complete" : "rate";
}

export function updateAssessment(
  session: ListeningSession,
  pairId: string,
  updater: (assessment: PairAssessment) => PairAssessment,
  timestamp: string,
): ListeningSession {
  const current = session.assessments[pairId];
  if (!current) return session;
  return {
    ...session,
    updatedAt: timestamp,
    assessments: {
      ...session.assessments,
      [pairId]: updater(current),
    },
  };
}

export function updateListeningEnvironment(
  session: ListeningSession,
  environment: Partial<ListeningEnvironment>,
  timestamp: string,
): ListeningSession {
  return {
    ...session,
    updatedAt: timestamp,
    environment: {
      ...session.environment,
      ...environment,
    },
  };
}

export function getListeningProgress(
  session: ListeningSession,
  pairIds: readonly string[],
): ListeningProgress {
  const completed = pairIds.filter((pairId) =>
    isAssessmentComplete(session.assessments[pairId]!),
  ).length;
  const total = pairIds.length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

function criterionAverage(
  session: ListeningSession,
  pairIds: readonly string[],
  criterionId: AudioAbCriterionId,
): number {
  const values = pairIds
    .map((pairId) => session.assessments[pairId]!.ratings[criterionId])
    .filter(isRating);
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getListeningVerdict(
  session: ListeningSession,
  pairIds: readonly string[],
): ListeningVerdict {
  const progress = getListeningProgress(session, pairIds);
  const averages = Object.fromEntries(
    AUDIO_AB_CRITERIA.map((criterion) => [
      criterion.id,
      criterionAverage(session, pairIds, criterion.id),
    ]),
  ) as Record<AudioAbCriterionId, number>;
  const average =
    AUDIO_AB_CRITERIA.reduce((sum, criterion) => sum + averages[criterion.id], 0) /
    AUDIO_AB_CRITERIA.length;
  const weakestCriterion =
    progress.completed === 0
      ? null
      : AUDIO_AB_CRITERIA.reduce((weakest, criterion) =>
          averages[criterion.id] < averages[weakest.id] ? criterion : weakest,
        ).id;
  const hasCriticalFailure = pairIds.some((pairId) =>
    AUDIO_AB_CRITERIA.some((criterion) => session.assessments[pairId]!.ratings[criterion.id] === 1),
  );
  const complete = progress.completed === progress.total;
  const pass =
    complete &&
    !hasCriticalFailure &&
    average >= 2.6 &&
    averages.distinctness >= 2.7 &&
    averages.comfort >= 2.5 &&
    averages.fatigue >= 2.5;

  return {
    status: complete ? (pass ? "pass" : "review") : "incomplete",
    average,
    weakestCriterion,
    distinctnessAverage: averages.distinctness,
    comfortAverage: averages.comfort,
    fatigueAverage: averages.fatigue,
  };
}

function createListeningSchedule(pairIds: readonly string[]) {
  return pairIds.map((pairId, pairIndex) => {
    const plan = getListeningSamplePlan(pairIndex);
    return {
      pairId,
      act: plan.id,
      startRatio: plan.startRatio,
      segmentSeconds: 30,
    };
  });
}

export function formatListeningReport(
  session: ListeningSession,
  pairIds: readonly string[],
): string {
  return JSON.stringify(
    {
      product: "Fourier Garden",
      gate: "adjacent-chapter-mac-built-in-speaker-listening",
      protocolVersion: 4,
      requiredOutput: REQUIRED_LISTENING_OUTPUT,
      segmentSeconds: 30,
      actAnchors: LISTENING_SAMPLE_PLANS,
      schedule: createListeningSchedule(pairIds),
      progress: getListeningProgress(session, pairIds),
      verdict: getListeningVerdict(session, pairIds),
      session,
    },
    null,
    2,
  );
}
