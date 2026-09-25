import { useEffect, useRef, type RefObject } from "react";
import {
  captureChapterEcho,
  type ChapterEcho,
  type ChapterFrameCapture,
} from "../experience/chapterEcho";

import { AdaptiveQuality } from "../core/adaptiveQuality";
import { dateSeed } from "../core/seed";
import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";
import type { PatternScene, PatternSceneFactory, QualityLevel } from "../patterns/contracts";

interface CanvasStageProps {
  pattern: PatternDefinition;
  transport: Transport;
  playing: boolean;
  sceneGeneration: number;
  onStatus: (status: "loading" | "ready" | "error", generation: number) => void;
  onError: (message: string, generation?: number) => void;
  onFrame?: (nowMs: number, cpuMs: number, timeSeconds: number) => void;
  captureRef?: RefObject<ChapterFrameCapture | null>;
}

function getSceneSeed(): number {
  const seed = new URLSearchParams(window.location.search).get("seed");
  if (seed === "qa") return 41_041;
  const parsed = Number.parseInt(seed ?? "", 10);
  return Number.isFinite(parsed) ? parsed : dateSeed();
}

export function getSceneQualityPreference(search: string): {
  initialQuality: QualityLevel;
  adaptive: boolean;
} {
  const requestedQuality = new URLSearchParams(search).get("quality");
  if (
    requestedQuality === "low" ||
    requestedQuality === "medium" ||
    requestedQuality === "high" ||
    requestedQuality === "ultra"
  ) {
    return {
      initialQuality: requestedQuality,
      adaptive: false,
    };
  }

  return {
    initialQuality: "high",
    adaptive: true,
  };
}

export function CanvasStage({
  pattern,
  transport,
  playing,
  sceneGeneration,
  onStatus,
  onError,
  onFrame,
  captureRef,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const onFrameRef = useRef(onFrame);
  const patternRef = useRef(pattern);

  useEffect(() => {
    playingRef.current = playing;
    onFrameRef.current = onFrame;
  }, [playing, onFrame]);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let scene: PatternScene | null = null;
    let factory: PatternSceneFactory | null = null;
    let recovering = false;
    let failed = false;
    let pendingCapture: ((echo: ChapterEcho | null) => void) | null = null;
    let captureTimer: ReturnType<typeof setTimeout> | null = null;
    const finishCapture = (echo: ChapterEcho | null) => {
      if (captureTimer !== null) clearTimeout(captureTimer);
      captureTimer = null;
      const resolve = pendingCapture;
      pendingCapture = null;
      resolve?.(echo);
    };
    if (captureRef)
      captureRef.current = () => {
        finishCapture(null);
        if (!scene || document.hidden || disposed || failed) return Promise.resolve(null);
        return new Promise((resolve) => {
          pendingCapture = resolve;
          captureTimer = setTimeout(() => finishCapture(null), 80);
        });
      };
    let previousFrame = performance.now();
    let sampleStarted = previousFrame;
    let sampleFrames = 0;
    const qualityPreference = getSceneQualityPreference(window.location.search);
    const adaptiveQuality = new AdaptiveQuality(qualityPreference.initialQuality, 180);
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const query = new URLSearchParams(window.location.search);
    const forceReducedMotion = query.get("qa") === "1" && query.get("motion") === "reduced";
    const prefersReducedMotion = () => forceReducedMotion || (motionPreference?.matches ?? false);

    const fail = (error: unknown) => {
      if (disposed || failed) return;
      failed = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      console.error("Fourier Garden scene failed", error);
      const message = error instanceof Error ? error.message : "描画の初期化に失敗しました";
      onStatus("error", sceneGeneration);
      onError(message, sceneGeneration);
    };

    const resize = () => {
      if (!scene) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      // Removal can notify ResizeObserver before React's passive cleanup.
      if (width <= 0 || height <= 0) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      scene.resize({ width, height, pixelRatio });
    };

    const frame = (now: number) => {
      if (disposed || failed) return;
      animationFrame = requestAnimationFrame(frame);
      if (!scene || document.hidden) {
        previousFrame = now;
        return;
      }

      const delta = Math.min(0.1, Math.max(1 / 240, (now - previousFrame) / 1_000));
      previousFrame = now;
      sampleFrames += 1;
      if (now - sampleStarted >= 2_000) {
        canvas.dataset.fps = (sampleFrames / ((now - sampleStarted) / 1_000)).toFixed(1);
        sampleStarted = now;
        sampleFrames = 0;
      }
      const time = transport.currentTime;
      try {
        const cpuStarted = onFrameRef.current ? performance.now() : 0;
        const reducedMotion = prefersReducedMotion();
        canvas.dataset.motion = reducedMotion ? "reduced" : "full";
        scene.update({ time, delta, playing: playingRef.current, reducedMotion });
        if (pendingCapture) finishCapture(captureChapterEcho(canvas));
        onFrameRef.current?.(now, performance.now() - cpuStarted, time);
        if (playingRef.current && qualityPreference.adaptive) {
          const nextQuality = adaptiveQuality.sample(delta);
          if (nextQuality) scene.setQuality(nextQuality);
        }
      } catch (error) {
        fail(error);
      }
    };

    const initializeScene = async () => {
      failed = false;
      factory ??= await patternRef.current.loadScene();
      if (disposed) return;
      const nextScene = await factory({
        canvas,
        seed: getSceneSeed(),
        poeticLayers: query.get("poetic") !== "off",
        onDeviceLost: () => void recoverScene(),
      });
      if (disposed) {
        nextScene.dispose();
        return;
      }

      scene = nextScene;
      resize();
      scene.setQuality(qualityPreference.initialQuality);
      // Submit the first mathematical frame before enabling the sound-and-light entrance.
      const reducedMotion = prefersReducedMotion();
      canvas.dataset.motion = reducedMotion ? "reduced" : "full";
      scene.update({ time: transport.currentTime, delta: 0, playing: false, reducedMotion });
      previousFrame = performance.now();
      sampleStarted = previousFrame;
      sampleFrames = 0;
      onError("", sceneGeneration);
      onStatus("ready", sceneGeneration);
      if (!animationFrame) {
        animationFrame = requestAnimationFrame(frame);
      }
    };

    const recoverScene = async () => {
      if (disposed || recovering) return;
      recovering = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      scene?.dispose();
      scene = null;
      onStatus("loading", sceneGeneration);
      try {
        await initializeScene();
      } catch (error) {
        fail(error);
      } finally {
        recovering = false;
      }
    };

    const onWebGLContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      onStatus("loading", sceneGeneration);
    };
    const onWebGLContextRestored = () => void recoverScene();

    const handleResize = () => {
      if (failed || disposed) return;
      try {
        resize();
      } catch (error) {
        fail(error);
      }
    };
    const sizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);
    sizeObserver?.observe(canvas);
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("webglcontextlost", onWebGLContextLost);
    canvas.addEventListener("webglcontextrestored", onWebGLContextRestored);
    onStatus("loading", sceneGeneration);
    void initializeScene().catch(fail);

    return () => {
      disposed = true;
      finishCapture(null);
      if (captureRef) captureRef.current = null;
      cancelAnimationFrame(animationFrame);
      sizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("webglcontextlost", onWebGLContextLost);
      canvas.removeEventListener("webglcontextrestored", onWebGLContextRestored);
      scene?.dispose();
      scene = null;
    };
  }, [onError, onStatus, sceneGeneration, transport, captureRef]);

  return (
    <canvas
      ref={canvasRef}
      className="sceneCanvas"
      aria-label={pattern.presentation.canvasAriaLabel}
    />
  );
}
