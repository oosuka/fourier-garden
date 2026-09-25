import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Info,
  Pause,
  Play,
  Volume2,
  VolumeX,
  List,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";

interface ControlBarProps {
  playing: boolean;
  startingPlayback?: boolean;
  volume: number;
  detailsOpen: boolean;
  detailsHintVisible: boolean;
  fullscreen: boolean;
  pattern: PatternDefinition;
  chapterCount: number;
  chapterIndex: number;
  switchingChapter: boolean;
  transport: Transport;
  muted?: boolean;
  indexOpen?: boolean;
  onTogglePlay: () => void;
  onVolume: (value: number) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onToggleDetails: () => void;
  onDismissDetailsHint: () => void;
  onToggleFullscreen: () => void;
  onToggleMute?: () => void;
  onToggleIndex?: () => void;
}
function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function ControlBar({
  playing,
  startingPlayback = false,
  volume,
  detailsOpen,
  detailsHintVisible,
  fullscreen,
  pattern,
  chapterCount,
  chapterIndex,
  switchingChapter,
  transport,
  muted = false,
  indexOpen = false,
  onTogglePlay,
  onVolume,
  onPreviousChapter,
  onNextChapter,
  onToggleDetails,
  onDismissDetailsHint,
  onToggleFullscreen,
  onToggleMute,
  onToggleIndex,
}: ControlBarProps) {
  const [time, setTime] = useState(() => Math.floor(transport.currentTime));
  const [detailsHintPaused, setDetailsHintPaused] = useState(false);
  useEffect(() => {
    let frame = 0;
    let displayedSecond = Number.NaN;
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
    const timer = window.setTimeout(onDismissDetailsHint, 4_000);
    return () => window.clearTimeout(timer);
  }, [detailsHintPaused, detailsHintVisible, onDismissDetailsHint]);
  const progress = (time % pattern.dramaturgy.cycleSeconds) / pattern.dramaturgy.cycleSeconds;
  const act = pattern.dramaturgy.sections.findIndex((section) => progress < section.endRatio);
  return (
    <footer className="controlBar" aria-label="再生コントロール">
      <div className="controlCluster controlCluster--play">
        <button
          className="primaryControl"
          type="button"
          onClick={onTogglePlay}
          disabled={switchingChapter}
          aria-label={
            startingPlayback
              ? "開始を取り消す (Space)"
              : playing
                ? "一時停止 (Space)"
                : "再生 (Space)"
          }
          aria-keyshortcuts="Space"
        >
          {startingPlayback ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : playing ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </button>
        <div className="volumeControl">
          <button
            className="iconButton"
            onClick={onToggleMute}
            type="button"
            aria-label={muted ? "音をオンにする (M)" : "音をオフにする (M)"}
            aria-pressed={muted}
            aria-keyshortcuts="M"
          >
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            aria-label="音量"
            aria-valuetext={`${Math.round(volume * 100)}%${muted ? "・消音中" : ""}`}
            onInput={(event) => onVolume(Number(event.currentTarget.value))}
          />
          <output>{Math.round(volume * 100)}%</output>
        </div>
        <div className="timeDisplay">
          <span>{formatTime(time)}</span>
        </div>
      </div>
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
        <button
          className="chapterControl"
          type="button"
          onClick={onToggleIndex}
          aria-label="章を選ぶ (C)"
          aria-expanded={indexOpen}
          aria-controls="chapter-index"
          aria-keyshortcuts="C"
        >
          <span className="chapterNumber">
            {String(pattern.order).padStart(2, "0")}
            <small> / {String(chapterCount).padStart(2, "0")}</small>
          </span>
          <span className="chapterName">
            <strong>{pattern.title.en}</strong>
            <small>{pattern.title.ja}</small>
          </span>
          <List aria-hidden="true" />
        </button>
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
      <div className="controlCluster controlCluster--tools">
        <button
          className={`textControl detailsControl ${detailsOpen ? "isActive" : ""} ${detailsHintVisible ? "detailsControl--hint" : ""}`}
          type="button"
          onClick={onToggleDetails}
          onPointerEnter={() => setDetailsHintPaused(true)}
          onPointerLeave={() => setDetailsHintPaused(false)}
          onFocus={() => setDetailsHintPaused(true)}
          onBlur={() => setDetailsHintPaused(false)}
          aria-label={detailsOpen ? "詳細パネルを閉じる (D)" : "詳細パネルを開く (D)"}
          aria-pressed={detailsOpen}
          aria-keyshortcuts="D"
          aria-controls="observation-notes"
        >
          <Info aria-hidden="true" />
          <span className="detailsLabel">観察ノート</span>
          <span className="detailsHintCopy" aria-hidden={!detailsHintVisible}>
            <strong>OBSERVATION NOTES</strong>
            <small>この章を知る · D</small>
          </span>
        </button>
        <button
          className={`iconButton fullscreenControl ${fullscreen ? "isActive" : ""}`}
          type="button"
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? "全画面を解除 (F)" : "全画面表示 (F)"}
          aria-pressed={fullscreen}
          aria-keyshortcuts="F"
        >
          <Expand aria-hidden="true" />
        </button>
      </div>
      <div
        className="actTimeline"
        aria-label={`時間構成・第${act + 1}幕 / ${pattern.dramaturgy.sections.length}幕`}
      >
        {pattern.dramaturgy.sections.map((section, index) => (
          <span
            key={section.id}
            className={index === act ? "isCurrent" : index < act ? "isPast" : ""}
            style={{ flexGrow: section.endRatio - section.startRatio }}
            title={section.id}
          />
        ))}
      </div>
    </footer>
  );
}
