import { useEffect, useRef, type RefObject } from "react";

import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/spectralCathedral";
import { createSpectralCathedralAnalysisLayout } from "./spectralCathedralAnalysisModel";

interface SpectralCathedralAnalysisProps {
  timeOutputRef: RefObject<HTMLOutputElement | null>;
}

type AnalysisPlot = "coefficient" | "energy";

const ANALYSIS_LAYOUT = createSpectralCathedralAnalysisLayout(SPECTRAL_CATHEDRAL_DEFINITION);

function resizeCanvas(canvas: HTMLCanvasElement): {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
} | null {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function drawAxes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  zeroY: number,
): void {
  const left = 24;
  const right = width - 12;
  context.clearRect(0, 0, width, height);
  context.lineWidth = 0.6;
  context.strokeStyle = "rgba(183, 222, 232, 0.22)";
  context.fillStyle = "rgba(190, 218, 224, 0.64)";
  context.font = '9px "Inter", sans-serif';
  context.textAlign = "center";

  for (const tick of ANALYSIS_LAYOUT.ticks) {
    const x = left + tick.xProgress * (right - left);
    context.beginPath();
    context.moveTo(x, 8);
    context.lineTo(x, height - 17);
    context.stroke();
    context.fillText(String(tick.eigenvalue), x, height - 5);
  }

  context.strokeStyle = "rgba(210, 239, 244, 0.38)";
  context.beginPath();
  context.moveTo(left, zeroY);
  context.lineTo(right, zeroY);
  context.stroke();
}

function drawAnalysis(canvas: HTMLCanvasElement, plot: AnalysisPlot): void {
  const resized = resizeCanvas(canvas);
  if (!resized) return;
  const { context, width, height } = resized;
  const left = 24;
  const right = width - 12;
  const top = 8;
  const bottom = height - 18;
  const zeroY = plot === "coefficient" ? (top + bottom) * 0.5 : bottom;
  drawAxes(context, width, height, zeroY);

  for (const mode of ANALYSIS_LAYOUT.modes) {
    const x = left + mode.xProgress * (right - left);
    const normalizedValue =
      plot === "coefficient"
        ? mode.coefficient / ANALYSIS_LAYOUT.maximumAbsoluteCoefficient
        : mode.normalizedRelativeEnergy;
    const y =
      plot === "coefficient"
        ? zeroY - normalizedValue * (bottom - top) * 0.46
        : bottom - normalizedValue * (bottom - top);
    const color = mode.coefficient >= 0 ? "#86f1ff" : "#a994ff";

    context.strokeStyle = color;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 5;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, zeroY);
    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.arc(x, y, mode.eigenvalue === 27 ? 2.6 : 2.1, 0, Math.PI * 2);
    context.fill();
  }
  context.shadowBlur = 0;
}

export function SpectralCathedralAnalysis({ timeOutputRef }: SpectralCathedralAnalysisProps) {
  return (
    <section className="spectralAnalysis" aria-labelledby="spectral-analysis-title">
      <header className="spectralAnalysisHeader">
        <div>
          <p className="spectralAnalysisEyebrow">STRICT MATHEMATICAL LAYER</p>
          <h1 id="spectral-analysis-title">Spectral Cathedral</h1>
          <p>スペクトルの聖堂</p>
        </div>
        <div className="spectralTime">
          <span>絶対数学時刻</span>
          <output ref={timeOutputRef} aria-label="絶対数学時刻">
            0.000 s
          </output>
        </div>
      </header>

      <SpectralCathedralPlots />
    </section>
  );
}

export function SpectralCathedralPlots() {
  const coefficientCanvasRef = useRef<HTMLCanvasElement>(null);
  const energyCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const coefficientCanvas = coefficientCanvasRef.current;
    const energyCanvas = energyCanvasRef.current;
    if (!coefficientCanvas || !energyCanvas) return;

    const draw = () => {
      drawAnalysis(coefficientCanvas, "coefficient");
      drawAnalysis(energyCanvas, "energy");
    };
    draw();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(coefficientCanvas);
    observer.observe(energyCanvas);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="spectralPlot">
        <div className="spectralPlotHeader">
          <span>{ANALYSIS_LAYOUT.coefficientLabel}</span>
          <small>{ANALYSIS_LAYOUT.axisLabel}</small>
        </div>
        <canvas ref={coefficientCanvasRef} aria-label="符号付き係数の固有値軸表示" />
      </div>

      <div className="spectralPlot">
        <div className="spectralPlotHeader">
          <span>{ANALYSIS_LAYOUT.energyLabel}</span>
          <small>{ANALYSIS_LAYOUT.scopeNotice}</small>
        </div>
        <canvas ref={energyCanvasRef} aria-label="相対エネルギー指標の固有値軸表示" />
      </div>

      <div className="spectralModeTableWrap">
        <table className="spectralModeTable">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">(m,n)</th>
              <th scope="col">λ</th>
              <th scope="col">aₘₙ</th>
              <th scope="col">相対指標</th>
            </tr>
          </thead>
          <tbody>
            {ANALYSIS_LAYOUT.modes.map((mode) => (
              <tr key={mode.id}>
                <td>{mode.id}</td>
                <td>
                  ({mode.m},{mode.n})
                </td>
                <td>{mode.eigenvalue}</td>
                <td>{mode.coefficient.toFixed(6)}</td>
                <td>{mode.normalizedRelativeEnergy.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
