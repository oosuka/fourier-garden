import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";

import { selectRendererBackend, type RendererBackend } from "../../core/rendererBackend";
import type {
  FrameContext,
  PatternScene,
  PatternSceneOptions,
  QualityLevel,
  Viewport,
} from "../../patterns/contracts";
import { CinematicEnvironmentLayer } from "../cinematic/environmentLayer";
import type { CinematicEnvironmentProfile } from "../cinematic/model";
import {
  createCinematicPostProcessor,
  type CinematicPostProcessor,
} from "../cinematic/postProcessing";

import { disposeObjectResources } from "./disposeResources";

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export interface AnalyticSceneFrame {
  energy: number;
  warmth: number;
  cameraX?: number;
  cameraY?: number;
}

export interface AnalyticSceneContent {
  group: THREE.Group;
  update(timeSeconds: number, reducedMotion?: boolean): AnalyticSceneFrame;
  setQuality?(level: QualityLevel): void;
  dispose?(): void;
}

export interface ImmersiveAnalyticSceneConfig {
  profile: CinematicEnvironmentProfile;
  palette: readonly [number, number, number];
  particleBudgets: Readonly<Record<QualityLevel, number>>;
  extent: Readonly<{ x: number; y: number; z: number }>;
  camera: Readonly<{ distance: number; height: number; targetY: number; fovDegrees: number }>;
  exposure: number;
  createContent(backend: RendererBackend, poeticLayers: boolean): AnalyticSceneContent;
}

class ImmersiveAnalyticScene implements PatternScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera();
  private readonly content: AnalyticSceneContent;
  private readonly environment: CinematicEnvironmentLayer | null;
  private postProcessor: CinematicPostProcessor | null = null;
  private quality: QualityLevel = "high";
  private aspect = 1;
  private disposed = false;

  constructor(
    private readonly renderer: SceneRenderer,
    private readonly backend: RendererBackend,
    private readonly config: ImmersiveAnalyticSceneConfig,
    seed: number,
    poeticLayers: boolean,
  ) {
    this.scene.background = new THREE.Color(0x060a08);
    this.content = config.createContent(backend, poeticLayers);
    const ambient = new THREE.HemisphereLight(0xe5dfc4, 0x1d3429, 1.3);
    const key = new THREE.DirectionalLight(0xf2e5c4, 3.2);
    key.position.set(-3, 6, 7);
    const rim = new THREE.DirectionalLight(config.palette[0], 2.1);
    rim.position.set(5, -2, 2);
    this.scene.add(ambient, key, rim);
    this.environment = poeticLayers
      ? new CinematicEnvironmentLayer({
          backend,
          profile: config.profile,
          seed,
          maximumParticleCount: config.particleBudgets.ultra,
          palette: config.palette,
          extent: config.extent,
        })
      : null;
    if (this.environment) this.scene.add(this.environment.group);
    this.scene.add(this.content.group);
  }

  async initialize(): Promise<void> {
    this.postProcessor = await createCinematicPostProcessor({
      renderer: this.renderer,
      backend: this.backend,
      scene: this.scene,
      camera: this.camera,
      exposure: this.config.exposure,
    });
    this.postProcessor.setQuality(this.quality);
  }

  update(frame: FrameContext): void {
    if (this.disposed) throw new Error("Analytic scene has been disposed");
    const stagingTime = frame.reducedMotion ? 0 : frame.time;
    const response = this.content.update(frame.time, frame.reducedMotion);
    const cameraDistance =
      this.config.camera.distance * Math.max(1, 1.55 / this.aspect) * (this.aspect > 2 ? 1.06 : 1) +
      Math.cos(stagingTime * 0.031) * 0.24;
    const orbit = Math.sin(stagingTime * 0.071) * 0.36 + Math.sin(stagingTime * 0.019 + 1.2) * 0.18;
    this.camera.position.set(
      (response.cameraX ?? 0) + orbit,
      this.config.camera.height +
        (response.cameraY ?? 0) +
        Math.sin(stagingTime * 0.049 + 0.7) * 0.16,
      cameraDistance,
    );
    this.camera.lookAt(
      Math.sin(stagingTime * 0.023) * 0.14,
      this.config.camera.targetY + Math.cos(stagingTime * 0.027) * 0.1,
      0,
    );
    this.environment?.update(
      stagingTime,
      response.energy,
      response.warmth,
      this.camera,
      frame.reducedMotion,
    );
    this.postProcessor?.setEnergy(response.energy);
    if (this.postProcessor) this.postProcessor.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: Viewport): void {
    this.aspect = viewport.width / viewport.height;
    this.camera.aspect = this.aspect;
    this.camera.fov = this.config.camera.fovDegrees + (this.aspect < 1.55 ? 4 : 0);
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    this.environment?.resize(this.aspect, viewport.pixelRatio);
    if (this.postProcessor) {
      this.postProcessor.resize(viewport.width, viewport.height, viewport.pixelRatio);
    } else {
      this.renderer.setPixelRatio(viewport.pixelRatio);
      this.renderer.setSize(viewport.width, viewport.height, false);
    }
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
    this.environment?.setParticleCount(this.config.particleBudgets[level]);
    this.content.setQuality?.(level);
    this.postProcessor?.setQuality(level);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.content.dispose?.();
    disposeObjectResources(this.content.group);
    this.environment?.dispose();
    this.postProcessor?.dispose();
    this.renderer.dispose();
  }
}

async function createWebGLRenderer(canvas: HTMLCanvasElement): Promise<WebGLRenderer> {
  const module = await import("three");
  return new module.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
}

async function createRenderer(
  options: PatternSceneOptions,
  backend: RendererBackend,
): Promise<SceneRenderer> {
  if (backend === "webgl") return createWebGLRenderer(options.canvas);

  const webgpu = new THREE.WebGPURenderer({
    canvas: options.canvas,
    antialias: true,
    alpha: false,
  });
  const reportDeviceLost = webgpu.onDeviceLost.bind(webgpu);
  webgpu.onDeviceLost = (info) => {
    reportDeviceLost(info);
    options.onDeviceLost?.();
  };
  try {
    await webgpu.init();
    return webgpu;
  } catch (error) {
    webgpu.dispose();
    throw error;
  }
}

async function createSceneForBackend(
  options: PatternSceneOptions,
  config: ImmersiveAnalyticSceneConfig,
  backend: RendererBackend,
): Promise<PatternScene> {
  const renderer = await createRenderer(options, backend);
  let scene: ImmersiveAnalyticScene | null = null;
  try {
    const poeticLayers =
      options.poeticLayers ?? new URLSearchParams(window.location.search).get("poetic") !== "off";
    scene = new ImmersiveAnalyticScene(renderer, backend, config, options.seed, poeticLayers);
    await scene.initialize();
    return scene;
  } catch (error) {
    if (scene) scene.dispose();
    else renderer.dispose();
    throw error;
  }
}

export async function createImmersiveAnalyticScene(
  options: PatternSceneOptions,
  config: ImmersiveAnalyticSceneConfig,
): Promise<PatternScene> {
  const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
  const requestedBackend = selectRendererBackend(forceWebGL, "gpu" in navigator);
  options.canvas.dataset.rendererBackend = requestedBackend;

  try {
    const scene = await createSceneForBackend(options, config, requestedBackend);
    options.canvas.dataset.rendererBackend = requestedBackend;
    return scene;
  } catch (error) {
    if (requestedBackend !== "webgpu") throw error;
    console.warn("WebGPU scene initialization failed; falling back to WebGL.", error);
  }

  const scene = await createSceneForBackend(options, config, "webgl");
  options.canvas.dataset.rendererBackend = "webgl";
  return scene;
}
