import { createPatternQualityContract } from "../qualityContract";
import { observation } from "./observation";
import { study } from "./study";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./audio/score";
import { createResidueBloomAudioProgram } from "./audio/synthesis";
import { ResidueBloomDetails } from "./details/ResidueBloomDetails";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "./math/model";
import type { PatternScene } from "../contracts";
import type { ResidueBloomPatternDefinition } from "./types";
import { validateResidueBloomPattern } from "./validate";

const residueBloomScore = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

function ResidueBloomMathematicalDetails() {
  return <ResidueBloomDetails pattern={residueBloomPattern} />;
}

export const residueBloomPattern: ResidueBloomPatternDefinition = {
  kind: "residue-bloom",
  id: "residue-bloom",
  order: 1,
  publication: "published",
  title: {
    en: "Residue Bloom",
    ja: "剰余の花",
  },
  subtitle: {
    en: "An observatory for harmonics congruent to one",
    ja: "4で割って1余る倍音の観測所",
  },
  formulaLatex: "f(x)=5\\sum_{k=0}^{12}\\frac{1}{k+1}\\sin((4k+1)x)",
  contrastProfile: {
    composition: "phasor-chain-waveform",
    motion: "unidirectional-rotation-projection",
    space: "split-complex-plane-history",
    palette: "gold-thread-sage-ivory",
    timbre: "silken-harmonic-contact",
    rhythm: "ghosted-four-four-sixteenths",
    time: "absolute-phasor-long-form",
    audio: {
      onsetPattern: "constant-sixteenth-with-ghost-rotation",
      articulation: "overlapping-residue-contact",
      pitchMapping: "residue-harmonics-on-alternating-carriers",
      spatialGesture: "phasor-position-pan",
      wetCharacter: "section-bloom-room",
    },
  },
  dramaturgy: {
    cycleSeconds: 144,
    expressiveAxes: ["density", "dynamics", "timbre", "space", "motion", "color"],
    localMathMapping: true,
    qualityContract: createPatternQualityContract(),
    sections: [
      {
        id: "intro",
        startRatio: 0,
        endRatio: 8 / 48,
        audioEnergy: 0.32,
        visualEnergy: 0.38,
        motionEnergy: 0.34,
      },
      {
        id: "growth",
        startRatio: 8 / 48,
        endRatio: 20 / 48,
        audioEnergy: 0.68,
        visualEnergy: 0.72,
        motionEnergy: 0.7,
      },
      {
        id: "bloom",
        startRatio: 20 / 48,
        endRatio: 32 / 48,
        audioEnergy: 1,
        visualEnergy: 1,
        motionEnergy: 0.96,
      },
      {
        id: "hush",
        startRatio: 32 / 48,
        endRatio: 40 / 48,
        audioEnergy: 0.2,
        visualEnergy: 0.3,
        motionEnergy: 0.22,
      },
      {
        id: "return",
        startRatio: 40 / 48,
        endRatio: 1,
        audioEnergy: 0.62,
        visualEnergy: 0.66,
        motionEnergy: 0.6,
      },
    ],
  },
  presentation: {
    observatoryLabel: "RESIDUE BLOOM OBSERVATORY",
    formulaEyebrow: "FOURIER SERIES / フーリエ級数",
    formulaSummary:
      "Exact phasor synthesis and primary waveform · band-limited musical sonification.",
    annotationContext: "ANALYTIC SPECTRUM MAPPING / 解析的周波数対応",
    annotations: [
      { label: "n = 1", value: "55.00 Hz" },
      { label: "n = 5", value: "275.00 Hz" },
      { label: "n = 9", value: "495.00 Hz" },
      { label: "n = 13", value: "715.00 Hz" },
    ],
    poeticEyebrow: "VISIBLE HARMONICS / AUDIBLE GEOMETRY",
    poeticLines: ["円は音になり、", "音は光の庭になる。"],
    canvasAriaLabel: "フーリエ級数から生成されるエピサイクルと波形",
  },
  formula: RESIDUE_BLOOM_SERIES,
  terms: RESIDUE_BLOOM_SERIES.terms,
  mathematics: {
    operation: "finite-fourier-series-synthesis",
    coefficientSource: "analytic",
    phasorProjection: "imaginary",
    fftUsed: false,
    visualTime: {
      mode: "absolute-linear",
      angularRateRadiansPerSecond: RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
      wrapsWithScore: false,
    },
    spectrum: {
      kind: "analytic-one-sided-sine-amplitude",
      frequencyScale: "logarithmic",
      referenceFrequencyHz: 55,
    },
    rendering: {
      method: "sampled-polyline",
    },
    phasorLatex: "z(x)=\\sum_{k=0}^{12}A_k e^{i n_kx},\\quad f(x)=\\operatorname{Im}z(x)",
    complexCoefficientLatex: "c_{n_k}=-\\frac{iA_k}{2},\\quad c_{-n_k}=\\frac{iA_k}{2}",
  },
  audio: {
    mode: "sonification",
    fundamentalHz: 55,
    initialVolume: 0.35,
    roomSeconds: 0.82,
    sonificationLatex:
      "\\begin{aligned}" +
      "w_k&=\\frac{A_k}{(k+1)^{2.2}}\\\\[4pt]" +
      "f_{k,e}^{\\sigma}&=n_k\\nu_e(1+\\sigma d)\\\\[4pt]" +
      "a_{k,e}^{\\sigma}(\\tau)&=w_kT_{k,e}(\\tau)P_{k,e}^{\\sigma}|H_{k,e}^{\\sigma}|\\\\[4pt]" +
      "\\theta_{k,e}^{\\sigma}(\\tau)&=2\\pi f_{k,e}^{\\sigma}\\tau+\\arg H_{k,e}^{\\sigma}\\\\[4pt]" +
      "s_e^{\\sigma}(\\tau)&=C_eG_eE_e(\\tau)\\\\" +
      "&\\quad\\cdot\\sum_{k\\in K_e(F_s)}a_{k,e}^{\\sigma}(\\tau)\\sin\\theta_{k,e}^{\\sigma}(\\tau)" +
      "\\end{aligned}",
    score: residueBloomScore,
    createProgram: () => createResidueBloomAudioProgram(residueBloomScore),
  },
  observation,
  study,
  education: {
    gentleTitle: "見えない音の粒が、ひとつの花になる。",
    gentleBody:
      "大きさと速さの異なる13個の円がつながり、その先端の上下運動が右へ流れる波を正確に描きます。音と周囲の光・粒子は、2分24秒の同じ楽譜を読み、発音ごとに呼吸します。",
    mathematicalTitle: "Residue class 1 mod 4",
    mathematicalBody:
      "周波数指数を nₖ=4k+1 に制限した有限フーリエ級数です。複素フェーザの和 z(x) の虚部を f(x) として表示し、主波形と円の終点は同じ値を共有します。厳密な幾何は x(t)=0.31t で独立に進み、48小節の発音イベントによって座標や半径を変形しません。",
    scopeNotice:
      "本章は既知の解析係数から有限フーリエ級数を合成する作品です。未知の信号をDFTで解析する処理や、FFTアルゴリズムの計算過程は表示していません。",
    sonificationBody:
      "音声は級数を55 Hzで無加工再生したものではありません。各発音の絶対イベント時刻で z(0.31tₑ) から定位・明るさ・強さ・減衰を導き、48小節の反復でも数学時刻は続きます。残響量は区間プロファイルから決まります。同じ調波指数を440 / 495 Hzへ移し、知覚重みwと0.45 Fs未満の帯域制約を適用します。270〜340 msの有限尾が重なり、高次調波の接触は45 msで先に減衰します。式は一つの発音のdry信号で、τは発音後の秒数、σは左−1／右+1。Eは有限包絡、Tは接触量、Pは定位利得、Hは包絡前の1極定常応答、Gは発音利得、Cは校正と調波重みの正規化です。Kは帯域内の調波集合で、重なる発音を足した後にEQ・残響・出力制御を通します。",
    poeticLayerBody:
      "粒子、光の膜、星雲、ブルーム、二次トレイルに加え、発音時の調波コロナと履歴パルスも共有イベントスコアへ反応する詩的な造形です。コロナは音と同じ有限包絡・接触量へ従い、履歴パルスには別に短い残光を加えます。厳密な円・主波形と同じ点へ重なる別オブジェクトで、係数、位相、半径、終点、主波形の座標を変形しません。",
  },
  MathematicalDetails: ResidueBloomMathematicalDetails,
  validate() {
    validateResidueBloomPattern(this);
  },
  async loadScene() {
    const module = await import("./scene/scene");
    return async (options) => {
      const scene = await module.createResidueBloomScene(options);
      const adapter: PatternScene = {
        update(frame) {
          scene.update({
            ...frame,
            score: evaluateMusicalScore(residueBloomScore, frame.time),
          });
        },
        resize: (viewport) => scene.resize(viewport),
        setQuality: (level) => scene.setQuality(level),
        dispose: () => scene.dispose(),
      };
      return adapter;
    };
  },
};
