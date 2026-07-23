import { createFiveActSections } from "../analyticDefinition";
import { RIEMANN_VEIL_SCORE } from "./audio/score";
import { createRiemannVeilAudioProgram } from "./audio/synthesis";
import { RiemannVeilDetails } from "./details/RiemannVeilDetails";
import type { RiemannVeilPatternDefinition } from "./types";
import { validateRiemannVeilPattern } from "./validate";
export const riemannVeilPattern: RiemannVeilPatternDefinition = {
  kind: "riemann-veil",
  id: "riemann-veil",
  order: 9,
  publication: "published",
  title: { en: "Riemann Veil", ja: "リーマンの帳" },
  subtitle: {
    en: "Quadratic frequencies weave four finite layers",
    ja: "二次周波数が織る四枚の有限層",
  },
  formulaLatex: "R_M(x)=\\sum_{n=1}^{M}\\frac{\\sin(n^2x)}{n^2}",
  contrastProfile: {
    composition: "four-deep-quadratic-curve-veils",
    motion: "horizontal-focus-thread",
    space: "deep-wide-layered-membranes",
    palette: "silver-pale-violet-indigo",
    timbre: "rounded-glass-thread-piko",
    rhythm: "quadratic-expanding-gaps",
    time: "five-sixteen-second-weaves",
    audio: {
      onsetPattern: "quadratic-answer-with-eighty-second-weave",
      articulation: "glass-rounded-finite-tail",
      pitchMapping: "quadratic-index-compressed",
      spatialGesture: "thread-crossing-pan",
      wetCharacter: "thin-longer-veil-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 80,
    sections: createFiveActSections(80, [
      { id: "thread", endSeconds: 16, audioEnergy: 0.42, visualEnergy: 0.5, motionEnergy: 0.38 },
      { id: "weave", endSeconds: 32, audioEnergy: 0.68, visualEnergy: 0.72, motionEnergy: 0.64 },
      { id: "interference", endSeconds: 48, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.9 },
      { id: "veil", endSeconds: 64, audioEnergy: 0.54, visualEnergy: 0.66, motionEnergy: 0.46 },
      { id: "release", endSeconds: 80, audioEnergy: 0.7, visualEnergy: 0.74, motionEnergy: 0.62 },
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
    observatoryLabel: "RIEMANN VEIL OBSERVATORY",
    formulaEyebrow: "QUADRATIC FOURIER SUPPORT / 二次周波数支持",
    formulaSummary: "Four smooth finite sums · square-index spectral support.",
    annotationContext: "FINITE TRUNCATIONS / 有限打切り",
    annotations: [
      { label: "M", value: "12 · 24 · 48 · 96" },
      { label: "SUPPORT", value: "k=n²" },
      { label: "Aₙ", value: "1 / n²" },
      { label: "ζ ZEROS", value: "NOT USED" },
    ],
    poeticEyebrow: "THREAD / INTERFERENCE / VEIL",
    poeticLines: ["平方数の糸が細部を織り、", "有限の帳を奥行きへ重ねる。"],
    canvasAriaLabel: "二次周波数を持つRiemann型有限部分和の四層曲線と平方数支持",
  },
  education: {
    gentleTitle: "細くなる波の糸が、何層もの帳を織る。",
    gentleBody:
      "1、4、9、16という平方数の速さで揺れる波を、1、1/4、1/9、1/16のように弱くしながら重ねます。12、24、48、96本までの四枚の帳を奥行きに並べると、すべて有限で滑らかなまま、追加した高い周波数が細い皺を増やす過程を比較できます。",
    mathematicalTitle: "Finite quadratic-frequency trigonometric sums",
    mathematicalBody:
      "M=12,24,48,96の有限三角多項式Rₘを直接比較します。支持は平方数k=n²、正弦振幅は1/n²で、二側複素係数の共役対称性を保ちます。各Rₘは2π周期かつC∞で、描画標本数は最高指数M²から決定します。",
    scopeNotice:
      "無限和の微分可能性、自己相似性、極限の正則性を有限画像から主張しません。本章のRiemann型関数はRiemannゼータ関数の零点を表示するものではなく、四層はいずれも有限和です。",
    sonificationBody:
      "平方数順序、主声部の1/n²強度比、絶対発音時刻のn²位相を中域のガラス質ピコへ写します。広がる発音間隔と短い応答声部には80秒の強弱、尾長、wet輪郭を重ね、n²位相を連続定位にも使います。460–1,020 Hzへの圧縮、丸めた高域、薄い余韻は音色演出です。",
    poeticLayerBody:
      "膜の皺、銀粉、残光、四層間の奥行きは詩的造形です。平方数支持に対応する糸だけが局所発光しますが、膜の折れや粒子を有限和の特異点として扱いません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.94,
    sonificationLatex: "n^2\\mapsto(t_n,f_n),\\quad G_n^{\\mathrm{main}}\\propto1/n^2",
    score: RIEMANN_VEIL_SCORE,
    createProgram: createRiemannVeilAudioProgram,
  },
  MathematicalDetails: RiemannVeilDetails,
  validate() {
    validateRiemannVeilPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createRiemannVeilScene;
  },
};
