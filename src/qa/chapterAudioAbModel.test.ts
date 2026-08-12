import { describe, expect, it } from "vitest";

import {
  AUDIO_AB_CRITERIA,
  LISTENING_SAMPLE_PLANS,
  REQUIRED_LISTENING_OUTPUT,
  createListeningSession,
  formatListeningReport,
  getListeningProgress,
  getListeningPrimaryAction,
  getListeningSamplePlan,
  getListeningVerdict,
  isAssessmentComplete,
  restoreListeningSession,
  updateAssessment,
  updateListeningEnvironment,
  type AudioAbRating,
  type ListeningSession,
  type PlaybackEvidence,
} from "./chapterAudioAbModel";

const PAIR_IDS = ["chapter-1--chapter-2", "chapter-2--chapter-3"] as const;
const TIMESTAMP = "2026-07-24T00:00:00.000Z";

function createEvidence(pairIndex: number): PlaybackEvidence {
  const plan = getListeningSamplePlan(pairIndex);
  return {
    act: plan.id,
    startRatio: plan.startRatio,
    startSeconds: plan.startRatio * 60,
    segmentSeconds: 30,
    completedAt: TIMESTAMP,
    sampleRateHz: 48_000,
    masterVolume: 0.35,
  };
}

function completeAssessment(
  session: ListeningSession,
  pairId: string,
  pairIndex: number,
  rating: AudioAbRating,
): ListeningSession {
  const evidence = createEvidence(pairIndex);
  return updateAssessment(
    session,
    pairId,
    (assessment) => ({
      ...assessment,
      played: { A: evidence, B: evidence },
      ratings: Object.fromEntries(AUDIO_AB_CRITERIA.map((criterion) => [criterion.id, rating])),
    }),
    TIMESTAMP,
  );
}

function completeSession(rating: AudioAbRating = 3): ListeningSession {
  let session = createListeningSession(PAIR_IDS, TIMESTAMP);
  for (const [pairIndex, pairId] of PAIR_IDS.entries()) {
    session = completeAssessment(session, pairId, pairIndex, rating);
  }
  return session;
}

describe("chapter audio A/B listening model", () => {
  it("creates one Mac built-in speaker assessment for every adjacent pair", () => {
    const session = createListeningSession(PAIR_IDS, TIMESTAMP);

    expect(session.version).toBe(4);
    expect(REQUIRED_LISTENING_OUTPUT.id).toBe("mac-built-in-speakers");
    expect(Object.keys(session.assessments)).toEqual(PAIR_IDS);
    expect(getListeningProgress(session, PAIR_IDS)).toEqual({
      completed: 0,
      total: 2,
      percent: 0,
    });
  });

  it("rotates opening, middle, and loop bridge evenly across the speaker-only schedule", () => {
    const ninePairIds = Array.from({ length: 9 }, (_, index) => `pair-${index}`);

    const acts = ninePairIds.map((_, index) => getListeningSamplePlan(index).id);
    for (const plan of LISTENING_SAMPLE_PLANS) {
      expect(acts.filter((act) => act === plan.id)).toHaveLength(3);
    }
    expect(getListeningSamplePlan(0).id).toBe("opening");
    expect(getListeningSamplePlan(1).id).toBe("middle");
    expect(getListeningSamplePlan(2).id).toBe("loop-bridge");
    expect(() => getListeningSamplePlan(-1)).toThrow(/non-negative/i);
  });

  it("requires both recorded samples and all five ratings", () => {
    const session = createListeningSession(PAIR_IDS, TIMESTAMP);
    const assessment = session.assessments[PAIR_IDS[0]]!;

    expect(isAssessmentComplete(assessment)).toBe(false);
    const evidence = createEvidence(0);
    assessment.played.A = evidence;
    assessment.played.B = evidence;
    for (const criterion of AUDIO_AB_CRITERIA.slice(0, -1)) {
      assessment.ratings[criterion.id] = 3;
    }
    expect(isAssessmentComplete(assessment)).toBe(false);
    assessment.ratings.fatigue = 3;
    expect(isAssessmentComplete(assessment)).toBe(true);
  });

  it("guides the listener from A to B and then to the rating form", () => {
    const assessment = createListeningSession(PAIR_IDS, TIMESTAMP).assessments[PAIR_IDS[0]]!;
    const evidence = createEvidence(0);

    expect(getListeningPrimaryAction(assessment)).toBe("play-a");
    assessment.played.A = evidence;
    expect(getListeningPrimaryAction(assessment)).toBe("play-b");
    assessment.played.B = evidence;
    expect(getListeningPrimaryAction(assessment)).toBe("rate");
    for (const criterion of AUDIO_AB_CRITERIA) assessment.ratings[criterion.id] = 3;
    expect(getListeningPrimaryAction(assessment)).toBe("complete");
  });

  it("restores only valid version-four speaker evidence and truncates notes", () => {
    const evidence = createEvidence(0);
    const serialized = JSON.stringify({
      version: 4,
      startedAt: "2026-07-23T00:00:00.000Z",
      environment: {
        platform: "MacIntel",
        language: "ja-JP",
        sampleRateHz: 48_000,
        masterVolume: 0.35,
      },
      assessments: {
        [PAIR_IDS[0]]: {
          played: { A: evidence, B: { ...evidence, segmentSeconds: 20 } },
          ratings: { comfort: 3, distinctness: 4 },
          note: "x".repeat(2_100),
        },
      },
    });
    const restored = restoreListeningSession(serialized, PAIR_IDS, TIMESTAMP);
    const assessment = restored.assessments[PAIR_IDS[0]]!;

    expect(restored.startedAt).toBe("2026-07-23T00:00:00.000Z");
    expect(restored.environment).toMatchObject({
      platform: "MacIntel",
      sampleRateHz: 48_000,
      masterVolume: 0.35,
    });
    expect(assessment.played).toEqual({ A: evidence, B: null });
    expect(assessment.ratings).toEqual({ comfort: 3 });
    expect(assessment.note).toHaveLength(2_000);
    expect(restoreListeningSession('{"version":3}', PAIR_IDS, TIMESTAMP)).toEqual(
      createListeningSession(PAIR_IDS, TIMESTAMP),
    );
  });

  it("records the actual audio environment without changing assessments", () => {
    const session = createListeningSession(PAIR_IDS, TIMESTAMP, {
      platform: "MacIntel",
      language: "ja-JP",
    });
    const updated = updateListeningEnvironment(
      session,
      { sampleRateHz: 48_000, masterVolume: 0.42 },
      "2026-07-24T00:01:00.000Z",
    );

    expect(updated.environment).toEqual({
      platform: "MacIntel",
      language: "ja-JP",
      sampleRateHz: 48_000,
      masterVolume: 0.42,
    });
    expect(updated.assessments).toEqual(session.assessments);
  });

  it("reports a pass only after every built-in-speaker comparison clears the thresholds", () => {
    const incomplete = createListeningSession(PAIR_IDS, TIMESTAMP);
    const complete = completeSession();

    expect(getListeningVerdict(incomplete, PAIR_IDS).status).toBe("incomplete");
    expect(getListeningVerdict(complete, PAIR_IDS)).toMatchObject({
      status: "pass",
      average: 3,
      distinctnessAverage: 3,
      comfortAverage: 3,
      fatigueAverage: 3,
    });
    expect(getListeningProgress(complete, PAIR_IDS)).toMatchObject({
      completed: 2,
      percent: 100,
    });
  });

  it("requires review when any completed assessment contains a critical rating", () => {
    let session = completeSession();
    session = updateAssessment(
      session,
      PAIR_IDS[1],
      (assessment) => ({
        ...assessment,
        ratings: {
          ...assessment.ratings,
          comfort: 1,
        },
      }),
      TIMESTAMP,
    );

    expect(getListeningVerdict(session, PAIR_IDS).status).toBe("review");
  });

  it("formats a portable report with act schedule and playback evidence", () => {
    const report = JSON.parse(formatListeningReport(completeSession(), PAIR_IDS)) as {
      gate: string;
      protocolVersion: number;
      segmentSeconds: number;
      actAnchors: unknown[];
      requiredOutput: { id: string };
      schedule: Array<{ act: string }>;
      progress: { completed: number };
      verdict: { status: string };
    };

    expect(report).toMatchObject({
      gate: "adjacent-chapter-mac-built-in-speaker-listening",
      protocolVersion: 4,
      requiredOutput: { id: "mac-built-in-speakers" },
      segmentSeconds: 30,
      progress: { completed: 2 },
      verdict: { status: "pass" },
    });
    expect(report.actAnchors).toHaveLength(3);
    expect(report.schedule.map((entry) => entry.act)).toEqual(["opening", "middle"]);
  });
});
