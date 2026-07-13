import { ChevronLeft, ChevronRight, Expand, Info, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";

interface ControlBarProps {
  playing: boolean;
  volume: number;
  detailsOpen: boolean;
  detailsHintVisible: boolean;
  fullscreen: boolean;
  pattern: PatternDefinition;
  chapterCount: number;
  chapterIndex: number;
  switchingChapter: boolean;
  transport: Transport;
  onTogglePlay: () => void;
  onVolume: (value: number) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onToggleDetails: () => void;
  onDismissDetailsHint: () => void;
  onToggleFullscreen: () => void;
}

const DETAILS_HINT_DURATION_MS = 4_000;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function ControlBar({
  playing,
  volume,
  detailsOpen,
  detailsHintVisible,
  fullscreen,
  pattern,
  chapterCount,
  chapterIndex,
  switchingChapter,
  transport,
  onTogglePlay,
  onVolume,
  onPreviousChapter,
  onNextChapter,
  onToggleDetails,
  onDismissDetailsHint,
  onToggleFullscreen,
}: ControlBarProps) {
  const [time, setTime] = useState(() => Math.floor(transport.currentTime));
  const [detailsHintPaused, setDetailsHintPaused] = useState(false);

  useEffect(() => {
    let frame = 0;
    let displayedSecond = Math.floor(transport.currentTime);
    const update = () => {
      const nextSecond = Math.floor(transport.currentTime);
      if (nextSecond !== displayedSecond) {
        displayedSecond = nextSecond;
        setTime(nextSecond);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [transport]);

  useEffect(() => {
    if (!detailsHintVisible || detailsHintPaused) return;
    const timer = window.setTimeout(onDismissDetailsHint, DETAILS_HINT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [detailsHintPaused, detailsHintVisible, onDismissDetailsHint]);

  return (
    <footer className="controlBar" aria-label="再生コントロール">
      <div className="controlCluster controlCluster--play">
        <button
          className="primaryControl"
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "一時停止 (Space)" : "再生 (Space)"}
          aria-keyshortcuts="Space"
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <div className="controlText">
          <span>{playing ? "PAUSE" : "PLAY"}</span>
          <small>{playing ? "一時停止" : "再生"}</small>
        </div>
      </div>

      <div className="controlDivider" />

      <div className="volumeControl">
        <Volume2 aria-hidden="true" />
        <label>
          <span>VOLUME</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onInput={(event) => onVolume(Number(event.currentTarget.value))}
            aria-label="音量"
          />
        </label>
        <output>{Math.round(volume * 100)}%</output>
      </div>

      <div className="controlDivider controlDivider--middle" />

      <div className="chapterNavigator">
        {chapterCount > 1 && (
          <button
            className="chapterArrow"
            type="button"
            onClick={onPreviousChapter}
            disabled={switchingChapter || chapterIndex === 0}
            aria-label="前の章"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <div className="chapterControl" aria-live="polite">
          <span className="eyebrow">
            CHAPTER {String(pattern.order).padStart(2, "0")} /{" "}
            {String(chapterCount).padStart(2, "0")}
            {pattern.publication === "preview" && <b className="previewBadge">PREVIEW</b>}
          </span>
          <strong>{pattern.title.en}</strong>
          <small>{pattern.title.ja}</small>
        </div>
        {chapterCount > 1 && (
          <button
            className="chapterArrow"
            type="button"
            onClick={onNextChapter}
            disabled={switchingChapter || chapterIndex === chapterCount - 1}
            aria-label="次の章"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="timeDisplay">
        <span>{formatTime(time)}</span>
        <small>/ ∞</small>
      </div>

      <button
        className={`textControl detailsControl ${detailsOpen ? "isActive" : ""} ${
          detailsHintVisible ? "detailsControl--hint" : ""
        }`}
        type="button"
        onClick={onToggleDetails}
        onPointerEnter={() => setDetailsHintPaused(true)}
        onPointerLeave={() => setDetailsHintPaused(false)}
        onFocus={() => setDetailsHintPaused(true)}
        onBlur={() => setDetailsHintPaused(false)}
        aria-label={detailsOpen ? "詳細パネルを閉じる (D)" : "詳細パネルを開く (D)"}
        aria-pressed={detailsOpen}
        aria-keyshortcuts="D"
      >
        <Info aria-hidden="true" />
        <span className="detailsLabel">DETAILS</span>
        <span className="detailsHintCopy" aria-hidden={!detailsHintVisible}>
          <strong>OBSERVATION NOTES</strong>
          <small>この章を知る · D</small>
        </span>
      </button>

      <button
        className={`textControl ${fullscreen ? "isActive" : ""}`}
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "全画面を解除 (F)" : "全画面表示 (F)"}
        aria-pressed={fullscreen}
        aria-keyshortcuts="F"
      >
        <Expand aria-hidden="true" />
        <span>FULLSCREEN</span>
      </button>
    </footer>
  );
}
