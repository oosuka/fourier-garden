import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";
import {
  Fn,
  float,
  length,
  mix,
  pass,
  sin,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { createSeededRandom } from "../core/seed";
import {
  selectRendererBackend,
  type RendererBackend,
} from "../core/rendererBackend";
import {
  RESIDUE_BLOOM_SERIES,
  evaluateSeries,
  getEpicycleSteps,
} from "../math/fourier";
import type {
  FrameContext,
  PatternScene,
  PatternSceneOptions,
  QualityLevel,
  Viewport,
} from "./types";

const PALETTE = [
  0x78f3ff, 0x8ac8ff, 0xa798ff, 0xe59aff, 0xffc782, 0xc8fff3,
] as const;
const TWO_PI = Math.PI * 2;

interface DynamicLine {
  line: THREE.Line;
  positions: Float32Array;
}

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

function makeLine(
  pointCount: number,
  color: number,
  opacity: number,
  loop = false,
): DynamicLine {
  const positions = new Float32Array(pointCount * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const line = loop
    ? new THREE.Line(geometry, material)
    : new THREE.Line(geometry, material);
  return { line, positions };
}

function updateAttribute(line: DynamicLine): void {
  const attribute = line.line.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  attribute.needsUpdate = true;
  line.line.geometry.computeBoundingSphere();
}

function createStarField(
  random: () => number,
  count: number,
  spanX: number,
  spanY: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radiusBias = Math.pow(random(), 0.62);
    positions[index * 3] = (random() - 0.5) * spanX * radiusBias;
    positions[index * 3 + 1] = (random() - 0.5) * spanY;
    positions[index * 3 + 2] = -2 - random() * 8;

    color.setHex(PALETTE[Math.floor(random() * PALETTE.length)] ?? 0xffffff);
    const brightness = 0.22 + random() * 0.78;
    colors[index * 3] = color.r * brightness;
    colors[index * 3 + 1] = color.g * brightness;
    colors[index * 3 + 2] = color.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.025,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

function createAtmosphereMaterial(
  cyan: readonly [number, number, number],
  violet: readonly [number, number, number],
  phase: number,
  sceneTime: THREE.UniformNode<"float", number>,
): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  material.colorNode = Fn(() => {
    const centered = uv().sub(vec2(0.5, 0.5));
    const distance = length(centered.mul(vec2(1.0, 1.45)));
    const rings = sin(
      distance.mul(42).sub(sceneTime.mul(0.27)).add(float(phase)),
    )
      .mul(0.5)
      .add(0.5);
    const veil = float(1).sub(smoothstep(0.02, 0.68, distance));
    const tone = mix(vec3(...cyan), vec3(...violet), rings);
    const alpha = veil.mul(rings.mul(0.055).add(0.018));
    return vec4(tone, alpha);
  })();

  return material;
}

function smoothstepNumber(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return normalized * normalized * (3 - 2 * normalized);
}

function createFallbackAtmosphereMaterial(
  cyan: readonly [number, number, number],
  violet: readonly [number, number, number],
  phase: number,
): THREE.MeshBasicMaterial {
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(...cyan),
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  }

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const centeredX = x / (size - 1) - 0.5;
      const centeredY = (y / (size - 1) - 0.5) * 1.45;
      const distance = Math.hypot(centeredX, centeredY);
      const rings = Math.sin(distance * 42 + phase) * 0.5 + 0.5;
      const veil = 1 - smoothstepNumber(0.02, 0.68, distance);
      const alpha = veil * (rings * 0.095 + 0.035);
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round(
        (cyan[0] * (1 - rings) + violet[0] * rings) * 255,
      );
      image.data[offset + 1] = Math.round(
        (cyan[1] * (1 - rings) + violet[1] * rings) * 255,
      );
      image.data[offset + 2] = Math.round(
        (cyan[2] * (1 - rings) + violet[2] * rings) * 255,
      );
      image.data[offset + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

class ResidueBloomScene implements PatternScene {
  private readonly renderer: SceneRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly renderPipeline: THREE.RenderPipeline | null;
  private readonly bloomNode: ReturnType<typeof bloom> | null;
  private readonly backend: RendererBackend;
  private readonly random: () => number;
  private readonly sceneTime = uniform(0);
  private readonly epicycleGroup = new THREE.Group();
  private readonly atmosphereGroup = new THREE.Group();
  private readonly fieldGroup = new THREE.Group();
  private readonly circles: THREE.Line[] = [];
  private readonly spokes: DynamicLine;
  private readonly waveLines: DynamicLine[] = [];
  private readonly organicLines: DynamicLine[] = [];
  private readonly particleCloud: THREE.Points;
  private readonly particleBase: Float32Array;
  private readonly stars: THREE.Points[] = [];
  private readonly endpointCore: THREE.Mesh;
  private readonly endpointHalo: THREE.Mesh;
  private readonly connector: DynamicLine;
  private quality: QualityLevel = "high";
  private viewport: Viewport = {
    width: 1,
    height: 1,
    pixelRatio: 1,
  };

  private constructor(
    renderer: SceneRenderer,
    random: () => number,
    backend: RendererBackend,
  ) {
    this.renderer = renderer;
    this.random = random;
    this.backend = backend;
    this.scene.background = new THREE.Color(0x010308);
    this.camera.position.set(0, 0, 20);
    this.camera.near = 0.01;
    this.camera.far = 80;

    this.createAtmosphere();
    this.createStars();
    this.createEpicycles();

    this.spokes = makeLine(14, 0xd6f8ff, 0.48);
    this.epicycleGroup.add(this.spokes.line);

    for (let index = 0; index < 9; index += 1) {
      const wave = makeLine(
        720,
        PALETTE[index % PALETTE.length] ?? 0xffffff,
        index === 0 ? 0.92 : 0.055 + (8 - index) * 0.012,
      );
      this.waveLines.push(wave);
      this.fieldGroup.add(wave.line);
    }

    for (let index = 0; index < 11; index += 1) {
      const organic = makeLine(
        460,
        PALETTE[(index + 2) % PALETTE.length] ?? 0xffffff,
        0.035 + (index % 4) * 0.012,
        true,
      );
      this.organicLines.push(organic);
      this.atmosphereGroup.add(organic.line);
    }

    this.connector = makeLine(2, 0xbef9ff, 0.27);
    (
      this.connector.line.material as THREE.LineBasicMaterial
    ).transparent = true;
    this.scene.add(this.connector.line);

    const particleData = this.createFlowParticles(7_200);
    this.particleCloud = particleData.points;
    this.particleBase = particleData.base;
    this.atmosphereGroup.add(this.particleCloud);

    const coreGeometry = new THREE.CircleGeometry(0.105, 48);
    this.endpointCore = new THREE.Mesh(
      coreGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.endpointHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 64),
      new THREE.MeshBasicMaterial({
        color: 0x72eaff,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.scene.add(this.endpointHalo, this.endpointCore);

    this.scene.add(
      this.atmosphereGroup,
      this.fieldGroup,
      this.epicycleGroup,
    );

    if (backend === "webgpu") {
      const scenePass = pass(this.scene, this.camera);
      const sceneColor = scenePass.getTextureNode("output");
      this.bloomNode = bloom(sceneColor, 0.72, 0.32, 0.17);
      this.renderPipeline = new THREE.RenderPipeline(
        renderer as THREE.WebGPURenderer,
      );
      this.renderPipeline.outputNode = sceneColor.add(this.bloomNode);
    } else {
      this.bloomNode = null;
      this.renderPipeline = null;
    }
  }

  static async create({
    canvas,
    seed,
    onDeviceLost,
  }: PatternSceneOptions): Promise<ResidueBloomScene> {
    const forceWebGL =
      new URLSearchParams(window.location.search).get("renderer") ===
      "webgl";
    const backend = selectRendererBackend(
      forceWebGL,
      "gpu" in navigator,
    );

    if (backend === "webgl") {
      const { WebGLRenderer } = await import("three");
      const renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.13;
      return new ResidueBloomScene(
        renderer,
        createSeededRandom(seed),
        backend,
      );
    }

    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    const reportDeviceLost = renderer.onDeviceLost.bind(renderer);
    renderer.onDeviceLost = (info) => {
      reportDeviceLost(info);
      onDeviceLost?.();
    };
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    await renderer.init();

    return new ResidueBloomScene(
      renderer,
      createSeededRandom(seed),
      backend,
    );
  }

  update(frame: FrameContext): void {
    const timeValue = frame.time;
    this.sceneTime.value = timeValue;
    const angle = timeValue * 0.31;
    const aspect = this.viewport.width / this.viewport.height;
    const epicycleScale = aspect < 1.6 ? 0.49 : 0.54;
    const centerX = aspect < 1.6 ? -4.9 : -5.9;
    const centerY = 0.35;
    const steps = getEpicycleSteps(RESIDUE_BLOOM_SERIES, angle);

    this.epicycleGroup.position.set(centerX, centerY, 0.7);
    this.updateEpicycles(steps, epicycleScale);

    const endpoint = steps.at(-1);
    const endpointX = centerX + (endpoint?.x ?? 0) * epicycleScale;
    const endpointY = centerY + (endpoint?.y ?? 0) * epicycleScale;
    this.endpointCore.position.set(endpointX, endpointY, 1.4);
    this.endpointHalo.position.set(endpointX, endpointY, 1.3);
    const pulse = 0.82 + Math.sin(timeValue * 2.1) * 0.16;
    this.endpointHalo.scale.setScalar(pulse);

    const waveStart = aspect < 1.6 ? 1.6 : 1.1;
    this.updateConnector(endpointX, endpointY, waveStart);
    this.updateWaves(timeValue, endpointY, waveStart);
    this.updateOrganicField(timeValue, endpointX, endpointY);
    this.updateFlowParticles(timeValue, endpointX, endpointY);

    this.atmosphereGroup.rotation.z =
      Math.sin(timeValue * 0.027) * 0.025;
    this.stars[0]!.rotation.z = timeValue * 0.0018;
    this.stars[1]!.rotation.z = -timeValue * 0.0011;
    this.fieldGroup.position.y = Math.sin(timeValue * 0.037) * 0.12;

    if (this.renderPipeline) {
      this.renderPipeline.render();
    } else {
      (this.renderer as WebGLRenderer).render(this.scene, this.camera);
    }
  }

  resize(viewport: Viewport): void {
    this.viewport = viewport;
    const aspect = viewport.width / viewport.height;
    const halfHeight = 10;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(viewport.pixelRatio);
    this.renderer.setSize(viewport.width, viewport.height, false);
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
    const drawCounts: Record<QualityLevel, number> = {
      low: 2_400,
      medium: 4_200,
      high: 5_800,
      ultra: 7_200,
    };
    this.particleCloud.geometry.setDrawRange(0, drawCounts[level]);
    if (this.bloomNode) {
      this.bloomNode.strength.value =
        level === "low" ? 0.48 : level === "medium" ? 0.58 : 0.72;
    }
    this.organicLines.forEach((line, index) => {
      line.line.visible =
        level === "low"
          ? index < 5
          : level === "medium"
            ? index < 8
            : true;
    });
  }

  dispose(): void {
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          (item as THREE.MeshBasicMaterial).map?.dispose();
          item.dispose();
        });
      } else {
        (material as THREE.MeshBasicMaterial | undefined)?.map?.dispose();
        material?.dispose();
      }
    });
    this.renderPipeline?.dispose();
    this.renderer.dispose();
  }

  private createAtmosphere(): void {
    const veils = [
      {
        colorA: [0.05, 0.88, 1] as const,
        colorB: [0.48, 0.2, 1] as const,
        scale: [1.24, 0.92] as const,
        rotation: -0.1,
        phase: 0,
      },
      {
        colorA: [0.22, 0.55, 1] as const,
        colorB: [1, 0.42, 0.63] as const,
        scale: [0.94, 1.2] as const,
        rotation: 0.38,
        phase: 2.1,
      },
      {
        colorA: [0.18, 1, 0.76] as const,
        colorB: [1, 0.66, 0.28] as const,
        scale: [1.08, 0.74] as const,
        rotation: -0.52,
        phase: 4.2,
      },
    ];

    veils.forEach((veil, index) => {
      const material =
        this.backend === "webgpu"
          ? createAtmosphereMaterial(
              veil.colorA,
              veil.colorB,
              veil.phase,
              this.sceneTime,
            )
          : createFallbackAtmosphereMaterial(
              veil.colorA,
              veil.colorB,
              veil.phase,
            );
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 17, 1, 1),
        material,
      );
      mesh.scale.set(veil.scale[0], veil.scale[1], 1);
      mesh.rotation.z = veil.rotation;
      mesh.position.set(index * 1.8 - 2.4, index * -0.8 + 0.7, -4 - index);
      this.atmosphereGroup.add(mesh);
    });
  }

  private createStars(): void {
    const far = createStarField(this.random, 5_200, 39, 23);
    const near = createStarField(this.random, 2_600, 34, 20);
    (near.material as THREE.PointsMaterial).size = 0.044;
    (near.material as THREE.PointsMaterial).opacity = 0.42;
    near.position.z = 2;
    this.stars.push(far, near);
    this.scene.add(far, near);
  }

  private createEpicycles(): void {
    for (let index = 0; index < RESIDUE_BLOOM_SERIES.terms.length; index += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 129 }, (_, pointIndex) => {
          const angle = (pointIndex / 128) * TWO_PI;
          return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        }),
      );
      const material = new THREE.LineBasicMaterial({
        color: PALETTE[index % PALETTE.length],
        transparent: true,
        opacity: Math.max(0.12, 0.58 - index * 0.032),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const circle = new THREE.Line(geometry, material);
      this.circles.push(circle);
      this.epicycleGroup.add(circle);
    }
  }

  private createFlowParticles(count: number): {
    points: THREE.Points;
    base: Float32Array;
  } {
    const base = new Float32Array(count * 4);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const normalized = this.random();
      base[index * 4] = normalized;
      base[index * 4 + 1] = (this.random() - 0.5) * 2;
      base[index * 4 + 2] = this.random();
      base[index * 4 + 3] = this.random() * TWO_PI;
      color.setHex(PALETTE[Math.floor(this.random() * PALETTE.length)]!);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.034,
        transparent: true,
        opacity: 0.64,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    return { points, base };
  }

  private updateEpicycles(
    steps: ReturnType<typeof getEpicycleSteps>,
    scale: number,
  ): void {
    const spokePositions = this.spokes.positions;
    spokePositions[0] = 0;
    spokePositions[1] = 0;
    spokePositions[2] = 0.2;

    steps.forEach((step, index) => {
      const circle = this.circles[index]!;
      circle.position.set(step.originX * scale, step.originY * scale, 0.2);
      circle.scale.setScalar(step.radius * scale);

      const offset = (index + 1) * 3;
      spokePositions[offset] = step.x * scale;
      spokePositions[offset + 1] = step.y * scale;
      spokePositions[offset + 2] = 0.3;
    });
    updateAttribute(this.spokes);
  }

  private updateConnector(
    endpointX: number,
    endpointY: number,
    waveStart: number,
  ): void {
    this.connector.positions.set([
      endpointX,
      endpointY,
      0.4,
      waveStart,
      endpointY,
      0.4,
    ]);
    updateAttribute(this.connector);
  }

  private updateWaves(
    timeValue: number,
    endpointY: number,
    waveStart: number,
  ): void {
    const worldRight = this.camera.right + 1.4;
    const lengthValue = worldRight - waveStart;

    this.waveLines.forEach((wave, trailIndex) => {
      const delay = trailIndex * 0.035;
      for (let index = 0; index < 720; index += 1) {
        const progress = index / 719;
        const historyAngle =
          (timeValue - progress * 8.6 - delay) * 0.31;
        const amplitude = evaluateSeries(
          RESIDUE_BLOOM_SERIES,
          historyAngle,
        );
        const taper = 0.72 + progress * 0.28;
        const offset = index * 3;
        wave.positions[offset] =
          waveStart + progress * lengthValue + trailIndex * 0.018;
        wave.positions[offset + 1] =
          endpointY +
          amplitude * 0.39 * taper +
          Math.sin(progress * 21 + timeValue * 0.22) * trailIndex * 0.012;
        wave.positions[offset + 2] = 0.25 - trailIndex * 0.028;
      }
      updateAttribute(wave);
    });
  }

  private updateOrganicField(
    timeValue: number,
    endpointX: number,
    endpointY: number,
  ): void {
    this.organicLines.forEach((organic, lineIndex) => {
      const huePhase = lineIndex / this.organicLines.length;
      for (let index = 0; index < 460; index += 1) {
        const progress = index / 459;
        const theta = progress * TWO_PI;
        const lobe =
          1 +
          0.2 *
            Math.sin(theta * (3 + (lineIndex % 4)) + timeValue * 0.17) +
          0.08 * Math.sin(theta * 11 - timeValue * 0.11);
        const radiusX = 5.1 + lineIndex * 0.21;
        const radiusY = 3.25 + lineIndex * 0.17;
        const drift = Math.sin(timeValue * 0.043 + lineIndex) * 0.6;
        const offset = index * 3;
        organic.positions[offset] =
          endpointX * 0.18 +
          Math.cos(theta + huePhase) * radiusX * lobe +
          drift;
        organic.positions[offset + 1] =
          endpointY * 0.12 +
          Math.sin(theta) * radiusY * lobe +
          Math.sin(theta * 2 - timeValue * 0.08) * 0.8;
        organic.positions[offset + 2] = -0.8 - lineIndex * 0.08;
      }
      updateAttribute(organic);
    });
  }

  private updateFlowParticles(
    timeValue: number,
    endpointX: number,
    endpointY: number,
  ): void {
    const positions = (
      this.particleCloud.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute
    ).array as Float32Array;
    const activeCount =
      this.quality === "low"
        ? 2_400
        : this.quality === "medium"
          ? 4_200
          : this.quality === "high"
            ? 5_800
            : 7_200;

    for (let index = 0; index < activeCount; index += 1) {
      const progress =
        (this.particleBase[index * 4]! + timeValue * 0.0038) % 1;
      const spread = this.particleBase[index * 4 + 1]!;
      const depth = this.particleBase[index * 4 + 2]!;
      const phase = this.particleBase[index * 4 + 3]!;
      const theta = progress * TWO_PI + phase * 0.12;
      const radius = 3.2 + depth * 6.8 + Math.sin(theta * 4) * 0.55;
      positions[index * 3] =
        endpointX * 0.14 +
        Math.cos(theta) * radius +
        spread * 0.7 * Math.sin(theta * 3 + timeValue * 0.1);
      positions[index * 3 + 1] =
        endpointY * 0.1 +
        Math.sin(theta) * radius * 0.56 +
        spread * 1.35;
      positions[index * 3 + 2] = -0.35 - depth * 2.8;
    }
    (
      this.particleCloud.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute
    ).needsUpdate = true;
  }
}

export async function createResidueBloomScene(
  options: PatternSceneOptions,
): Promise<PatternScene> {
  return ResidueBloomScene.create(options);
}
