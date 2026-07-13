import { createFiveActSections } from "../analyticDefinition";
import { WAVELET_RAIN_SCORE } from "./audio/score";
import { createWaveletRainAudioProgram } from "./audio/synthesis";
import { WaveletRainDetails } from "./details/WaveletRainDetails";
import type { WaveletRainPatternDefinition } from "./types";
import { validateWaveletRainPattern } from "./validate";
export const waveletRainPattern: WaveletRainPatternDefinition = {
  kind: "wavelet-rain",
  id: "wavelet-rain",
  order: 8,
  publication: "preview",
  title: { en: "Wavelet Rain", ja: "ウェーブレットの雨" },
  subtitle: {
    en: "Localized scales fall through a finite multiresolution field",
    ja: "局在するスケールが降る多重解像度の空",
  },
  formulaLatex: "P_6g_W(t)=c_0\\phi(t)+\\sum_{j=0}^{5}\\sum_{k=0}^{2^j-1}d_{j,k}\\psi_{j,k}(t)",
  contrastProfile: {
    composition: "six-level-time-scale-cell-canopy",
    motion: "vertical-localized-rain-scan",
    space: "shallow-layered-coefficient-plane",
    palette: "cyan-blue-negative-violet",
    timbre: "dry-wood-drop-piko",
    rhythm: "localized-multiscale-bursts",
    time: "sixteen-second-support-scan",
    audio: {
      onsetPattern: "support-bursts-with-sixty-four-second-weather",
      articulation: "dry-scale-dependent-drop",
      pitchMapping: "haar-scale-register",
      spatialGesture: "support-position-pan",
      wetCharacter: "very-short-cool-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 64,
    sections: createFiveActSections(64, [
      {
        id: "first-drop",
        endSeconds: 8,
        audioEnergy: 0.36,
        visualEnergy: 0.42,
        motionEnergy: 0.34,
      },
      { id: "shower", endSeconds: 24, audioEnergy: 0.68, visualEnergy: 0.72, motionEnergy: 0.66 },
      { id: "downpour", endSeconds: 40, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.96 },
      { id: "clearing", endSeconds: 56, audioEnergy: 0.3, visualEnergy: 0.4, motionEnergy: 0.28 },
      {
        id: "after-rain",
        endSeconds: 64,
        audioEnergy: 0.58,
        visualEnergy: 0.62,
        motionEnergy: 0.52,
      },
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
    observatoryLabel: "WAVELET RAIN OBSERVATORY",
    formulaEyebrow: "HAAR MULTIRESOLUTION / Haar多重解像度",
    formulaSummary: "Sixty-three localized coefficients · finite V₆ projection.",
    annotationContext: "TIME–SCALE SUPPORT / 時間・スケール支持",
    annotations: [
      { label: "j", value: "0 … 5" },
      { label: "ψⱼₖ", value: "63 CELLS" },
      { label: "V₆", value: "64 INTERVALS" },
      { label: "FFT", value: "NOT USED" },
    ],
    poeticEyebrow: "SCALE / SUPPORT / RAIN",
    poeticLines: ["局在する差が雨となり、", "六段の時間を通り抜ける。"],
    canvasAriaLabel: "Haarウェーブレットの時間・スケール係数セルと区分一定再構成",
  },
  education: {
    gentleTitle: "大きな変化と小さな変化を、違う粒の雨として見る。",
    gentleBody:
      "同じ1秒の区間を、半分、四分の一、八分の一へと六段階に分け、各場所の左半分と右半分の差を測ります。大きな変化は粗い雨粒、短い局所変化は細かな雨として対応するセルへ落ち、63個の差と一つの全体平均から64区間の再構成が現れます。",
    mathematicalTitle: "Finite Haar multiresolution projection",
    mathematicalBody:
      "1個のスケーリング関数と63個の正規直交HaarウェーブレットでV₆への直交射影を構成します。係数は明示した対象関数の解析積分で求め、P₆gは64個の半開二進区間上で各セル平均へ一致します。",
    scopeNotice:
      "時間・スケール係数はFFT周波数スペクトルではなく、P₆gは元関数gと同一ではありません。不連続点の点値とL²同値類を区別し、雨滴を基底関数そのものとは説明しません。",
    sonificationBody:
      "スケールj、支持位置k/2ʲ、係数絶対値、符号を、それぞれ音高と包絡、左右定位、強度、開始位相0/πへ写します。係数支持の走査順を保ったまま、64秒の強弱、尾長、wet輪郭とスケール由来の連続定位を重ねます。短い木片状の音色とcool roomは聴取のための演出です。",
    poeticLayerBody:
      "雨粒、飛沫、残像、奥行きを持つ六段の係数面は詩的造形を含みます。各滴は対応する支持セルからのみ発生し、セル境界、係数符号、区分一定再構成を変形しません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.58,
    sonificationLatex: "(j,k,d_{j,k})\\mapsto(f_j,p_k,G_{j,k},\\phi_{j,k})",
    score: WAVELET_RAIN_SCORE,
    createProgram: createWaveletRainAudioProgram,
  },
  MathematicalDetails: WaveletRainDetails,
  validate() {
    validateWaveletRainPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createWaveletRainScene;
  },
};
