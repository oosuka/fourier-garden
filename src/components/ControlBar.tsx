import {
  Expand,
  Info,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/types";

interface ControlBarProps {
  playing: boolean;
  volume: number;
  detailsOpen: boolean;
  fullscreen: boolean;
  pattern: PatternDefinition;
  chapterCount: number;
  transport: Transport;
  onTogglePlay: () => void;
  onVolume: (value: number) => void;
  onToggleDetails: () => void;
  onToggleFullscreen: () => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function ControlBar({
  playing,
  volume,
  detailsOpen,
  fullscreen,
  pattern,
  chapterCount,
  transport,
  onTogglePlay,
  onVolume,
  onToggleDetails,
  onToggleFullscreen,
}: ControlBarProps) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setTime(transport.currentTime);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [transport]);

  return (
    <footer className="controlBar" aria-label="再生コントロール">
      <div className="controlCluster controlCluster--play">
        <button
          className="primaryControl"
          onClick={onTogglePlay}
          aria-label={playing ? "一時停止" : "再生"}
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

      <div className="chapterControl">
        <span className="eyebrow">
          CHAPTER {String(pattern.order).padStart(2, "0")} /{" "}
          {String(chapterCount).padStart(2, "0")}
        </span>
        <strong>{pattern.title.en}</strong>
        <small>{pattern.title.ja}</small>
      </div>

      <div className="timeDisplay">
        <span>{formatTime(time)}</span>
        <small>/ ∞</small>
      </div>

      <button
        className={`textControl ${detailsOpen ? "isActive" : ""}`}
        onClick={onToggleDetails}
        aria-pressed={detailsOpen}
      >
        <Info aria-hidden="true" />
        <span>DETAILS</span>
      </button>

      <button
        className={`textControl ${fullscreen ? "isActive" : ""}`}
        onClick={onToggleFullscreen}
        aria-pressed={fullscreen}
      >
        <Expand aria-hidden="true" />
        <span>FULLSCREEN</span>
      </button>
    </footer>
  );
}
