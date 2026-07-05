import * as THREE from "three/webgpu";

import type { RendererBackend } from "../../../core/rendererBackend";
import {
  CATHEDRAL_ARCH_FILAMENTS,
  CATHEDRAL_GRAND_VAULT_RIBS,
  CATHEDRAL_VAULT_REPEATS,
  createCathedralArchitectureModel,
} from "./architecture";
import {
  evaluateSpectralCathedralAnchorMagnitudes,
  getSpectralCathedralPoeticQuality,
  updateSpectralCathedralParticles,
  type SpectralCathedralPoeticModel,
  type SpectralCathedralPoeticQuality,
} from "./poetic";
import {
  createSpectralCathedralModeInfluenceMatrix,
  evaluateSpectralCathedralVisualFrame,
  type SpectralCathedralModeInfluenceMatrix,
} from "./visualResponse";
import type { QualityLevel } from "../../contracts";

const PILLAR_BOTTOM_Z = 0.02;
const PILLAR_TOP_Z = 2.58;
const MAX_ARCH_TRAIL_LAYERS = 3;

export interface SpectralCathedralPoeticLayerStats {
  anchors: number;
  arches: number;
  pillarShells: number;
  archFilaments: number;
  visibleArchFilaments: number;
  vaultRepeats: number;
  visibleVaultRepeats: number;
  archMembranes: number;
  grandVaultRibs: number;
  visibleGrandVaultRibs: number;
  particles: number;
  volumetricHalos: number;
  archTrailLayers: number;
}

export function getSpectralCathedralParticleStyle(backend: RendererBackend): Readonly<{
  size: number;
  opacity: number;
}> {
  return backend === "webgl" ? { size: 0.008, opacity: 0.2 } : { size: 0.024, opacity: 0.42 };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createHaloTexture(): THREE.DataTexture {
  const width = 32;
  const height = 128;
  const data = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    const verticalProgress = row / (height - 1);
    const verticalFade = Math.sin(Math.PI * verticalProgress) ** 0.65;
    for (let column = 0; column < width; column += 1) {
      const horizontal = Math.abs((column / (width - 1)) * 2 - 1);
      const alpha = Math.max(0, 1 - horizontal) ** 2.4 * verticalFade;
      const offset = (row * width + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createLineGeometry(positions: Float32Array): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function createArchMembraneGeometry(
  innerPositions: Float32Array,
  outerPositions: Float32Array,
): THREE.BufferGeometry {
  const pointCount = innerPositions.length / 3;
  const positions = new Float32Array(pointCount * 2 * 3);
  const indices = new Uint16Array((pointCount - 1) * 6);
  for (let index = 0; index < pointCount; index += 1) {
    const sourceOffset = index * 3;
    const targetOffset = index * 6;
    positions.set(innerPositions.subarray(sourceOffset, sourceOffset + 3), targetOffset);
    positions.set(outerPositions.subarray(sourceOffset, sourceOffset + 3), targetOffset + 3);
    if (index < pointCount - 1) {
      const indexOffset = index * 6;
      const inner = index * 2;
      const outer = inner + 1;
      indices.set([inner, inner + 2, outer, outer, inner + 2, outer + 2], indexOffset);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

export function getSpectralCathedralArchitectureLayerCounts(level: QualityLevel): {
  filamentsPerArch: number;
  vaultsPerArch: number;
  grandVaults: number;
} {
  if (level === "low") return { filamentsPerArch: 2, vaultsPerArch: 1, grandVaults: 3 };
  if (level === "medium") return { filamentsPerArch: 3, vaultsPerArch: 2, grandVaults: 5 };
  if (level === "high") return { filamentsPerArch: 4, vaultsPerArch: 3, grandVaults: 7 };
  return { filamentsPerArch: 5, vaultsPerArch: 4, grandVaults: 9 };
}

export class SpectralCathedralPoeticLayer {
  readonly group = new THREE.Group();

  private readonly model: SpectralCathedralPoeticModel;
  private readonly modeInfluence: SpectralCathedralModeInfluenceMatrix;
  private readonly backend: RendererBackend;
  private readonly pillarGeometry: THREE.BufferGeometry;
  private readonly pillarPositions: Float32Array;
  private readonly pillarPositionAttribute: THREE.BufferAttribute;
  private readonly pillarColors: Float32Array;
  private readonly pillarColorAttribute: THREE.BufferAttribute;
  private readonly pillarMaterial: THREE.LineBasicMaterial;
  private readonly pillarLines: THREE.LineSegments;
  private readonly pillarShellGeometry = new THREE.CylinderGeometry(
    0.026,
    0.046,
    2.58,
    16,
    1,
    true,
  );
  private readonly pillarShells: THREE.Mesh[] = [];
  private readonly pillarShellMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly haloTexture = createHaloTexture();
  private readonly haloGeometry = new THREE.PlaneGeometry(0.32, 2.72);
  private readonly haloGroups: THREE.Group[] = [];
  private readonly haloMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly archCoreLines: THREE.Line[] = [];
  private readonly archCoreMaterials: THREE.LineBasicMaterial[] = [];
  private readonly archFilamentMeshes: THREE.Mesh[][] = [];
  private readonly archFilamentMaterials: THREE.MeshBasicMaterial[][] = [];
  private readonly archMembraneMeshes: THREE.Mesh[] = [];
  private readonly archMembraneMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly vaultLines: THREE.Line[][] = [];
  private readonly vaultMaterials: THREE.LineBasicMaterial[][] = [];
  private readonly archTrailLines: THREE.Line[][] = [];
  private readonly archTrailMaterials: THREE.LineBasicMaterial[][] = [];
  private readonly archLightPoints: THREE.Points[] = [];
  private readonly archLightMaterials: THREE.PointsMaterial[] = [];
  private readonly grandVaultMeshes: THREE.Mesh[] = [];
  private readonly grandVaultMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly particleGeometry: THREE.BufferGeometry;
  private readonly particlePositionAttribute: THREE.BufferAttribute;
  private readonly particleMaterial: THREE.PointsMaterial;
  private readonly particleCloud: THREE.Points;
  private quality: QualityLevel = "high";
  private qualitySettings: SpectralCathedralPoeticQuality;
  private disposed = false;

  constructor(model: SpectralCathedralPoeticModel, backend: RendererBackend) {
    this.model = model;
    this.modeInfluence = createSpectralCathedralModeInfluenceMatrix(model.anchors);
    this.backend = backend;
    this.qualitySettings = getSpectralCathedralPoeticQuality(this.quality, backend);
    const architecture = createCathedralArchitectureModel(model.anchors, model.archPositions);

    this.pillarPositions = new Float32Array(model.anchors.length * 2 * 3);
    this.pillarColors = new Float32Array(model.anchors.length * 2 * 3);
    for (const [index, anchor] of model.anchors.entries()) {
      const offset = index * 6;
      this.pillarPositions[offset] = anchor.displayX;
      this.pillarPositions[offset + 1] = anchor.displayY;
      this.pillarPositions[offset + 2] = PILLAR_BOTTOM_Z;
      this.pillarPositions[offset + 3] = anchor.displayX;
      this.pillarPositions[offset + 4] = anchor.displayY;
      this.pillarPositions[offset + 5] = PILLAR_TOP_Z;
    }
    this.pillarGeometry = createLineGeometry(this.pillarPositions);
    this.pillarPositionAttribute = this.pillarGeometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    this.pillarPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.pillarColorAttribute = new THREE.BufferAttribute(this.pillarColors, 3);
    this.pillarColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.pillarGeometry.setAttribute("color", this.pillarColorAttribute);
    this.pillarMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.pillarLines = new THREE.LineSegments(this.pillarGeometry, this.pillarMaterial);
    this.pillarLines.frustumCulled = false;
    this.pillarLines.renderOrder = 1;
    this.group.add(this.pillarLines);

    const pillarShellRoot = new THREE.Group();
    for (const pillar of architecture.pillars) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.24, 1.08, 1.32),
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const shell = new THREE.Mesh(this.pillarShellGeometry, material);
      shell.rotation.x = Math.PI / 2;
      shell.position.set(pillar.x, pillar.y, (pillar.bottomZ + pillar.topZ) * 0.5);
      shell.renderOrder = 0;
      pillarShellRoot.add(shell);
      this.pillarShells.push(shell);
      this.pillarShellMaterials.push(material);
    }
    this.group.add(pillarShellRoot);

    const haloRoot = new THREE.Group();
    for (const anchor of model.anchors) {
      const material = new THREE.MeshBasicMaterial({
        map: this.haloTexture,
        color: new THREE.Color(0.25, 1.1, 1.3),
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const anchorGroup = new THREE.Group();
      anchorGroup.position.set(anchor.displayX, anchor.displayY, 0.82);
      const first = new THREE.Mesh(this.haloGeometry, material);
      first.rotation.x = Math.PI / 2;
      const second = new THREE.Mesh(this.haloGeometry, material);
      second.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      first.renderOrder = 0;
      second.renderOrder = 0;
      anchorGroup.add(first, second);
      haloRoot.add(anchorGroup);
      this.haloGroups.push(anchorGroup);
      this.haloMaterials.push(material);
    }
    this.group.add(haloRoot);

    const archRoot = new THREE.Group();
    for (const [archIndex, positions] of model.archPositions.entries()) {
      const coreMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0.28, 0.86, 0.96),
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const core = new THREE.Line(createLineGeometry(positions), coreMaterial);
      core.renderOrder = 1;
      this.archCoreLines.push(core);
      this.archCoreMaterials.push(coreMaterial);
      archRoot.add(core);

      const filamentMeshes: THREE.Mesh[] = [];
      const filamentMaterials: THREE.MeshBasicMaterial[] = [];
      for (let filamentIndex = 0; filamentIndex < CATHEDRAL_ARCH_FILAMENTS; filamentIndex += 1) {
        const filamentPositions =
          architecture.archFilaments[archIndex * CATHEDRAL_ARCH_FILAMENTS + filamentIndex]!;
        const points = Array.from(
          { length: filamentPositions.length / 3 },
          (_, pointIndex) =>
            new THREE.Vector3(
              filamentPositions[pointIndex * 3]!,
              filamentPositions[pointIndex * 3 + 1]!,
              filamentPositions[pointIndex * 3 + 2]!,
            ),
        );
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(
          curve,
          Math.max(8, points.length - 1),
          0.0062 + filamentIndex * 0.00075,
          5,
          false,
        );
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.3, 1.16, 1.38),
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 1;
        archRoot.add(mesh);
        filamentMeshes.push(mesh);
        filamentMaterials.push(material);
      }
      this.archFilamentMeshes.push(filamentMeshes);
      this.archFilamentMaterials.push(filamentMaterials);

      const outerFilament =
        architecture.archFilaments[
          archIndex * CATHEDRAL_ARCH_FILAMENTS + CATHEDRAL_ARCH_FILAMENTS - 1
        ]!;
      const membraneMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.2, 0.72, 1.14),
        transparent: true,
        opacity: 0.034,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const membrane = new THREE.Mesh(
        createArchMembraneGeometry(positions, outerFilament),
        membraneMaterial,
      );
      membrane.renderOrder = 0;
      archRoot.add(membrane);
      this.archMembraneMeshes.push(membrane);
      this.archMembraneMaterials.push(membraneMaterial);

      const repeatedVaults: THREE.Line[] = [];
      const repeatedVaultMaterials: THREE.LineBasicMaterial[] = [];
      for (let repeatIndex = 0; repeatIndex < CATHEDRAL_VAULT_REPEATS; repeatIndex += 1) {
        const vaultPositions =
          architecture.vaultRepeats[archIndex * CATHEDRAL_VAULT_REPEATS + repeatIndex]!;
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(0.42, 0.66, 1.08),
          transparent: true,
          opacity: [0.18, 0.125, 0.084, 0.056][repeatIndex]!,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const vault = new THREE.Line(createLineGeometry(vaultPositions), material);
        vault.renderOrder = -1;
        archRoot.add(vault);
        repeatedVaults.push(vault);
        repeatedVaultMaterials.push(material);
      }
      this.vaultLines.push(repeatedVaults);
      this.vaultMaterials.push(repeatedVaultMaterials);

      const trailLines: THREE.Line[] = [];
      const trailMaterials: THREE.LineBasicMaterial[] = [];
      for (let layerIndex = 0; layerIndex < MAX_ARCH_TRAIL_LAYERS; layerIndex += 1) {
        const trailPositions = positions.slice();
        for (let index = 2; index < trailPositions.length; index += 3) {
          trailPositions[index] += 0.018 * (layerIndex + 1);
        }
        const trailMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(0.78, 0.62, 0.28),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const trail = new THREE.Line(createLineGeometry(trailPositions), trailMaterial);
        trail.visible = layerIndex < this.qualitySettings.archTrailLayers;
        trail.renderOrder = 1;
        trailLines.push(trail);
        trailMaterials.push(trailMaterial);
        archRoot.add(trail);
      }
      this.archTrailLines.push(trailLines);
      this.archTrailMaterials.push(trailMaterials);

      const lightGeometry = new THREE.BufferGeometry();
      lightGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([positions[0]!, positions[1]!, positions[2]!]),
          3,
        ),
      );
      const lightMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(1.2, 0.86, 0.42),
        size: backend === "webgpu" ? 0.048 : 0.018,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const lightPoint = new THREE.Points(lightGeometry, lightMaterial);
      lightPoint.frustumCulled = false;
      lightPoint.renderOrder = 2;
      this.archLightPoints.push(lightPoint);
      this.archLightMaterials.push(lightMaterial);
      archRoot.add(lightPoint);
    }
    this.group.add(archRoot);

    const grandVaultRoot = new THREE.Group();
    const grandVaultColors = [
      new THREE.Color(0.08, 0.72, 1.32),
      new THREE.Color(0.62, 0.18, 1.24),
      new THREE.Color(1.28, 0.56, 0.16),
    ] as const;
    for (const [ribIndex, positions] of architecture.grandVaultRibs.entries()) {
      const points = Array.from(
        { length: positions.length / 3 },
        (_, pointIndex) =>
          new THREE.Vector3(
            positions[pointIndex * 3]!,
            positions[pointIndex * 3 + 1]!,
            positions[pointIndex * 3 + 2]!,
          ),
      );
      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        points.length - 1,
        0.0064,
        5,
        false,
      );
      const material = new THREE.MeshBasicMaterial({
        color: grandVaultColors[ribIndex % grandVaultColors.length],
        transparent: true,
        opacity: 0.058,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const rib = new THREE.Mesh(geometry, material);
      rib.renderOrder = -1;
      grandVaultRoot.add(rib);
      this.grandVaultMeshes.push(rib);
      this.grandVaultMaterials.push(material);
    }
    this.group.add(grandVaultRoot);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositionAttribute = new THREE.BufferAttribute(model.particlePositions, 3);
    this.particlePositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.particleGeometry.setAttribute("position", this.particlePositionAttribute);
    this.particleGeometry.setAttribute("color", new THREE.BufferAttribute(model.particleColors, 3));
    this.particleGeometry.setDrawRange(0, this.qualitySettings.particleCount);
    const particleStyle = getSpectralCathedralParticleStyle(backend);
    this.particleMaterial = new THREE.PointsMaterial({
      size: particleStyle.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: particleStyle.opacity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.particleCloud = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleCloud.frustumCulled = false;
    this.particleCloud.renderOrder = 0;
    this.group.add(this.particleCloud);

    this.setQuality(this.quality);
    this.update(0);
  }

  update(absoluteTimeSeconds: number): void {
    if (this.disposed) {
      throw new Error("Spectral Cathedral poetic layer has been disposed");
    }
    const response = evaluateSpectralCathedralVisualFrame(absoluteTimeSeconds, this.modeInfluence);
    const magnitudes = evaluateSpectralCathedralAnchorMagnitudes(
      this.model.anchors,
      absoluteTimeSeconds,
    );
    const hdrScale = this.backend === "webgpu" ? 1 : 0.82;

    for (const [index, anchor] of this.model.anchors.entries()) {
      const breathing = 0.5 + 0.5 * Math.sin(absoluteTimeSeconds * 0.19 + anchor.breathingPhase);
      const pillar = response.pillars[index]!;
      const intensity = Math.min(
        1,
        Math.max(
          0.12,
          0.15 +
            magnitudes[index]! * 0.19 +
            breathing * 0.04 +
            pillar.impact * 0.58 +
            pillar.afterglow * 0.2,
        ),
      );
      const warmth = pillar.warmth * 0.3;
      const cool = [0.12, 0.78, 1.25] as const;
      const warm = [1.18, 0.56, 0.18] as const;
      const red = (cool[0] + (warm[0] - cool[0]) * warmth) * intensity * hdrScale;
      const green = (cool[1] + (warm[1] - cool[1]) * warmth) * intensity * hdrScale;
      const blue = (cool[2] + (warm[2] - cool[2]) * warmth) * intensity * hdrScale;
      const offset = index * 6;
      for (const endpointOffset of [0, 3]) {
        this.pillarColors[offset + endpointOffset] = red;
        this.pillarColors[offset + endpointOffset + 1] = green;
        this.pillarColors[offset + endpointOffset + 2] = blue;
      }
      this.pillarPositions[offset + 5] =
        PILLAR_BOTTOM_Z + pillar.height * (PILLAR_TOP_Z - PILLAR_BOTTOM_Z);

      const shell = this.pillarShells[index]!;
      shell.scale.y = Math.max(0.08, pillar.height);
      shell.position.z = PILLAR_BOTTOM_Z + pillar.height * (PILLAR_TOP_Z - PILLAR_BOTTOM_Z) * 0.5;
      const shellMaterial = this.pillarShellMaterials[index]!;
      shellMaterial.opacity = clamp01(
        0.026 + magnitudes[index]! * 0.022 + pillar.impact * 0.12 + pillar.afterglow * 0.06,
      );
      shellMaterial.color.setRGB(
        0.08 + pillar.warmth * 0.88,
        0.72 - pillar.warmth * 0.2,
        1.18 - pillar.warmth * 0.62,
      );

      const haloMaterial = this.haloMaterials[index]!;
      haloMaterial.opacity = clamp01(
        0.026 + magnitudes[index]! * 0.04 + pillar.impact * 0.16 + pillar.afterglow * 0.07,
      );
      haloMaterial.color.setRGB(
        0.12 + pillar.warmth * 0.48,
        0.7 - pillar.warmth * 0.12,
        1.12 - pillar.warmth * 0.42,
      );
      this.haloGroups[index]!.position.z =
        PILLAR_BOTTOM_Z + pillar.height * (PILLAR_TOP_Z - PILLAR_BOTTOM_Z) * 0.5;
    }
    this.pillarPositionAttribute.needsUpdate = true;
    this.pillarColorAttribute.needsUpdate = true;

    for (const [archIndex, material] of this.archCoreMaterials.entries()) {
      const arch = response.arches[archIndex]!;
      material.opacity = 0.07 + arch.energy * 0.34 + arch.afterglow * 0.14;
      material.color.setRGB(
        0.28 + arch.energy * 0.28,
        0.86 - arch.energy * 0.08,
        0.96 - arch.energy * 0.18,
      );
      for (const [filamentIndex, filamentMaterial] of this.archFilamentMaterials[
        archIndex
      ]!.entries()) {
        filamentMaterial.opacity = this.archFilamentMeshes[archIndex]![filamentIndex]!.visible
          ? 0.03 + arch.energy * (0.24 / (filamentIndex + 1)) + arch.afterglow * 0.07
          : 0;
        filamentMaterial.color.setRGB(
          0.28 + arch.energy * 0.82,
          1.08 - arch.energy * 0.14,
          1.34 - arch.energy * 0.24,
        );
      }
      this.archMembraneMaterials[archIndex]!.opacity =
        0.018 + arch.energy * 0.11 + arch.afterglow * 0.045;
      for (const [repeatIndex, vaultMaterial] of this.vaultMaterials[archIndex]!.entries()) {
        vaultMaterial.opacity = this.vaultLines[archIndex]![repeatIndex]!.visible
          ? (0.09 + arch.afterglow * 0.16 + arch.energy * 0.06) / (repeatIndex + 1)
          : 0;
      }
      for (const [layerIndex, trailMaterial] of this.archTrailMaterials[archIndex]!.entries()) {
        trailMaterial.opacity =
          layerIndex < this.qualitySettings.archTrailLayers
            ? arch.afterglow * (0.24 / (layerIndex + 1))
            : 0;
      }

      const archPositions = this.model.archPositions[archIndex]!;
      const pointIndex = Math.min(
        archPositions.length / 3 - 1,
        Math.round(arch.progress * (archPositions.length / 3 - 1)),
      );
      const pointAttribute = this.archLightPoints[archIndex]!.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      pointAttribute.setXYZ(
        0,
        archPositions[pointIndex * 3]!,
        archPositions[pointIndex * 3 + 1]!,
        archPositions[pointIndex * 3 + 2]!,
      );
      pointAttribute.needsUpdate = true;
      this.archLightMaterials[archIndex]!.opacity = clamp01(arch.energy * 0.9);
    }

    updateSpectralCathedralParticles(
      this.model,
      absoluteTimeSeconds,
      response.particles.map((particle) => particle.energy),
      this.qualitySettings.particleCount,
    );
    this.particlePositionAttribute.needsUpdate = true;
    const particleStyle = getSpectralCathedralParticleStyle(this.backend);
    const meanParticleEnergy =
      response.particles.reduce((sum, particle) => sum + particle.energy, 0) /
      response.particles.length;
    this.particleMaterial.opacity = particleStyle.opacity * (1 + meanParticleEnergy * 0.52);
    this.grandVaultMaterials.forEach((material, index) => {
      const breathing =
        0.82 + Math.sin(absoluteTimeSeconds * (0.07 + index * 0.003) + index) * 0.18;
      material.opacity = this.grandVaultMeshes[index]!.visible
        ? 0.036 + meanParticleEnergy * 0.052 * breathing
        : 0;
    });
  }

  setQuality(level: QualityLevel): void {
    if (this.disposed) {
      throw new Error("Spectral Cathedral poetic layer has been disposed");
    }
    this.quality = level;
    this.qualitySettings = getSpectralCathedralPoeticQuality(level, this.backend);
    const architectureLayers = getSpectralCathedralArchitectureLayerCounts(level);
    this.particleGeometry.setDrawRange(0, this.qualitySettings.particleCount);
    this.haloGroups.forEach((group, index) => {
      group.visible = index < this.qualitySettings.volumetricHaloCount;
    });
    this.archTrailLines.forEach((trails) => {
      trails.forEach((trail, index) => {
        trail.visible = index < this.qualitySettings.archTrailLayers;
      });
    });
    this.archFilamentMeshes.forEach((filaments) => {
      filaments.forEach((filament, index) => {
        filament.visible = index < architectureLayers.filamentsPerArch;
      });
    });
    this.vaultLines.forEach((vaults) => {
      vaults.forEach((vault, index) => {
        vault.visible = index < architectureLayers.vaultsPerArch;
      });
    });
    this.grandVaultMeshes.forEach((rib, index) => {
      rib.visible = index < architectureLayers.grandVaults;
    });
  }

  getStats(): SpectralCathedralPoeticLayerStats {
    const architectureLayers = getSpectralCathedralArchitectureLayerCounts(this.quality);
    return {
      anchors: this.model.anchors.length,
      arches: this.model.archPositions.length,
      pillarShells: this.pillarShells.length,
      archFilaments: this.model.archPositions.length * CATHEDRAL_ARCH_FILAMENTS,
      visibleArchFilaments: this.model.archPositions.length * architectureLayers.filamentsPerArch,
      vaultRepeats: this.model.archPositions.length * CATHEDRAL_VAULT_REPEATS,
      visibleVaultRepeats: this.model.archPositions.length * architectureLayers.vaultsPerArch,
      archMembranes: this.archMembraneMeshes.length,
      grandVaultRibs: CATHEDRAL_GRAND_VAULT_RIBS,
      visibleGrandVaultRibs: architectureLayers.grandVaults,
      particles: this.qualitySettings.particleCount,
      volumetricHalos: this.qualitySettings.volumetricHaloCount,
      archTrailLayers: this.qualitySettings.archTrailLayers,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pillarGeometry.dispose();
    this.pillarMaterial.dispose();
    this.pillarShellGeometry.dispose();
    this.pillarShellMaterials.forEach((material) => material.dispose());
    this.haloGeometry.dispose();
    this.haloMaterials.forEach((material) => material.dispose());
    this.haloTexture.dispose();
    this.archCoreLines.forEach((line) => line.geometry.dispose());
    this.archCoreMaterials.forEach((material) => material.dispose());
    this.archFilamentMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => mesh.geometry.dispose());
    });
    this.archFilamentMaterials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });
    this.archMembraneMeshes.forEach((mesh) => mesh.geometry.dispose());
    this.archMembraneMaterials.forEach((material) => material.dispose());
    this.vaultLines.forEach((vaults) => {
      vaults.forEach((vault) => vault.geometry.dispose());
    });
    this.vaultMaterials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });
    this.archTrailLines.forEach((trails) => {
      trails.forEach((line) => line.geometry.dispose());
    });
    this.archTrailMaterials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });
    this.archLightPoints.forEach((point) => point.geometry.dispose());
    this.archLightMaterials.forEach((material) => material.dispose());
    this.grandVaultMeshes.forEach((mesh) => mesh.geometry.dispose());
    this.grandVaultMaterials.forEach((material) => material.dispose());
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.group.clear();
  }
}
