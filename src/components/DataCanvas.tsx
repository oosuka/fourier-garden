import { useEffect, useRef } from "react";

import type { AudioEngine } from "../audio/AudioEngine";
import { getAudioWaveformMode } from "./dataCanvasModel";

interface DataCanvasProps {
  audio: AudioEngine;
}

function resizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

export function WaveformCanvas({ audio }: DataCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audioData = new Uint8Array(2_048);
    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const context = resizeCanvas(canvas);
      if (!context) return;
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);

      if (getAudioWaveformMode(audio.initialized) === "waiting") {
        context.strokeStyle = "rgba(137, 240, 255, .28)";
        context.lineWidth = 0.6;
        context.beginPath();
        context.moveTo(0, rect.height * 0.5);
        context.lineTo(rect.width, rect.height * 0.5);
        context.stroke();
        context.fillStyle = "rgba(174, 207, 214, .46)";
        context.font = '9px "Inter", sans-serif';
        context.textAlign = "center";
        context.fillText(
          "再生開始後に処理後の音響波形を表示",
          rect.width * 0.5,
          rect.height * 0.5 - 8,
        );
        return;
      }

      audio.getWaveformData(audioData);
      context.strokeStyle = "rgba(137, 240, 255, .8)";
      context.shadowColor = "#5be9ff";
      context.shadowBlur = 8;
      context.lineWidth = 0.8;
      context.beginPath();

      for (let index = 0; index < 320; index += 1) {
        const progress = index / 319;
        const dataIndex = Math.floor(progress * (audioData.length - 1));
        const value = (audioData[dataIndex]! - 128) / 128;
        const x = progress * rect.width;
        const y = rect.height * 0.5 - value * rect.height * 0.34;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [audio]);

  return (
    <canvas
      ref={canvasRef}
      className="dataCanvas waveformCanvas"
      aria-label="ソニフィケーション音声の時間波形"
    />
  );
}
