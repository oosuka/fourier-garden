import { RESIDUE_BLOOM_SCORE_DEFINITION, buildMusicalScoreProgram } from "../audio/musicalScore";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/fourier";
import type { PatternDefinition } from "./types";

const residueBloomScore = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

export const patternRegistry: readonly PatternDefinition[] = [
  {
    id: "residue-bloom",
    order: 1,
    title: {
      en: "Residue Bloom",
      ja: "剰余の花",
    },
    subtitle: {
      en: "An observatory for harmonics congruent to one",
      ja: "4で割って1余る倍音の観測所",
    },
    formulaLatex: "f(x)=5\\sum_{k=0}^{12}\\frac{1}{k+1}\\sin((4k+1)x)",
    formula: RESIDUE_BLOOM_SERIES,
    terms: RESIDUE_BLOOM_SERIES.terms,
    mathematics: {
      operation: "finite-fourier-series-synthesis",
      coefficientSource: "analytic",
      phasorProjection: "imaginary",
      fftUsed: false,
      visualAngularRate: RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
      phasorLatex: "z(x)=\\sum_{k=0}^{12}A_k e^{i n_kx},\\quad f(x)=\\operatorname{Im}z(x)",
      complexCoefficientLatex: "c_{n_k}=-\\frac{iA_k}{2},\\quad c_{-n_k}=\\frac{iA_k}{2}",
    },
    audio: {
      mode: "sonification",
      fundamentalHz: 55,
      initialVolume: 0.35,
      roomSeconds: 1.9,
      sonificationLatex:
        "g_{\\nu_j}(\\tau)=CE(\\tau)\\sum_{n_k\\nu_j<0.45F_s}\\frac{A_k}{(k+1)^{1.4}}\\sin(2\\pi n_k\\nu_j\\tau)",
      score: residueBloomScore,
    },
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
        "音声は級数そのものを55 Hzで無加工再生したものではありません。音と詩的造形は同じ48小節イベント表を共有します。同じ調波指数を440 / 495 Hzへ移し、基礎知覚重みとナイキスト制約を保った後、イベント時フェーザを定位、後段フィルター、アクセント、残響量へ有界に写す音楽的ソニフィケーションです。",
      poeticLayerBody:
        "粒子、光の膜、星雲、ブルーム、二次トレイルは共有イベントスコアへ反応しますが、フーリエ係数やFFT解析値ではありません。発音時の履歴終点を光の起点として使う詩的な造形です。",
    },
    async loadScene() {
      const module = await import("./residueBloomScene");
      return module.createResidueBloomScene;
    },
  },
];
