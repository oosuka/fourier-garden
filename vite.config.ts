import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2023",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html",
        residueBloomQa: "residue-bloom-qa.html",
        spectralCathedralQa: "spectral-cathedral-qa.html",
        mobiusChoirQa: "mobius-choir-qa.html",
        primeConstellationQa: "prime-constellation-qa.html",
        besselTideQa: "bessel-tide-qa.html",
        lissajousOrchardQa: "lissajous-orchard-qa.html",
        dirichletLanternsQa: "dirichlet-lanterns-qa.html",
        waveletRainQa: "wavelet-rain-qa.html",
        riemannVeilQa: "riemann-veil-qa.html",
        phaseTorusQa: "phase-torus-qa.html",
        chapterAudioAbQa: "chapter-audio-ab-qa.html",
      },
    },
  },
  test: {
    environment: "jsdom",
    maxWorkers: 1,
    pool: "threads",
    testTimeout: 10_000,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
