import { useEffect, useRef } from "react";

import type { AudioEngine } from "../audio/AudioEngine";
import { RESIDUE_BLOOM_SERIES, evaluateSeries, getAnalyticSpectrum } from "../math/fourier";

interface DataCanvasProps {
  audio: AudioEngine;
  playing: boolean;
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

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = resizeCanvas(canvas);
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const spectrum = getAnalyticSpectrum(RESIDUE_BLOOM_SERIES, 55);
    const colors = ["#70edff", "#8dc5ff", "#a990ff", "#ef9cff", "#ffc982"];

    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "rgba(160, 225, 242, .12)";
    context.lineWidth = 0.5;
    for (let row = 1; row <= 3; row += 1) {
      const y = (rect.height / 4) * row;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(rect.width, y);
      context.stroke();
    }

    spectrum.forEach((bin, index) => {
      const x = 8 + (Math.log10(bin.frequencyHz / 45) / Math.log10(3_200 / 45)) * (rect.width - 16);
      const normalized = bin.amplitude / 5;
      const height = Math.max(3, normalized * (rect.height - 12));
      context.strokeStyle = colors[index % colors.length]!;
      context.shadowColor = context.strokeStyle;
      context.shadowBlur = 7;
      context.lineWidth = index === 0 ? 2 : 1;
      context.beginPath();
      context.moveTo(x, rect.height - 4);
      context.lineTo(x, rect.height - 4 - height);
      context.stroke();
    });
    context.shadowBlur = 0;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="dataCanvas spectrumCanvas"
      aria-label="有限フーリエ級数の解析的係数スペクトル"
    />
  );
}

export function WaveformCanvas({ audio, playing }: DataCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audioData = new Uint8Array(2_048);
    let frame = 0;
    let phase = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const context = resizeCanvas(canvas);
      if (!context) return;
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);

      if (audio.initialized) {
        audio.getWaveformData(audioData);
      }

      context.strokeStyle = "rgba(137, 240, 255, .8)";
      context.shadowColor = "#5be9ff";
      context.shadowBlur = 8;
      context.lineWidth = 0.8;
      context.beginPath();

      for (let index = 0; index < 320; index += 1) {
        const progress = index / 319;
        let value: number;
        if (audio.initialized) {
          const dataIndex = Math.floor(progress * (audioData.length - 1));
          value = (audioData[dataIndex]! - 128) / 128;
        } else {
          value = evaluateSeries(RESIDUE_BLOOM_SERIES, progress * Math.PI * 3 + phase) / 9;
        }
        const x = progress * rect.width;
        const y = rect.height * 0.5 - value * rect.height * 0.34;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;
      if (playing) phase += 0.006;
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [audio, playing]);

  return (
    <canvas
      ref={canvasRef}
      className="dataCanvas waveformCanvas"
      aria-label="ソニフィケーション音声の時間波形"
    />
  );
}
