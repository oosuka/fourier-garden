import { createFiveActSections } from "../analyticDefinition";
import { DIRICHLET_LANTERNS_SCORE } from "./audio/score";
import { createDirichletLanternsAudioProgram } from "./audio/synthesis";
import { DirichletLanternsDetails } from "./details/DirichletLanternsDetails";
import type { DirichletLanternsPatternDefinition } from "./types";
import { validateDirichletLanternsPattern } from "./validate";
export const dirichletLanternsPattern: DirichletLanternsPatternDefinition = {
  kind: "dirichlet-lanterns",
  id: "dirichlet-lanterns",
  order: 7,
  publication: "published",
  title: { en: "Dirichlet Lanterns", ja: "ディリクレの灯" },
  subtitle: {
    en: "Finite kernels illuminate convergence and overshoot",
    ja: "有限核が照らす収束と越波",
  },
  formulaLatex: "D_N(x)=\\sum_{n=-N}^{N}e^{inx}=\\frac{\\sin((N+1/2)x)}{\\sin(x/2)}",
  contrastProfile: {
    composition: "four-kernel-lantern-columns",
    motion: "scan-static-finite-kernels",
    space: "deep-vertical-analysis-columns",
    palette: "amber-white-crimson-navy",
    timbre: "odd-harmonic-packet-piko",
    rhythm: "sparse-main-side-lobe-responses",
    time: "staged-order-accumulation",
    audio: {
      onsetPattern: "anchor-side-lobes-with-long-packet-rotation",
      articulation: "reedy-harmonic-packet",
      pitchMapping: "odd-support-midrange",
      spatialGesture: "four-column-pan",
      wetCharacter: "ember-short-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 60,
    sections: createFiveActSections(60, [
      { id: "kindling", endSeconds: 7.5, audioEnergy: 0.38, visualEnergy: 0.46, motionEnergy: 0.3 },
      {
        id: "side-lobes",
        endSeconds: 22.5,
        audioEnergy: 0.68,
        visualEnergy: 0.72,
        motionEnergy: 0.62,
      },
      { id: "overshoot", endSeconds: 37.5, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.9 },
      {
        id: "fejer-calm",
        endSeconds: 52.5,
        audioEnergy: 0.42,
        visualEnergy: 0.5,
        motionEnergy: 0.36,
      },
      { id: "ember", endSeconds: 60, audioEnergy: 0.62, visualEnergy: 0.66, motionEnergy: 0.54 },
    ]),
    expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: {
      comparableLoudness: true,
      decayingSonicContinuity: true,
      nonuniformVisualField: true,
      localVisualMotion: true,
      humanReviewRequired: true,
    },
  },
  presentation: {
    observatoryLabel: "DIRICHLET LANTERNS OBSERVATORY",
    formulaEyebrow: "FINITE FOURIER KERNEL / 有限Fourier核",
    formulaSummary: "Four exact truncations · Gibbs overshoot · Fejér comparison.",
    annotationContext: "TRUNCATION ORDERS / 打切り次数",
    annotations: [
      { label: "N", value: "3 · 7 · 15 · 31" },
      { label: "Dₙ(0)", value: "2N + 1" },
      { label: "SUPPORT", value: "|n|≤N" },
      { label: "FEJÉR", value: "CESÀRO" },
    ],
    poeticEyebrow: "PEAK / SIDE LOBE / EMBER",
    poeticLines: ["有限の灯は跳躍を照らし、", "消えない越波を輪郭に残す。"],
    canvasAriaLabel: "Dirichlet核の中心峰、側葉、矩形波部分和、Fejér平均の比較",
  },
  education: {
    gentleTitle: "鋭い角を波だけで描くと、縁に揺れが残る。",
    gentleBody:
      "矩形波の角を有限個の滑らかな波だけで描くと、使う波を増やすほど平らな部分は整いますが、跳び目のそばには越波が残ります。四本の灯柱はN=3、7、15、31の中心峰と側葉を同じ尺度で比べ、後半では平均の取り方を変えたFejérの穏やかな収束と見比べます。",
    mathematicalTitle: "Dirichlet kernels and Gibbs phenomenon",
    mathematicalBody:
      "N=3,7,15,31のDirichlet核、矩形波の有限Fourier部分和、Fejér平均を解析係数から比較します。Dₙ(0)=2N+1は連続延長で評価し、σₙgにはCesàro重み1−n/(N+1)を用います。観測点は絶対transport時刻で移動します。",
    scopeNotice:
      "有限部分和を無限級数と呼ばず、跳躍点での収束、Gibbs越波、Fejér平均を区別します。側葉を描画誤差として平滑化せず、標本データへのDFT・FFTも行いません。",
    sonificationBody:
      "矩形波の奇数支持と1/n比を短い中域パケットへ保持し、四つの打切り次数を時間区画と定位へ割り当てます。主発音と側葉応答には60秒の強弱、尾長、wet輪郭と、同じ奇数次数から得る小振幅の連続定位を重ねます。帯域圧縮と短い残響はソニフィケーション層です。",
    poeticLayerBody:
      "灯ハロー、煙、残火、奥行き方向の比較柱は核値と別の詩的造形です。発音次数に対応する中心峰または側葉だけを明るくし、厳密曲線と越波量を変形しません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.74,
    sonificationLatex: "w_n=1/n,\\quad n\\le N,\\ n\\text{ odd}",
    score: DIRICHLET_LANTERNS_SCORE,
    createProgram: createDirichletLanternsAudioProgram,
  },
  MathematicalDetails: DirichletLanternsDetails,
  validate() {
    validateDirichletLanternsPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createDirichletLanternsScene;
  },
};
