import "@fontsource/inter/400.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/noto-serif-jp/400.css";
import "../styles.css";
import "../styles/audio-ab-qa.css";
import "../styles/responsive.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { AudioEngine } from "../audio/AudioEngine";
import type { PatternDefinition } from "../patterns/contracts";
import { patternPreviewRegistry } from "../patterns/registry";
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
  type AudioAbSide,
  type ListeningSampleAct,
} from "./chapterAudioAbModel";
import {
  AUDIO_AB_SESSION_STORAGE_KEY,
  clearRetiredListeningSessions,
} from "./chapterAudioAbStorage";

const SEGMENT_SECONDS = 30;

clearRetiredListeningSessions(window.localStorage);

interface ChapterPair {
  id: string;
  left: PatternDefinition;
  right: PatternDefinition;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getBrowserEnvironment() {
  return {
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
  };
}

function ChapterAudioAbQa() {
  const pairs = useMemo<ChapterPair[]>(
    () =>
      patternPreviewRegistry.slice(0, -1).map((left, index) => {
        const right = patternPreviewRegistry[index + 1]!;
        return {
          id: `${left.id}--${right.id}`,
          left,
          right,
        };
      }),
    [],
  );
  const pairIds = useMemo(() => pairs.map((pair) => pair.id), [pairs]);
  const [pairIndex, setPairIndex] = useState(0);
  const [session, setSession] = useState(() =>
    restoreListeningSession(
      window.localStorage.getItem(AUDIO_AB_SESSION_STORAGE_KEY),
      pairIds,
      nowIso(),
      getBrowserEnvironment(),
    ),
  );
  const [activeSide, setActiveSide] = useState<AudioAbSide | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(SEGMENT_SECONDS);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const audioRef = useRef<AudioEngine | null>(null);
  const stopTimer = useRef<number>(0);
  const progressTimer = useRef<number>(0);
  const generation = useRef(0);
  const playbackRef = useRef<{
    operation: number;
    pairId: string;
    side: AudioAbSide;
    act: ListeningSampleAct;
    startRatio: number;
    startSeconds: number;
    sampleRateHz: number | null;
    masterVolume: number;
  } | null>(null);
  const evaluationRef = useRef<HTMLElement | null>(null);
  const pair = pairs[pairIndex]!;
  const samplePlan = getListeningSamplePlan(pairIndex);
  const assessment = session.assessments[pair.id]!;
  const primaryAction = getListeningPrimaryAction(assessment);
  const ratingUnlocked = assessment.played.A !== null && assessment.played.B !== null;
  const assessmentComplete = isAssessmentComplete(assessment);
  const progress = useMemo(() => getListeningProgress(session, pairIds), [pairIds, session]);
  const verdict = useMemo(() => getListeningVerdict(session, pairIds), [pairIds, session]);
  const weakestCriterion = AUDIO_AB_CRITERIA.find(
    (criterion) => criterion.id === verdict.weakestCriterion,
  );

  useEffect(() => {
    window.localStorage.setItem(AUDIO_AB_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const clearPlaybackTimers = useCallback(() => {
    window.clearTimeout(stopTimer.current);
    window.clearInterval(progressTimer.current);
  }, []);

  const finishPlayback = useCallback(
    async (completed: boolean, expectedOperation?: number) => {
      const playback = playbackRef.current;
      if (expectedOperation !== undefined && playback?.operation !== expectedOperation) return;

      ++generation.current;
      clearPlaybackTimers();
      playbackRef.current = null;
      const audio = audioRef.current;
      audioRef.current = null;
      setActiveSide(null);
      setRemainingSeconds(SEGMENT_SECONDS);

      if (completed && playback) {
        setSession((current) =>
          updateAssessment(
            current,
            playback.pairId,
            (currentAssessment) => ({
              ...currentAssessment,
              played: {
                ...currentAssessment.played,
                [playback.side]: {
                  act: playback.act,
                  startRatio: playback.startRatio,
                  startSeconds: playback.startSeconds,
                  segmentSeconds: SEGMENT_SECONDS,
                  completedAt: nowIso(),
                  sampleRateHz: playback.sampleRateHz,
                  masterVolume: playback.masterVolume,
                },
              },
            }),
            nowIso(),
          ),
        );
      }
      if (audio) await audio.fadeOutAndDispose();
    },
    [clearPlaybackTimers],
  );

  const play = useCallback(
    async (pattern: PatternDefinition, side: AudioAbSide) => {
      const operation = ++generation.current;
      clearPlaybackTimers();
      const previous = audioRef.current;
      audioRef.current = null;
      playbackRef.current = null;
      if (previous) await previous.fadeOutAndDispose();
      if (operation !== generation.current) return;

      const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
      audioRef.current = audio;
      try {
        const startSeconds = pattern.audio.score.cycleSeconds * samplePlan.startRatio;
        await audio.play(startSeconds);
        if (operation !== generation.current) {
          await audio.fadeOutAndDispose();
          return;
        }

        const startedAt = performance.now();
        playbackRef.current = {
          operation,
          pairId: pair.id,
          side,
          act: samplePlan.id,
          startRatio: samplePlan.startRatio,
          startSeconds,
          sampleRateHz: audio.sampleRateHz,
          masterVolume: audio.currentVolume,
        };
        setSession((current) =>
          updateListeningEnvironment(
            current,
            {
              sampleRateHz: audio.sampleRateHz,
              masterVolume: audio.currentVolume,
            },
            nowIso(),
          ),
        );
        setActiveSide(side);
        setRemainingSeconds(SEGMENT_SECONDS);
        setError("");
        progressTimer.current = window.setInterval(() => {
          const elapsedSeconds = (performance.now() - startedAt) / 1_000;
          setRemainingSeconds(Math.max(0, Math.ceil(SEGMENT_SECONDS - elapsedSeconds)));
        }, 200);
        stopTimer.current = window.setTimeout(
          () => void finishPlayback(true, operation),
          SEGMENT_SECONDS * 1_000,
        );
      } catch (reason) {
        if (audioRef.current === audio) audioRef.current = null;
        await audio.dispose();
        setActiveSide(null);
        setRemainingSeconds(SEGMENT_SECONDS);
        setError(reason instanceof Error ? reason.message : "音声を開始できませんでした");
      }
    },
    [clearPlaybackTimers, finishPlayback, pair.id, samplePlan],
  );

  const selectPair = useCallback(
    (nextPairIndex: number) => {
      void finishPlayback(false);
      setPairIndex(nextPairIndex);
      setCopyStatus("");
    },
    [finishPlayback],
  );

  const activatePrimaryAction = useCallback(() => {
    if (activeSide !== null) return;
    if (primaryAction === "play-a") {
      void play(pair.left, "A");
      return;
    }
    if (primaryAction === "play-b") {
      void play(pair.right, "B");
      return;
    }
    if (primaryAction === "rate") {
      evaluationRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      evaluationRef.current?.focus({ preventScroll: true });
    }
  }, [activeSide, pair.left, pair.right, play, primaryAction]);

  const rate = useCallback(
    (criterionId: (typeof AUDIO_AB_CRITERIA)[number]["id"], rating: AudioAbRating) => {
      setSession((current) =>
        updateAssessment(
          current,
          pair.id,
          (currentAssessment) => ({
            ...currentAssessment,
            ratings: {
              ...currentAssessment.ratings,
              [criterionId]: rating,
            },
          }),
          nowIso(),
        ),
      );
    },
    [pair.id],
  );

  const updateNote = useCallback(
    (note: string) => {
      setSession((current) =>
        updateAssessment(
          current,
          pair.id,
          (currentAssessment) => ({
            ...currentAssessment,
            note: note.slice(0, 2_000),
          }),
          nowIso(),
        ),
      );
    },
    [pair.id],
  );

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatListeningReport(session, pairIds));
      setCopyStatus("REPORT COPIED");
    } catch {
      setCopyStatus("コピーできませんでした。ブラウザの権限を確認してください。");
    }
  }, [pairIds, session]);

  const resetSession = useCallback(() => {
    if (!window.confirm("保存済みの試聴結果をすべて消去して、最初から始めますか？")) return;
    void finishPlayback(false);
    setSession(createListeningSession(pairIds, nowIso(), getBrowserEnvironment()));
    setPairIndex(0);
    setCopyStatus("");
  }, [finishPlayback, pairIds]);

  useEffect(
    () => () => {
      ++generation.current;
      clearPlaybackTimers();
      void audioRef.current?.dispose();
      audioRef.current = null;
      playbackRef.current = null;
    },
    [clearPlaybackTimers],
  );

  const verdictLabel =
    verdict.status === "pass"
      ? "OPTIONAL SESSION · PASS"
      : verdict.status === "review"
        ? "OPTIONAL SESSION · REVIEW"
        : "OPTIONAL SESSION · NOT STARTED";

  return (
    <main className="audioAbQa">
      <header>
        <p>FOURIER GARDEN · OPTIONAL MAC SPEAKER A/B ARCHIVE</p>
        <h1>Adjacent Chapter A/B</h1>
        <span>
          2026年8月12日の全9比較を最後の人間試聴として確定しました。このページは任意の
          回帰確認用であり、現行版の公開判定や完了条件ではありません。
        </span>
      </header>

      <section
        className={`audioAbQa__start ${activeSide !== null ? "is-playing" : ""}`}
        aria-labelledby="listening-start-heading"
      >
        <div className="audioAbQa__startCopy">
          <span>{activeSide !== null ? "AUDIO IS PLAYING" : "ONE CLICK TO BEGIN"}</span>
          <h2 id="listening-start-heading">
            {activeSide !== null
              ? `${activeSide}を再生中 · 残り${remainingSeconds}秒`
              : primaryAction === "play-a"
                ? "ボタンを押すと音声が始まります"
                : primaryAction === "play-b"
                  ? "次はBを30秒聴きます"
                  : primaryAction === "rate"
                    ? "A/Bの評価を記録します"
                    : "この比較は記録済みです"}
          </h2>
          <p>
            {activeSide !== null
              ? "Mac内蔵スピーカーの音量、音像の芯、左右の広がりを確認しながら、30秒間そのまま聴いてください。"
              : "ブラウザは安全のため音声を自動再生しません。Mac本体の内蔵スピーカーを使い、下のボタンを一度押してください。"}
          </p>
        </div>

        <ol className="audioAbQa__startSteps" aria-label="現在の比較手順">
          <li
            className={assessment.played.A ? "is-complete" : activeSide === "A" ? "is-active" : ""}
          >
            <span>1</span>
            <div>
              <strong>Aを30秒</strong>
              <small>{assessment.played.A ? "完聴済み" : "最初に再生"}</small>
            </div>
          </li>
          <li
            className={assessment.played.B ? "is-complete" : activeSide === "B" ? "is-active" : ""}
          >
            <span>2</span>
            <div>
              <strong>Bを30秒</strong>
              <small>{assessment.played.B ? "完聴済み" : "次に再生"}</small>
            </div>
          </li>
          <li
            className={
              assessmentComplete ? "is-complete" : primaryAction === "rate" ? "is-active" : ""
            }
          >
            <span>3</span>
            <div>
              <strong>5項目を評価</strong>
              <small>{assessmentComplete ? "記録済み" : "最後に記録"}</small>
            </div>
          </li>
        </ol>

        <div className="audioAbQa__startAction">
          <button
            className="audioAbQa__startButton"
            type="button"
            disabled={activeSide !== null || primaryAction === "complete"}
            onClick={activatePrimaryAction}
          >
            {activeSide !== null
              ? `PLAYING ${activeSide} · ${remainingSeconds}s`
              : primaryAction === "play-a"
                ? "試聴を開始 · Aを30秒再生"
                : primaryAction === "play-b"
                  ? "続ける · Bを30秒再生"
                  : primaryAction === "rate"
                    ? "評価へ進む"
                    : "この比較は完了済み"}
          </button>
          {activeSide !== null && (
            <>
              <progress
                max={SEGMENT_SECONDS}
                value={SEGMENT_SECONDS - remainingSeconds}
                aria-label={`${activeSide}の試聴進捗`}
              />
              <button
                className="audioAbQa__startStop"
                type="button"
                onClick={() => void finishPlayback(false)}
              >
                STOP
              </button>
            </>
          )}
          <span aria-live="polite">
            {error ||
              (activeSide !== null
                ? `${activeSide}を再生中です`
                : "自動再生は行いません。必ずボタン操作から開始します。")}
          </span>
        </div>
      </section>

      <section className="audioAbQa__session" aria-labelledby="listening-session-heading">
        <div className="audioAbQa__sessionHeading">
          <div>
            <span>PHYSICAL LISTENING SESSION</span>
            <h2 id="listening-session-heading">
              {progress.completed} / {progress.total} comparisons
            </h2>
          </div>
          <strong>{progress.percent}%</strong>
        </div>
        <progress max={progress.total} value={progress.completed}>
          {progress.percent}%
        </progress>
        <div className="audioAbQa__fixedOutput" aria-label="必須の試聴環境">
          <span>REQUIRED OUTPUT</span>
          <strong>{REQUIRED_LISTENING_OUTPUT.label}</strong>
          <small>Mac本体の内蔵スピーカーのみ</small>
        </div>
        <p>通常の鑑賞音量で、音像の芯・中域の明瞭さ・余韻の連続性・章差を確認してください。</p>
      </section>

      <section className="audioAbQa__sampleProtocol" aria-labelledby="sample-window-heading">
        <div>
          <span>CURRENT SAMPLE WINDOW</span>
          <h2 id="sample-window-heading">
            {samplePlan.label} · {samplePlan.labelJa}
          </h2>
          <p>{samplePlan.purpose}</p>
        </div>
        <ol aria-label="試聴区間ローテーション">
          {LISTENING_SAMPLE_PLANS.map((plan) => (
            <li key={plan.id} className={plan.id === samplePlan.id ? "is-active" : ""}>
              <span>{Math.round(plan.startRatio * 100)}%</span>
              <small>{plan.label}</small>
            </li>
          ))}
        </ol>
        <dl>
          <div>
            <dt>実機</dt>
            <dd>{REQUIRED_LISTENING_OUTPUT.label}</dd>
          </div>
          <div>
            <dt>AudioContext</dt>
            <dd>
              {session.environment.sampleRateHz
                ? `${session.environment.sampleRateHz.toLocaleString()} Hz`
                : "最初の再生時に記録"}
            </dd>
          </div>
          <div>
            <dt>Master</dt>
            <dd>
              {session.environment.masterVolume === null
                ? "最初の再生時に記録"
                : `${Math.round(session.environment.masterVolume * 100)}%`}
            </dd>
          </div>
        </dl>
      </section>

      <label className="audioAbQa__pair">
        <span>
          PAIR {String(pairIndex + 1).padStart(2, "0")} / {String(pairs.length).padStart(2, "0")}
        </span>
        比較する隣接章
        <select value={pairIndex} onChange={(event) => selectPair(Number(event.target.value))}>
          {pairs.map((candidate, index) => {
            const candidateAssessment = session.assessments[candidate.id]!;
            return (
              <option key={candidate.id} value={index}>
                {isAssessmentComplete(candidateAssessment) ? "✓ " : ""}
                {candidate.left.order}. {candidate.left.title.en} / {candidate.right.order}.{" "}
                {candidate.right.title.en}
              </option>
            );
          })}
        </select>
      </label>

      <section className="audioAbQa__cards" aria-label="A/B比較">
        {(
          [
            { pattern: pair.left, side: "A" },
            { pattern: pair.right, side: "B" },
          ] as const
        ).map(({ pattern, side }) => (
          <article key={pattern.id} className={activeSide === side ? "is-active" : ""}>
            <div className="audioAbQa__cardMeta">
              <span>
                {side} · CHAPTER {String(pattern.order).padStart(2, "0")}
              </span>
              <span className={assessment.played[side] ? "is-complete" : ""}>
                {assessment.played[side]
                  ? `${assessment.played[side].act.toUpperCase()} COMPLETE`
                  : "NOT HEARD"}
              </span>
            </div>
            <h2>{pattern.title.en}</h2>
            <p>{pattern.title.ja}</p>
            <small>{pattern.subtitle.ja}</small>
            <dl>
              <div>
                <dt>音色</dt>
                <dd>{pattern.contrastProfile.timbre}</dd>
              </div>
              <div>
                <dt>リズム</dt>
                <dd>{pattern.contrastProfile.audio.onsetPattern}</dd>
              </div>
              <div>
                <dt>空間</dt>
                <dd>{pattern.contrastProfile.audio.spatialGesture}</dd>
              </div>
              <div>
                <dt>区間</dt>
                <dd>
                  {samplePlan.label} ·{" "}
                  {(pattern.audio.score.cycleSeconds * samplePlan.startRatio).toFixed(1)}秒から
                </dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={activeSide !== null}
              onClick={() => void play(pattern, side)}
            >
              {activeSide === side
                ? `PLAYING · ${remainingSeconds}s`
                : assessment.played[side]
                  ? `REPLAY ${side} · ${samplePlan.label}`
                  : `PLAY ${side} · ${samplePlan.label} · 30s`}
            </button>
            {activeSide === side && (
              <progress
                className="audioAbQa__playProgress"
                max={SEGMENT_SECONDS}
                value={SEGMENT_SECONDS - remainingSeconds}
                aria-label={`${pattern.title.en}の試聴進捗`}
              />
            )}
          </article>
        ))}
      </section>

      <div className="audioAbQa__transport">
        <button
          className="audioAbQa__stop"
          type="button"
          disabled={activeSide === null}
          onClick={() => void finishPlayback(false)}
        >
          STOP · 中断した試聴は完了になりません
        </button>
        {error && <p className="audioAbQa__error">{error}</p>}
      </div>

      <section
        ref={evaluationRef}
        className="audioAbQa__evaluation"
        aria-labelledby="evaluation-heading"
        tabIndex={-1}
      >
        <div className="audioAbQa__evaluationHeading">
          <div>
            <span>PAIR EVALUATION · MAC BUILT-IN SPEAKERS · {samplePlan.label}</span>
            <h2 id="evaluation-heading">A/Bを聴いた直後に評価</h2>
          </div>
          <strong className={assessmentComplete ? "is-complete" : ""}>
            {assessmentComplete
              ? "RECORDED"
              : ratingUnlocked
                ? "RATING REQUIRED"
                : "LISTEN TO A + B"}
          </strong>
        </div>
        <fieldset disabled={!ratingUnlocked}>
          <legend>
            1は要修正、2は許容、3は公開品質です。1がひとつでもあれば最終判定は要確認になります。
          </legend>
          <div className="audioAbQa__criteria">
            {AUDIO_AB_CRITERIA.map((criterion) => (
              <div className="audioAbQa__ratingRow" key={criterion.id}>
                <div>
                  <strong>{criterion.label}</strong>
                  <small>
                    1 {criterion.low} · 2 {criterion.middle} · 3 {criterion.high}
                  </small>
                </div>
                <div>
                  {([1, 2, 3] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={assessment.ratings[criterion.id] === rating ? "is-selected" : ""}
                      aria-pressed={assessment.ratings[criterion.id] === rating}
                      onClick={() => rate(criterion.id, rating)}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="audioAbQa__note">
            気になった時刻・音色・左右差（任意）
            <textarea
              rows={3}
              maxLength={2_000}
              value={assessment.note}
              placeholder="例: Bの12秒付近で高域が鋭い / AとBの定位運動が似て聞こえる"
              onChange={(event) => updateNote(event.target.value)}
            />
          </label>
        </fieldset>
      </section>

      <nav className="audioAbQa__navigation" aria-label="比較ペアの移動">
        <button type="button" disabled={pairIndex === 0} onClick={() => selectPair(pairIndex - 1)}>
          ← PREVIOUS
        </button>
        <span>
          {assessmentComplete ? "この比較は保存済みです" : "A/B各30秒と5項目の評価で次へ進めます"}
        </span>
        <button
          type="button"
          disabled={!assessmentComplete || pairIndex === pairs.length - 1}
          onClick={() => selectPair(pairIndex + 1)}
        >
          NEXT →
        </button>
      </nav>

      <section
        className={`audioAbQa__verdict audioAbQa__verdict--${verdict.status}`}
        aria-labelledby="verdict-heading"
      >
        <div>
          <span>RELEASE GATE</span>
          <h2 id="verdict-heading">{verdictLabel}</h2>
          <p>
            全体平均 {verdict.average.toFixed(2)} / 3 · 章独立性{" "}
            {verdict.distinctnessAverage.toFixed(2)} · 聴きやすさ{" "}
            {verdict.comfortAverage.toFixed(2)} · 疲労耐性 {verdict.fatigueAverage.toFixed(2)}
          </p>
          {weakestCriterion && <small>現在の最弱軸: {weakestCriterion.label}</small>}
        </div>
        <div className="audioAbQa__reportActions">
          <button type="button" onClick={() => void copyReport()}>
            COPY JSON REPORT
          </button>
          <button className="audioAbQa__reset" type="button" onClick={resetSession}>
            RESET SESSION
          </button>
          <span aria-live="polite">{copyStatus || "結果はこのブラウザに自動保存されます"}</span>
        </div>
      </section>

      <footer>
        合格条件: 9比較完了 · 評価1なし · 全体平均2.60以上 · 章独立性2.70以上 ·
        聴きやすさ／疲労耐性2.50以上
      </footer>
    </main>
  );
}

const rootElement = document.getElementById("chapter-audio-ab-root");
if (!rootElement) throw new Error("Audio A/B QA root is missing");
const audioAbQaRoot =
  (import.meta.hot?.data.audioAbQaRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.audioAbQaRoot = audioAbQaRoot;
audioAbQaRoot.render(<ChapterAudioAbQa />);
