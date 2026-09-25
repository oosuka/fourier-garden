import { useEffect, useRef, useState } from "react";

import type { AudioEngine } from "../audio/AudioEngine";
import type { Transport } from "../core/transport";
import type { ExperienceCapture } from "./experienceCapture";

export default function ExperienceQa({
  capture,
  audio,
  transport,
  chapter,
  ready,
  muted,
  volume,
  silentPlayback,
  onSeek,
}: {
  capture: ExperienceCapture;
  audio: AudioEngine;
  transport: Transport;
  chapter: string;
  ready: boolean;
  muted: boolean;
  volume: number;
  silentPlayback: boolean;
  onSeek: (seconds: number) => Promise<void>;
}) {
  const [seekTime, setSeekTime] = useState(String(transport.currentTime));
  const [liveTime, setLiveTime] = useState(transport.currentTime);
  const [elapsed, setElapsed] = useState(0);
  const [reportJson, setReportJson] = useState(() =>
    capture.report ? JSON.stringify(capture.report, null, 2) : "",
  );
  const sealedReport = useRef(capture.report);

  useEffect(() => {
    const timer = window.setInterval(() => {
      audio.requestPositionObservation();
      setLiveTime(transport.currentTime);
      setElapsed(capture.elapsedSeconds);
      if (capture.report && sealedReport.current !== capture.report) {
        sealedReport.current = capture.report;
        setReportJson(JSON.stringify(capture.report, null, 2));
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [audio, capture, transport]);

  function startCapture() {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas.sceneCanvas");
    if (!canvas || !ready || !transport.isPlaying) return;
    const query = new URLSearchParams(window.location.search);
    capture.start(60, {
      chapter,
      renderer: canvas.dataset.rendererBackend ?? "unreported",
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      rasterWidth: canvas.width,
      rasterHeight: canvas.height,
      quality: query.get("quality") ?? "adaptive",
      seed: query.get("seed") ?? "date",
      postProcessing: query.get("post") === "direct" ? "direct" : "default",
      audioSampleRateHz: audio.sampleRateHz,
      clock: silentPlayback ? "performance" : "audio-presentation-estimate",
      mutedAtStart: muted,
      volumeAtStart: volume,
      playingAtStart: transport.isPlaying,
      motionAtStart: canvas.dataset.motion ?? "unreported",
      physicalLatencyMeasured: false,
    });
    setReportJson("");
    setElapsed(0);
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([reportJson], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fourier-${sealedReport.current?.chapter ?? "capture"}-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <details className="experienceQa">
      <summary>
        QA · <span data-qa-time>{liveTime.toFixed(3)} s</span>
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSeek(Number(seekTime));
        }}
      >
        <label>
          絶対時刻（秒）
          <input
            type="number"
            min="0"
            max="86400"
            step="0.001"
            value={seekTime}
            onChange={(event) => setSeekTime(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!ready}>
          この時刻へ
        </button>
      </form>
      <button
        type="button"
        onClick={startCapture}
        disabled={!ready || !transport.isPlaying || capture.active}
      >
        60秒を記録
      </button>
      {capture.active && (
        <button type="button" onClick={() => capture.interrupt("manual-stop")}>
          記録を中止
        </button>
      )}
      <output>
        {capture.active
          ? `記録中 ${elapsed.toFixed(1)} / 60 s`
          : capture.report
            ? `${capture.report.status} · ${capture.report.averageFps.toFixed(2)} fps`
            : "記録待ち"}
      </output>
      {reportJson && (
        <>
          <button type="button" onClick={downloadReport}>
            JSONを保存
          </button>
          <pre data-qa-report>{reportJson}</pre>
        </>
      )}
    </details>
  );
}
