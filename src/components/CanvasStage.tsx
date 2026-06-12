import { useEffect, useRef } from "react";

import { AdaptiveQuality } from "../core/adaptiveQuality";
import { dateSeed } from "../core/seed";
import type { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/types";
import type { PatternScene, PatternSceneFactory } from "../patterns/types";

interface CanvasStageProps {
  pattern: PatternDefinition;
  transport: Transport;
  playing: boolean;
  onStatus: (status: "loading" | "ready" | "error") => void;
  onError: (message: string) => void;
}

function getSceneSeed(): number {
  const seed = new URLSearchParams(window.location.search).get("seed");
  if (seed === "qa") return 41_041;
  const parsed = Number.parseInt(seed ?? "", 10);
  return Number.isFinite(parsed) ? parsed : dateSeed();
}

export function CanvasStage({ pattern, transport, playing, onStatus, onError }: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let scene: PatternScene | null = null;
    let factory: PatternSceneFactory | null = null;
    let recovering = false;
    let previousFrame = performance.now();
    let sampleStarted = previousFrame;
    let sampleFrames = 0;
    const initialQuality =
      new URLSearchParams(window.location.search).get("quality") === "ultra" ? "ultra" : "high";
    const adaptiveQuality = new AdaptiveQuality(initialQuality, 180);

    const fail = (error: unknown) => {
      console.error("Fourier Garden scene initialization failed", error);
      const message = error instanceof Error ? error.message : "描画の初期化に失敗しました";
      onStatus("error");
      onError(message);
    };

    const resize = () => {
      if (!scene) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      scene.resize({ width, height, pixelRatio });
    };

    const frame = (now: number) => {
      if (disposed) return;
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
      scene.update({
        time: transport.currentTime,
        delta,
        playing: playingRef.current,
      });

      if (playingRef.current) {
        const nextQuality = adaptiveQuality.sample(delta);
        if (nextQuality) scene.setQuality(nextQuality);
      }
    };

    const initializeScene = async () => {
      factory ??= await pattern.loadScene();
      const nextScene = await factory({
        canvas,
        seed: getSceneSeed(),
        onDeviceLost: () => void recoverScene(),
      });
      if (disposed) {
        nextScene.dispose();
        return;
      }

      scene = nextScene;
      resize();
      scene.setQuality(initialQuality);
      previousFrame = performance.now();
      sampleStarted = previousFrame;
      sampleFrames = 0;
      onError("");
      onStatus("ready");
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
      onStatus("loading");
      try {
        await initializeScene();
      } catch (error) {
        fail(error);
      } finally {
        recovering = false;
      }
    };

    const onWebGLContextRestored = () => void recoverScene();

    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextrestored", onWebGLContextRestored);
    onStatus("loading");
    void initializeScene().catch(fail);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextrestored", onWebGLContextRestored);
      scene?.dispose();
      scene = null;
    };
  }, [onError, onStatus, pattern, transport]);

  return (
    <canvas
      ref={canvasRef}
      className="sceneCanvas"
      aria-label="フーリエ級数から生成されるエピサイクルと波形"
    />
  );
}
