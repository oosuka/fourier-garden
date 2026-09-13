import type { WebGLRenderer } from "three";
import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import type { RendererBackend } from "../../core/rendererBackend";
import type { QualityLevel } from "../../patterns/contracts";

export type CinematicPostMode = "webgpu-bloom" | "webgl-bloom" | "direct";

export interface CinematicPostProfile {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

const POST_PROFILES: Readonly<Record<QualityLevel, Readonly<CinematicPostProfile>>> = Object.freeze(
  {
    low: Object.freeze({ enabled: false, strength: 0, radius: 0, threshold: 1 }),
    medium: Object.freeze({ enabled: true, strength: 0.48, radius: 0.26, threshold: 0.82 }),
    high: Object.freeze({ enabled: true, strength: 0.62, radius: 0.38, threshold: 0.76 }),
    ultra: Object.freeze({ enabled: true, strength: 0.78, radius: 0.46, threshold: 0.7 }),
  },
);

// Above the reference display raster, UnrealBloom's extra full-frame passes miss the
// 60 fps budget on the fallback renderer. Direct rendering preserves native math lines.
const WEBGL_BLOOM_MAX_RASTER_PIXELS = 6_000_000;

// The scene remains native resolution. Only the diffuse light is area-limited,
// so a high-DPI or 4K display does not multiply all eleven bloom targets.
const WEBGPU_BLOOM_PIXEL_BUDGET: Readonly<Record<QualityLevel, number>> = {
  low: 262_144,
  medium: 524_288,
  high: 1_048_576,
  ultra: 2_097_152,
};

export interface CinematicPostProcessor {
  readonly mode: CinematicPostMode;
  render(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setQuality(level: QualityLevel): void;
  setEnergy(energy: number): void;
  dispose(): void;
}

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export interface CinematicPostProcessorOptions {
  renderer: SceneRenderer;
  backend: RendererBackend;
  scene: THREE.Scene;
  camera: THREE.Camera;
  exposure: number;
}

export function getCinematicPostProfile(level: QualityLevel): Readonly<CinematicPostProfile> {
  return POST_PROFILES[level];
}

export function getCinematicPostMode(
  backend: RendererBackend,
  available: boolean,
): CinematicPostMode {
  if (!available) return "direct";
  return backend === "webgpu" ? "webgpu-bloom" : "webgl-bloom";
}

export function getWebGlViewportPostMode(
  width: number,
  height: number,
  pixelRatio: number,
  bloomEnabled: boolean,
): CinematicPostMode {
  assertViewport(width, height, pixelRatio);
  if (!bloomEnabled) return "direct";
  return width * pixelRatio * height * pixelRatio <= WEBGL_BLOOM_MAX_RASTER_PIXELS
    ? "webgl-bloom"
    : "direct";
}

function assertViewport(width: number, height: number, pixelRatio: number): void {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(pixelRatio) ||
    width <= 0 ||
    height <= 0 ||
    pixelRatio <= 0
  ) {
    throw new Error("Cinematic post viewport values must be positive and finite");
  }
}

function assertEnergy(energy: number): void {
  if (!Number.isFinite(energy) || energy < 0 || energy > 1) {
    throw new Error("Cinematic post energy must be finite and between zero and one");
  }
}

abstract class BasePostProcessor implements CinematicPostProcessor {
  abstract readonly mode: CinematicPostMode;

  protected quality: QualityLevel = "high";
  protected energy = 0;
  protected disposed = false;

  abstract render(): void;
  abstract resize(width: number, height: number, pixelRatio: number): void;
  abstract dispose(): void;

  setQuality(level: QualityLevel): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    this.quality = level;
    this.applyProfile();
  }

  setEnergy(energy: number): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    assertEnergy(energy);
    this.energy = energy;
    this.applyProfile();
  }

  protected getStrength(): number {
    const profile = getCinematicPostProfile(this.quality);
    return profile.enabled
      ? Math.min(1.82, profile.strength + Math.min(0.2, this.energy * 0.18))
      : 0;
  }

  protected abstract applyProfile(): void;
}

class DirectPostProcessor extends BasePostProcessor {
  readonly mode = "direct" as const;

  constructor(
    private readonly renderer: SceneRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    super();
  }

  render(): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    assertViewport(width, height, pixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  protected applyProfile(): void {}

  dispose(): void {
    this.disposed = true;
  }
}

class WebGpuPostProcessor extends BasePostProcessor {
  readonly mode = "webgpu-bloom" as const;

  private readonly scenePass;
  private readonly bloomNode;
  private readonly pipeline: THREE.RenderPipeline;
  private rasterPixels = 1;

  constructor(
    private readonly renderer: THREE.WebGPURenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    super();
    this.scenePass = pass(scene, camera);
    const sceneColor = this.scenePass.getTextureNode("output");
    this.bloomNode = bloom(sceneColor, 1.05, 0.42, 0.72);
    this.pipeline = new THREE.RenderPipeline(renderer);
    this.pipeline.outputNode = sceneColor.add(this.bloomNode);
    this.applyProfile();
    this.applyBloomResolution();
  }

  render(): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    if (getCinematicPostProfile(this.quality).enabled) this.pipeline.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    assertViewport(width, height, pixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.rasterPixels = width * height * pixelRatio ** 2;
    this.applyBloomResolution();
  }

  override setQuality(level: QualityLevel): void {
    super.setQuality(level);
    this.applyBloomResolution();
  }

  private applyBloomResolution(): void {
    this.bloomNode.setResolutionScale(
      Math.min(0.5, Math.sqrt(WEBGPU_BLOOM_PIXEL_BUDGET[this.quality] / this.rasterPixels)),
    );
  }

  protected applyProfile(): void {
    const profile = getCinematicPostProfile(this.quality);
    this.bloomNode.strength.value = this.getStrength();
    this.bloomNode.radius.value = profile.radius;
    this.bloomNode.threshold.value = profile.threshold;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pipeline.dispose();
    this.bloomNode.dispose();
    this.scenePass.dispose();
  }
}

interface WebGlComposerLike {
  render(): void;
  setPixelRatio(pixelRatio: number): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

interface WebGlBloomLike {
  strength: number;
  radius: number;
  threshold: number;
  materialHighPassFilter: THREE.ShaderMaterial;
  dispose(): void;
}

class WebGlPostProcessor extends BasePostProcessor {
  private width = 1;
  private height = 1;
  private pixelRatio = 1;

  get mode(): CinematicPostMode {
    return getWebGlViewportPostMode(
      this.width,
      this.height,
      this.pixelRatio,
      getCinematicPostProfile(this.quality).enabled,
    );
  }

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly composer: WebGlComposerLike,
    private readonly bloomPass: WebGlBloomLike,
  ) {
    super();
    this.applyProfile();
  }

  render(): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    if (this.mode === "webgl-bloom") this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) throw new Error("Cinematic post processor has been disposed");
    assertViewport(width, height, pixelRatio);
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    if (this.mode === "webgl-bloom") {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }
  }

  protected applyProfile(): void {
    const profile = getCinematicPostProfile(this.quality);
    this.bloomPass.strength = this.getStrength();
    this.bloomPass.radius = profile.radius;
    this.bloomPass.threshold = profile.threshold;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.composer.dispose();
    this.bloomPass.dispose();
    // Three r185's UnrealBloomPass.dispose does not release this owned shader.
    this.bloomPass.materialHighPassFilter.dispose();
  }
}

let warnedAboutFallback = false;

function warnAboutFallback(error: unknown): void {
  if (warnedAboutFallback) return;
  warnedAboutFallback = true;
  console.warn(
    "Fourier Garden cinematic post processing is unavailable; using direct rendering",
    error,
  );
}

export async function createCinematicPostProcessor({
  renderer,
  backend,
  scene,
  camera,
  exposure,
}: CinematicPostProcessorOptions): Promise<CinematicPostProcessor> {
  if (!Number.isFinite(exposure) || exposure <= 0) {
    throw new Error("Cinematic post exposure must be positive and finite");
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  const query = new URLSearchParams(window.location.search);
  if (query.get("qa") === "1" && query.get("post") === "direct") {
    return new DirectPostProcessor(renderer, scene, camera);
  }

  try {
    if (backend === "webgpu") {
      return new WebGpuPostProcessor(renderer as THREE.WebGPURenderer, scene, camera);
    }
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
    ]);
    const webGlRenderer = renderer as WebGLRenderer;
    const composer = new EffectComposer(webGlRenderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.42, 0.72);
    composer.addPass(bloomPass);
    return new WebGlPostProcessor(webGlRenderer, scene, camera, composer, bloomPass);
  } catch (error) {
    warnAboutFallback(error);
    return new DirectPostProcessor(renderer, scene, camera);
  }
}
