/// <reference types="node" />

import vm from "node:vm";
import { vi } from "vitest";

import besselTideSource from "../../public/audio/chapters/bessel-tide.js?raw";
import dirichletLanternsSource from "../../public/audio/chapters/dirichlet-lanterns.js?raw";
import lissajousOrchardSource from "../../public/audio/chapters/lissajous-orchard.js?raw";
import mobiusChoirSource from "../../public/audio/chapters/mobius-choir.js?raw";
import phaseTorusSource from "../../public/audio/chapters/phase-torus.js?raw";
import primeConstellationSource from "../../public/audio/chapters/prime-constellation.js?raw";
import residueBloomSource from "../../public/audio/chapters/residue-bloom.js?raw";
import riemannVeilSource from "../../public/audio/chapters/riemann-veil.js?raw";
import sharedPikoSource from "../../public/audio/chapters/shared-piko.js?raw";
import sharedSource from "../../public/audio/chapters/shared.js?raw";
import spectralCathedralSource from "../../public/audio/chapters/spectral-cathedral.js?raw";
import waveletRainSource from "../../public/audio/chapters/wavelet-rain.js?raw";
import workletSource from "../../public/audio/fourier-worklet.js?raw";

export const WORKLET_SOURCES = Object.freeze({
  shared: sharedSource,
  sharedPiko: sharedPikoSource,
  residueBloom: residueBloomSource,
  spectralCathedral: spectralCathedralSource,
  primeConstellation: primeConstellationSource,
  mobiusChoir: mobiusChoirSource,
  besselTide: besselTideSource,
  lissajousOrchard: lissajousOrchardSource,
  dirichletLanterns: dirichletLanternsSource,
  waveletRain: waveletRainSource,
  riemannVeil: riemannVeilSource,
  phaseTorus: phaseTorusSource,
  worklet: workletSource,
});

export const PIKO_CHAPTER_WORKLET_SOURCES = Object.freeze([
  primeConstellationSource,
  besselTideSource,
  lissajousOrchardSource,
  dirichletLanternsSource,
  waveletRainSource,
  riemannVeilSource,
  phaseTorusSource,
]);

export interface WorkletPortStub {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
}

export interface WorkletProcessorStub {
  port: WorkletPortStub;
  fade: number;
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

export interface ChapterProcessorStub {
  createState(program: unknown): unknown;
}

function composeWorkletSource(...sources: readonly string[]): string {
  return sources
    .join("\n")
    .replace(/import\s+[\s\S]*?\s+from\s+["'][^"']+["'];/g, "")
    .replace(/^export\s+/gm, "");
}

const executableWorkletSource = composeWorkletSource(
  sharedSource,
  sharedPikoSource,
  residueBloomSource,
  spectralCathedralSource,
  primeConstellationSource,
  mobiusChoirSource,
  besselTideSource,
  lissajousOrchardSource,
  dirichletLanternsSource,
  waveletRainSource,
  riemannVeilSource,
  phaseTorusSource,
  workletSource,
);

export function loadWorkletProcessor(sampleRate: number): WorkletProcessorStub {
  let Processor: (new () => WorkletProcessorStub) | undefined;

  class AudioWorkletProcessorStub {
    port: WorkletPortStub = {
      onmessage: null,
      postMessage: vi.fn<(message: unknown) => void>(),
    };
  }

  const context = vm.createContext({
    AudioWorkletProcessor: AudioWorkletProcessorStub,
    registerProcessor: (name: string, processorConstructor: new () => WorkletProcessorStub) => {
      if (name !== "fourier-garden-processor") {
        throw new Error(`Unexpected AudioWorklet processor: ${name}`);
      }
      Processor = processorConstructor;
    },
    sampleRate,
  });
  vm.runInContext(executableWorkletSource, context);

  if (!Processor) throw new Error("The worklet did not register its processor");
  return new Processor();
}

export function loadChapterProcessor(
  source: string,
  exportName: string,
  sampleRate: number,
): ChapterProcessorStub {
  const context = vm.createContext({ sampleRate });
  const executableSharedSource = sharedSource.replace(/^export\s+/gm, "");
  context.sharedModule = vm.runInContext(
    `(() => { ${executableSharedSource}\nreturn { clamp, getEqualPowerPanGains, hashUint32, isFiniteNumber, isPositiveFinite, isNonnegativeFinite }; })()`,
    context,
  );

  const executableChapterSource = source
    .replace(
      /import\s+\{([^}]+)\}\s+from\s+["']\.\/shared\.js(?:\?v=\d+)?["'];/,
      "const {$1} = sharedModule;",
    )
    .replace(/^export\s+/gm, "");
  vm.runInContext(
    `${executableChapterSource}\nglobalThis.chapterProcessor = ${exportName};`,
    context,
  );

  return context.chapterProcessor as ChapterProcessorStub;
}

export function sendWorkletMessage(processor: WorkletProcessorStub, data: unknown): void {
  processor.port.onmessage?.({ data });
}

export function createWorkletOutputs(frameCount: number): Float32Array[][] {
  return [
    [new Float32Array(frameCount), new Float32Array(frameCount)],
    [new Float32Array(frameCount), new Float32Array(frameCount)],
  ];
}
