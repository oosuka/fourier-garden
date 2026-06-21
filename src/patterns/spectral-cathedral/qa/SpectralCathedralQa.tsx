import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/noto-serif-jp/400.css";
import "./qa.css";

import { StrictMode, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { SpectralCathedralAnalysis } from "../details/SpectralCathedralAnalysis";
import {
  createSpectralCathedralScene,
  type SpectralCathedralScene,
  type SpectralCathedralSceneStats,
} from "../scene/scene";
import { parseSpectralCathedralQaOptions } from "./options";

const QA_OPTIONS = parseSpectralCathedralQaOptions(window.location.search);

function updateStats(
  canvas: HTMLCanvasElement,
  backendOutput: HTMLOutputElement | null,
  geometryOutput: HTMLOutputElement | null,
  poeticOutput: HTMLOutputElement | null,
  stats: SpectralCathedralSceneStats,
): void {
  canvas.dataset.backend = stats.backend;
  canvas.dataset.vertices = String(stats.vertices);
  canvas.dataset.triangles = String(stats.triangles);
  canvas.dataset.nodalSegments = String(stats.nodalSegments);
  canvas.dataset.poeticAnchors = String(stats.poetic?.anchors ?? 0);
  canvas.dataset.poeticArches = String(stats.poetic?.arches ?? 0);
  canvas.dataset.poeticParticles = String(stats.poetic?.particles ?? 0);
  canvas.dataset.poeticVolumetricHalos = String(stats.poetic?.volumetricHalos ?? 0);
  canvas.dataset.poeticArchTrailLayers = String(stats.poetic?.archTrailLayers ?? 0);
  if (backendOutput) backendOutput.value = stats.backend;
  if (geometryOutput) {
    geometryOutput.value =
      `${stats.vertices.toLocaleString()} vertices / ` +
      `${stats.triangles.toLocaleString()} triangles / ` +
      `${stats.nodalSegments.toLocaleString()} nodal segments`;
  }
  if (poeticOutput) {
    poeticOutput.value = stats.poetic
      ? `${stats.poetic.anchors} anchors / ${stats.poetic.arches} arches / ` +
        `${stats.poetic.particles.toLocaleString()} particles / ` +
        `${stats.poetic.volumetricHalos} halos / ` +
        `${stats.poetic.archTrailLayers} trail layers`
      : "off";
  }
}

function SpectralCathedralQaApp() {
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
    let scene: SpectralCathedralScene | null = null;
    const pageStart = performance.now();
    let sampleStarted = pageStart;
    let sampleFrames = 0;
    let lastTimeTextUpdate = Number.NEGATIVE_INFINITY;

    const setStatus = (message: string) => {
      if (statusOutputRef.current) statusOutputRef.current.value = message;
    };

    const resize = () => {
      if (!scene) return;
      scene.resize({
        width: Math.max(1, canvas.clientWidth),
        height: Math.max(1, canvas.clientHeight),
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    };

    const renderAt = (timeSeconds: number, now: number) => {
      if (!scene) return;
      scene.update(timeSeconds);
      const stats = scene.getStats();
      updateStats(
        canvas,
        backendOutputRef.current,
        geometryOutputRef.current,
        poeticOutputRef.current,
        stats,
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
      if (!scene || document.hidden) {
        return;
      }

      const timeSeconds = (now - pageStart) / 1_000;
      renderAt(timeSeconds, now);
      sampleFrames += 1;
      if (now - sampleStarted >= 2_000) {
        canvas.dataset.fps = (sampleFrames / ((now - sampleStarted) / 1_000)).toFixed(1);
        sampleStarted = now;
        sampleFrames = 0;
      }
    };

    const initialize = async () => {
      const nextScene = await createSpectralCathedralScene({
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
        console.error("Spectral Cathedral QA scene recovery failed", error);
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
      console.error("Spectral Cathedral QA scene initialization failed", error);
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
    <main className="spectralQaShell">
      <section className="spectralQaStage" aria-label="Spectral Cathedral 段階5作品化">
        <canvas
          ref={canvasRef}
          className="spectralQaCanvas"
          aria-label="長方形Dirichlet波動面、補間節線、詩的な光柱とアーチ"
        />
        <div className="spectralQaTelemetry" aria-label="描画状態">
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
      <aside className="spectralQaAnalysis">
        <SpectralCathedralAnalysis timeOutputRef={timeOutputRef} />
      </aside>
    </main>
  );
}

const rootElement = document.getElementById("spectral-cathedral-qa-root");
if (!rootElement) {
  throw new Error("Spectral Cathedral QA root element is missing");
}

const root =
  (import.meta.hot?.data.spectralCathedralQaRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) {
  import.meta.hot.data.spectralCathedralQaRoot = root;
}

root.render(
  <StrictMode>
    <SpectralCathedralQaApp />
  </StrictMode>,
);
