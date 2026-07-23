import { createFiveActSections } from "../analyticDefinition";
import type { PrimeConstellationPatternDefinition } from "./types";
import { PRIME_CONSTELLATION_SCORE } from "./audio/score";
import { createPrimeConstellationAudioProgram } from "./audio/synthesis";
import { PrimeConstellationDetails } from "./details/PrimeConstellationDetails";
import { validatePrimeConstellationPattern } from "./validate";
export const primeConstellationPattern: PrimeConstellationPatternDefinition = {
  kind: "prime-constellation",
  id: "prime-constellation",
  order: 3,
  publication: "published",
  title: { en: "Prime Constellation", ja: "素数星座" },
  subtitle: {
    en: "Sparse frequencies gather into a moving arithmetic sky",
    ja: "素数だけが灯る算術の空",
  },
  formulaLatex: "z_P(x)=\\frac1{25}\\sum_{p\\in\\mathcal P_{97}}e^{ipx}",
  contrastProfile: {
    composition: "vertical-prime-phase-constellation",
    motion: "independent-prime-angular-velocities",
    space: "sparse-tall-star-field",
    palette: "gold-amber-white",
    timbre: "hard-rounded-point-piko",
    rhythm: "prime-gap-irregular-phrases",
    time: "ten-second-scan-absolute-phase",
    audio: {
      onsetPattern: "prime-gap-clusters-with-sixty-second-arc",
      articulation: "hard-short-point",
      pitchMapping: "cube-root-prime-midrange",
      spatialGesture: "prime-phase-pan",
      wetCharacter: "dry-short-star-tail",
    },
  },
  dramaturgy: {
    cycleSeconds: 60,
    sections: createFiveActSections(60, [
      {
        id: "alignment",
        endSeconds: 10,
        audioEnergy: 0.52,
        visualEnergy: 0.58,
        motionEnergy: 0.42,
      },
      {
        id: "dispersion",
        endSeconds: 20,
        audioEnergy: 0.72,
        visualEnergy: 0.76,
        motionEnergy: 0.7,
      },
      { id: "constellation", endSeconds: 40, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.92 },
      { id: "eclipse", endSeconds: 50, audioEnergy: 0.24, visualEnergy: 0.34, motionEnergy: 0.28 },
      {
        id: "reassembly",
        endSeconds: 60,
        audioEnergy: 0.68,
        visualEnergy: 0.74,
        motionEnergy: 0.62,
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
    observatoryLabel: "PRIME CONSTELLATION OBSERVATORY",
    formulaEyebrow: "PRIME-SUPPORTED EXPONENTIAL SUM / 素数支持指数和",
    formulaSummary: "Twenty-five analytic phase points · prime-gap piko sonification.",
    annotationContext: "PRIME SUPPORT / 素数支持",
    annotations: [
      { label: "p≤97", value: "25 PRIMES" },
      { label: "cₚ", value: "1 / 25" },
      { label: "x(t)", value: "0.06 t" },
      { label: "FFT", value: "NOT USED" },
    ],
    poeticEyebrow: "DISTANCE / GATHERING / ARITHMETIC LIGHT",
    poeticLines: ["離れた数の灯が、", "ひとつの位相空間へ集まる。"],
    canvasAriaLabel: "素数周波数で回転する25個の位相点と素数間隔の星座",
  },
  education: {
    gentleTitle: "素数だけが、夜空の決まった場所で瞬く。",
    gentleBody:
      "97以下の25素数を一つずつ回転速度として与えると、25の光点は同じ円を異なる速さで巡ります。隣り合う素数の距離は星座の線とピコ音の間隔に残るため、規則的な拍の中にも2、4、6、8という算術的な疎密が現れます。すべてが揃う瞬間と散らばる瞬間を、60秒の五幕で往復して観察します。",
    mathematicalTitle: "Prime-supported finite exponential sum",
    mathematicalBody:
      "97以下の25素数を支持とする有限指数和を、係数1/25、初期位相0で直接評価します。整数周波数なので2π周期を持ち、x=0ではzₚ(0)=1、全時刻で|zₚ(x)|≤1です。数学時刻x(t)=0.06tは音楽周期から独立しています。",
    scopeNotice:
      "素数間隔列をFFT解析した結果ではなく、既知の素数支持から合成しています。有限星座の見た目から、素数分布、双子素数、乱雑性に関する未証明命題は主張しません。",
    sonificationBody:
      "素数の昇順と隣接間隔Δⱼを保持し、発音時刻を0.09Δⱼ秒ずつ進めます。素数値は立方根写像で440–920 Hzへ単調圧縮し、同じ絶対位相を連続定位にも使います。10秒の素数句には60秒を横断する強弱、尾長、wet輪郭を重ねます。短い包絡、EQ、残響は聴取のための演出で、係数1/25は変えません。",
    poeticLayerBody:
      "星塵、放射コロナ、星雲、食の暗部は詩的造形です。対応する位相点とリンクの周囲だけを局所的に照らしますが、追加の素数、係数、位相点として数えません。",
  },
  audio: {
    mode: "sonification",
    initialVolume: 0.35,
    roomSeconds: 0.62,
    sonificationLatex: "f_p=440+480\\frac{\\sqrt[3]p-\\sqrt[3]2}{\\sqrt[3]{97}-\\sqrt[3]2}",
    score: PRIME_CONSTELLATION_SCORE,
    createProgram: createPrimeConstellationAudioProgram,
  },
  MathematicalDetails: PrimeConstellationDetails,
  validate() {
    validatePrimeConstellationPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return module.createPrimeConstellationScene;
  },
};
