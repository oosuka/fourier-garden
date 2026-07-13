import "@fontsource/inter/400.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/noto-serif-jp/400.css";
import "../styles.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { AudioEngine } from "../audio/AudioEngine";
import type { PatternDefinition } from "../patterns/contracts";
import { patternPreviewRegistry } from "../patterns/registry";

const SEGMENT_SECONDS = 20;

function ChapterAudioAbQa() {
  const pairs = useMemo(
    () =>
      patternPreviewRegistry.slice(0, -1).map((left, index) => ({
        left,
        right: patternPreviewRegistry[index + 1]!,
      })),
    [],
  );
  const [pairIndex, setPairIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<AudioEngine | null>(null);
  const stopTimer = useRef<number>(0);
  const generation = useRef(0);
  const pair = pairs[pairIndex]!;

  const stop = useCallback(async () => {
    ++generation.current;
    window.clearTimeout(stopTimer.current);
    const audio = audioRef.current;
    audioRef.current = null;
    setActiveId(null);
    if (audio) await audio.fadeOutAndDispose();
  }, []);

  const play = useCallback(
    async (pattern: PatternDefinition) => {
      const operation = ++generation.current;
      window.clearTimeout(stopTimer.current);
      const previous = audioRef.current;
      audioRef.current = null;
      if (previous) await previous.fadeOutAndDispose();
      if (operation !== generation.current) return;

      const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
      audioRef.current = audio;
      try {
        await audio.play(pattern.audio.score.cycleSeconds * 0.42);
        if (operation !== generation.current) {
          await audio.fadeOutAndDispose();
          return;
        }
        setActiveId(pattern.id);
        setError("");
        stopTimer.current = window.setTimeout(() => void stop(), SEGMENT_SECONDS * 1_000);
      } catch (reason) {
        if (audioRef.current === audio) audioRef.current = null;
        await audio.dispose();
        setActiveId(null);
        setError(reason instanceof Error ? reason.message : "音声を開始できませんでした");
      }
    },
    [stop],
  );

  useEffect(
    () => () => {
      ++generation.current;
      window.clearTimeout(stopTimer.current);
      void audioRef.current?.dispose();
      audioRef.current = null;
    },
    [],
  );

  return (
    <main className="audioAbQa">
      <header>
        <p>FOURIER GARDEN · HUMAN LISTENING GATE</p>
        <h1>Adjacent Chapter A/B</h1>
        <span>隣接章の代表20秒を、同一master volumeと検証済みRMS正規化で交互再生します。</span>
      </header>

      <label className="audioAbQa__pair">
        比較する隣接章
        <select
          value={pairIndex}
          onChange={(event) => {
            void stop();
            setPairIndex(Number(event.target.value));
          }}
        >
          {pairs.map((candidate, index) => (
            <option key={candidate.left.id} value={index}>
              {candidate.left.order}. {candidate.left.title.en} / {candidate.right.order}.{" "}
              {candidate.right.title.en}
            </option>
          ))}
        </select>
      </label>

      <section className="audioAbQa__cards" aria-label="A/B比較">
        {([pair.left, pair.right] as const).map((pattern, index) => (
          <article key={pattern.id} className={activeId === pattern.id ? "is-active" : ""}>
            <span>
              {index === 0 ? "A" : "B"} · CHAPTER {String(pattern.order).padStart(2, "0")}
            </span>
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
            </dl>
            <button type="button" onClick={() => void play(pattern)}>
              {activeId === pattern.id ? "PLAYING 20s" : `PLAY ${index === 0 ? "A" : "B"}`}
            </button>
          </article>
        ))}
      </section>

      <button className="audioAbQa__stop" type="button" onClick={() => void stop()}>
        STOP
      </button>
      {error && <p className="audioAbQa__error">{error}</p>}
      <footer>
        評価: ピコらしさ · 聞きやすさ · 数学との因果 · 隣章との差 · 30秒後の疲労 · 没入感
      </footer>
    </main>
  );
}

const root = document.getElementById("chapter-audio-ab-root");
if (!root) throw new Error("Audio A/B QA root is missing");
createRoot(root).render(<ChapterAudioAbQa />);
