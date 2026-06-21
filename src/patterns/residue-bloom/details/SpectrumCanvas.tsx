import { useEffect, useRef } from "react";

import type { FourierSeriesDefinition } from "../../../math/fourierSeries";
import { createSpectrumLayout } from "./spectrumModel";

interface SpectrumCanvasProps {
  series: FourierSeriesDefinition;
  referenceFrequencyHz: number;
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

export function SpectrumCanvas({ series, referenceFrequencyHz }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = resizeCanvas(canvas);
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const layout = createSpectrumLayout(series, referenceFrequencyHz);
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

    layout.bars.forEach((bin, index) => {
      const x = 8 + bin.progress * (rect.width - 16);
      const height = bin.heightRatio * (rect.height - 12);
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
  }, [series, referenceFrequencyHz]);

  return (
    <canvas
      ref={canvasRef}
      className="dataCanvas spectrumCanvas"
      aria-label="片側正弦振幅 A_k の解析的スペクトル"
    />
  );
}

export function SpectrumAxis({ series, referenceFrequencyHz }: SpectrumCanvasProps) {
  const layout = createSpectrumLayout(series, referenceFrequencyHz);

  return (
    <div className="frequencyAxis" aria-hidden="true">
      {layout.ticks.map((tick, index) => (
        <span key={tick.frequencyHz} style={{ left: `${tick.progress * 100}%` }}>
          {tick.label}
          {index === layout.ticks.length - 1 ? " Hz" : ""}
        </span>
      ))}
    </div>
  );
}
