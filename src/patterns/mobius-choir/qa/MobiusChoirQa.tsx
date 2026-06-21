import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/noto-serif-jp/400.css";
import "./qa.css";

import { StrictMode, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { MobiusChoirAnalysis } from "../details/MobiusChoirAnalysis";
import {
  createMobiusChoirScene,
  type MobiusChoirScene,
  type MobiusChoirSceneStats,
} from "../scene/scene";
import { parseMobiusChoirQaOptions } from "./options";

const QA_OPTIONS = parseMobiusChoirQaOptions(window.location.search);

function updateStats(
  canvas: HTMLCanvasElement,
  backendOutput: HTMLOutputElement | null,
  geometryOutput: HTMLOutputElement | null,
  poeticOutput: HTMLOutputElement | null,
  stats: MobiusChoirSceneStats,
): void {
  canvas.dataset.backend = stats.backend;
  canvas.dataset.vertices = String(stats.vertices);
  canvas.dataset.triangles = String(stats.triangles);
  canvas.dataset.nodalSegments = String(stats.nodalSegments);
  canvas.dataset.boundaryComponents = String(stats.boundaryComponents);
  canvas.dataset.seamSegments = String(stats.seamSegments);
  canvas.dataset.parameterGridSegments = String(stats.parameterGridSegments);
  canvas.dataset.poeticRibbons = String(stats.poetic?.ribbons ?? 0);
  canvas.dataset.poeticParticles = String(stats.poetic?.particles ?? 0);
  canvas.dataset.poeticSurfaceParticles = String(stats.poetic?.surfaceParticles ?? 0);
  canvas.dataset.poeticAtmosphereParticles = String(stats.poetic?.atmosphereParticles ?? 0);
  canvas.dataset.poeticHalos = String(stats.poetic?.halos ?? 0);
  canvas.dataset.poeticTrailLayers = String(stats.poetic?.trailLayers ?? 0);
  if (backendOutput) backendOutput.value = stats.backend;
  if (geometryOutput) {
    geometryOutput.value =
      `${stats.vertices.toLocaleString()} vertices / ` +
      `${stats.triangles.toLocaleString()} triangles / ` +
      `${stats.nodalSegments.toLocaleString()} nodal / ` +
      `${stats.boundaryComponents} boundary / ${stats.seamSegments} seam / ` +
      `${stats.parameterGridSegments} grid`;
  }
  if (poeticOutput) {
    poeticOutput.value = stats.poetic
      ? `${stats.poetic.ribbons} ribbons / ` +
        `${stats.poetic.particles.toLocaleString()} particles / ` +
        `${stats.poetic.halos} halos / ` +
        `${stats.poetic.trailLayers} trail layers`
      : "off";
  }
}

function MobiusChoirQaApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeOutputRef = useRef<HTMLOutputElement>(null);
  const backendOutputRef = useRef<HTMLOutputElement>(null);
  const geometryOutputRef = useRef<HTMLOutputElement>(null);
  const poeticOutputRef = useRef<HTMLOutputElement>(null);
  const statusOutputRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let recovering = false;
    let animationFrame = 0;
    let scene: MobiusChoirScene | null = null;
    const pageStart = performance.now();
    let sampleStarted = pageStart;
    let sampleFrames = 0;
    let lastTimeTextUpdate = Number.NEGATIVE_INFINITY;

    const setStatus = (message: string) => {
      if (statusOutputRef.current) statusOutputRef.current.value = message;
    };
    const resize = () => {
      scene?.resize({
        width: Math.max(1, canvas.clientWidth),
        height: Math.max(1, canvas.clientHeight),
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    };
    const renderAt = (timeSeconds: number, now: number) => {
      if (!scene) return;
      scene.update(timeSeconds);
      updateStats(
        canvas,
        backendOutputRef.current,
        geometryOutputRef.current,
        poeticOutputRef.current,
        scene.getStats(),
      );
      if (
        timeOutputRef.current &&
        (QA_OPTIONS.fixedTimeSeconds !== null || now - lastTimeTextUpdate >= 100)
      ) {
        timeOutputRef.current.value = `${timeSeconds.toFixed(3)} s`;
        lastTimeTextUpdate = now;
      }
    };
    const frame = (now: number) => {
      if (disposed) return;
      animationFrame = requestAnimationFrame(frame);
      if (!scene || document.hidden) return;
      renderAt((now - pageStart) / 1_000, now);
      sampleFrames += 1;
      if (now - sampleStarted >= 2_000) {
        canvas.dataset.fps = (sampleFrames / ((now - sampleStarted) / 1_000)).toFixed(1);
        sampleStarted = now;
        sampleFrames = 0;
      }
    };
    const initialize = async () => {
      const nextScene = await createMobiusChoirScene({
        canvas,
        seed: QA_OPTIONS.seed,
        poeticLayers: QA_OPTIONS.poeticLayers,
        onDeviceLost: () => void recover(),
        preserveDrawingBuffer: QA_OPTIONS.fixedTimeSeconds !== null,
      });
      if (disposed) {
        nextScene.dispose();
        return;
      }
      scene = nextScene;
      resize();
      scene.setQuality(QA_OPTIONS.quality);
      setStatus("ready");
      if (QA_OPTIONS.fixedTimeSeconds !== null) {
        canvas.dataset.fps = "fixed";
        renderAt(QA_OPTIONS.fixedTimeSeconds, performance.now());
      } else if (!animationFrame) {
        animationFrame = requestAnimationFrame(frame);
      }
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
        console.error("Möbius Choir QA scene recovery failed", error);
        setStatus("error");
      } finally {
        recovering = false;
      }
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setStatus("context lost");
    };
    const handleContextRestored = () => void recover();

    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    setStatus("loading");
    void initialize().catch((error: unknown) => {
      console.error("Möbius Choir QA scene initialization failed", error);
      setStatus("error");
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      scene?.dispose();
      scene = null;
    };
  }, []);

  return (
    <main className="mobiusQaShell">
      <section className="mobiusQaStage" aria-label="Möbius Choir 固定時刻描画QA">
        <canvas
          ref={canvasRef}
          className="mobiusQaCanvas"
          aria-label="メビウス帯の符号面、節線、境界、継ぎ目、声部リボン、息の粒子"
        />
        <div className="mobiusQaTelemetry" aria-label="描画状態">
          <span>
            status <output ref={statusOutputRef}>loading</output>
          </span>
          <span>
            backend <output ref={backendOutputRef}>pending</output>
          </span>
          <output ref={geometryOutputRef}>geometry pending</output>
          <output ref={poeticOutputRef}>poetic geometry pending</output>
          <span>
            quality <strong>{QA_OPTIONS.quality}</strong>
          </span>
          <span>
            seed <strong>{QA_OPTIONS.seed}</strong>
          </span>
          <span>
            poetic <strong>{QA_OPTIONS.poeticLayers ? "on" : "off"}</strong>
          </span>
          <span>
            time mode{" "}
            <strong>{QA_OPTIONS.fixedTimeSeconds === null ? "absolute advancing" : "fixed"}</strong>
          </span>
        </div>
      </section>
      <aside className="mobiusQaAnalysis">
        <MobiusChoirAnalysis timeOutputRef={timeOutputRef} />
      </aside>
    </main>
  );
}

const rootElement = document.getElementById("mobius-choir-qa-root");
if (!rootElement) throw new Error("Möbius Choir QA root element is missing");
const root =
  (import.meta.hot?.data.mobiusChoirQaRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.mobiusChoirQaRoot = root;
root.render(
  <StrictMode>
    <MobiusChoirQaApp />
  </StrictMode>,
);
