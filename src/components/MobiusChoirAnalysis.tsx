import { useEffect, useRef, type RefObject } from "react";

import { MOBIUS_CHOIR_DEFINITION } from "../math/mobiusChoir";
import {
  createMobiusChoirAnalysisLayout,
  getMobiusChoirCandidateLaneOffset,
} from "./mobiusChoirAnalysisModel";

interface MobiusChoirAnalysisProps {
  timeOutputRef: RefObject<HTMLOutputElement | null>;
}

const LAYOUT = createMobiusChoirAnalysisLayout(MOBIUS_CHOIR_DEFINITION);

function drawCandidateAnalysis(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const left = 24;
  const right = rect.width - 12;
  const allowedY = rect.height * 0.34;
  const rejectedY = rect.height * 0.68;
  context.clearRect(0, 0, rect.width, rect.height);
  context.lineWidth = 0.6;
  context.font = '9px "Inter", sans-serif';
  context.textAlign = "center";
  context.fillStyle = "rgba(190, 218, 224, 0.64)";
  context.strokeStyle = "rgba(183, 222, 232, 0.22)";
  for (const tick of LAYOUT.ticks) {
    const x = left + tick.xProgress * (right - left);
    context.beginPath();
    context.moveTo(x, 8);
    context.lineTo(x, rect.height - 18);
    context.stroke();
    context.fillText(String(tick.eigenvalue), x, rect.height - 5);
  }
  for (const candidate of LAYOUT.candidates) {
    const x = left + candidate.xProgress * (right - left);
    const y =
      (candidate.allowed ? allowedY : rejectedY) +
      getMobiusChoirCandidateLaneOffset(candidate.m, candidate.n);
    const color = candidate.allowed ? "#9cefff" : "rgba(155, 128, 210, 0.55)";
    context.fillStyle = color;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = candidate.allowed ? 6 : 0;
    context.beginPath();
    if (candidate.allowed) {
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
    } else {
      context.moveTo(x - 2.5, y - 2.5);
      context.lineTo(x + 2.5, y + 2.5);
      context.moveTo(x + 2.5, y - 2.5);
      context.lineTo(x - 2.5, y + 2.5);
      context.stroke();
    }
  }
  context.shadowBlur = 0;
  context.textAlign = "left";
  context.fillStyle = "rgba(210, 239, 244, 0.68)";
  context.fillText("許容", 4, allowedY + 3);
  context.fillText("不許容", 4, rejectedY + 3);
}

export function MobiusChoirAnalysis({ timeOutputRef }: MobiusChoirAnalysisProps) {
  return (
    <section className="spectralAnalysis mobiusAnalysis" aria-labelledby="mobius-analysis-title">
      <header className="spectralAnalysisHeader">
        <div>
          <p className="spectralAnalysisEyebrow">STRICT MATHEMATICAL LAYER</p>
          <h1 id="mobius-analysis-title">Möbius Choir</h1>
          <p>メビウスの合唱</p>
        </div>
        <div className="spectralTime">
          <span>絶対数学時刻</span>
          <output ref={timeOutputRef} aria-label="絶対数学時刻">
            0.000 s
          </output>
        </div>
      </header>
      <MobiusChoirPlots />
    </section>
  );
}

export function MobiusChoirPlots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawCandidateAnalysis(canvas);
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="spectralPlot mobiusModePlot">
        <div className="spectralPlotHeader">
          <span>許容／不許容モード</span>
          <small>{LAYOUT.axisLabel}</small>
        </div>
        <canvas ref={canvasRef} aria-label="m+nの奇偶による許容モードの固有値軸表示" />
        <p className="quietNote">
          {LAYOUT.parityLabel}。{LAYOUT.scopeNotice}
        </p>
      </div>
      <div className="spectralModeTableWrap">
        <table className="spectralModeTable">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">(m,n)</th>
              <th scope="col">λ</th>
              <th scope="col">bₘₙ</th>
              <th scope="col">声部</th>
            </tr>
          </thead>
          <tbody>
            {LAYOUT.modes.map((mode) => (
              <tr key={mode.id}>
                <td>{mode.id}</td>
                <td>
                  ({mode.m},{mode.n})
                </td>
                <td>{mode.eigenvalue}</td>
                <td>{mode.coefficient.toFixed(6)}</td>
                <td>{mode.voiceKind === "single" ? "単一" : "正弦・余弦対"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
