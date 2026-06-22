import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "./qa.css";

import { StrictMode, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { dateSeed } from "../../../core/seed";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "../audio/score";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import { createResidueBloomScene, type ResidueBloomSceneStats } from "../scene/scene";
import type { ResidueBloomSceneInstance } from "../types";
import { parseResidueBloomQaOptions } from "./options";

const QA_OPTIONS = parseResidueBloomQaOptions(window.location.search, dateSeed());
const QA_SCORE = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

type QaScene = ResidueBloomSceneInstance & { getStats(): ResidueBloomSceneStats };

function ResidueBloomQaApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusOutputRef = useRef<HTMLOutputElement>(null);
  const backendOutputRef = useRef<HTMLOutputElement>(null);
  const timeOutputRef = useRef<HTMLOutputElement>(null);
  const particleOutputRef = useRef<HTMLOutputElement>(null);
  const fpsOutputRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let recovering = false;
    let animationFrame = 0;
    let scene: QaScene | null = null;
    const pageStart = performance.now();
    let sampleStarted = pageStart;
    let sampleFrames = 0;

    const setStatus = (value: string) => {
      if (statusOutputRef.current) statusOutputRef.current.value = value;
    };
    const updateTelemetry = (stats: ResidueBloomSceneStats, timeSeconds: number) => {
      canvas.dataset.backend = stats.backend;
      canvas.dataset.postMode = stats.postMode;
      canvas.dataset.totalParticles = String(stats.totalParticles);
      canvas.dataset.time = timeSeconds.toFixed(3);
      if (backendOutputRef.current) {
        backendOutputRef.current.value = `${stats.backend} / ${stats.postMode}`;
      }
      if (timeOutputRef.current) timeOutputRef.current.value = `${timeSeconds.toFixed(3)} s`;
      if (particleOutputRef.current) {
        particleOutputRef.current.value = stats.totalParticles.toLocaleString();
      }
    };
    const resize = () => {
      scene?.resize({
        width: Math.max(1, canvas.clientWidth),
        height: Math.max(1, canvas.clientHeight),
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    };
    const renderAt = (timeSeconds: number) => {
      if (!scene) return;
      scene.update({
        time: timeSeconds,
        delta: 0,
        playing: true,
        score: evaluateMusicalScore(QA_SCORE, timeSeconds),
      });
      updateTelemetry(scene.getStats(), timeSeconds);
    };
    const frame = (now: number) => {
      if (disposed) return;
      animationFrame = requestAnimationFrame(frame);
      if (!scene || document.hidden) return;
      const timeSeconds = QA_OPTIONS.fixedTimeSeconds ?? (now - pageStart) / 1_000;
      renderAt(timeSeconds);
      sampleFrames += 1;
      if (now - sampleStarted >= 2_000) {
        const fps = sampleFrames / ((now - sampleStarted) / 1_000);
        canvas.dataset.fps = fps.toFixed(1);
        if (fpsOutputRef.current) fpsOutputRef.current.value = fps.toFixed(1);
        sampleStarted = now;
        sampleFrames = 0;
      }
    };
    const initialize = async () => {
      const nextScene = await createResidueBloomScene({
        canvas,
        seed: QA_OPTIONS.seed,
        poeticLayers: QA_OPTIONS.poeticLayers,
        preserveDrawingBuffer: QA_OPTIONS.fixedTimeSeconds !== null,
        onDeviceLost: () => void recover(),
      });
      if (disposed) {
        nextScene.dispose();
        return;
      }
      scene = nextScene;
      resize();
      scene.setQuality(QA_OPTIONS.quality);
      setStatus("ready");
      if (!animationFrame) animationFrame = requestAnimationFrame(frame);
    };
    const recover = async () => {
      if (disposed || recovering) return;
      recovering = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      scene?.dispose();
      scene = null;
      setStatus("recovering");
      try {
        await initialize();
      } catch (error) {
        console.error("Residue Bloom QA scene recovery failed", error);
        setStatus("error");
      } finally {
        recovering = false;
      }
    };

    window.addEventListener("resize", resize);
    setStatus("loading");
    void initialize().catch((error: unknown) => {
      console.error("Residue Bloom QA scene initialization failed", error);
      setStatus("error");
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      scene?.dispose();
      scene = null;
    };
  }, []);

  return (
    <main className="residueQaStage" aria-label="Residue Bloom 固定時刻描画QA">
      <canvas
        ref={canvasRef}
        className="residueQaCanvas"
        aria-label="剰余類調波の厳密なエピサイクルと主波形、詩的な流線と深度背景"
      />
      <div className="residueQaTelemetry" aria-label="描画状態">
        <span>
          status <output ref={statusOutputRef}>loading</output>
        </span>
        <span>
          backend <output ref={backendOutputRef}>pending</output>
        </span>
        <span>
          time <output ref={timeOutputRef}>pending</output>
        </span>
        <span>
          quality <strong>{QA_OPTIONS.quality}</strong>
        </span>
        <span>
          particles <output ref={particleOutputRef}>pending</output>
        </span>
        <span>
          fps <output ref={fpsOutputRef}>sampling</output>
        </span>
      </div>
    </main>
  );
}

const rootElement = document.getElementById("residue-bloom-qa-root");
if (!rootElement) throw new Error("Residue Bloom QA root element is missing");
const root =
  (import.meta.hot?.data.residueBloomQaRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.residueBloomQaRoot = root;
root.render(
  <StrictMode>
    <ResidueBloomQaApp />
  </StrictMode>,
);
