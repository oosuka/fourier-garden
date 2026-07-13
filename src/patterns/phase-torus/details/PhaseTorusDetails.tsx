import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { TORUS_MODES } from "../math/model";

const IDENTITIES = [
  "\\theta_I(t)=(0.08t+\\pi/5,0.08\\sqrt2t+\\pi/7)\\bmod2\\pi",
  "F_T(\\theta)=\\sum_{1\\le|m|+|n|\\le3}c_{m,n}e^{i(m\\theta_1+n\\theta_2)}",
  "c_{m,n}=C e^{-0.35(m^2+n^2)}e^{-i(m\\pi/5+n\\pi/7)},\\qquad \\sum|c_{m,n}|=1",
  "c_{-m,-n}=\\overline{c_{m,n}}\\Longrightarrow F_T(\\theta)\\in\\mathbb R",
];

const REPRESENTATIVE_MODES = TORUS_MODES.filter(
  (mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0),
);

const MODE_ROWS = REPRESENTATIVE_MODES.map((mode) => ({
  id: `torus-mode-${mode.m}-${mode.n}`,
  cells: {
    mode: `(${mode.m},${mode.n})`,
    conjugate: `(${-mode.m},${-mode.n})`,
    magnitude: mode.magnitude.toFixed(6),
    phase: Math.atan2(mode.imaginary, mode.real).toFixed(5),
    speed: (0.08 * (mode.m + mode.n * Math.SQRT2)).toFixed(5),
    absoluteSpeed: Math.abs(mode.m + mode.n * Math.SQRT2).toFixed(5),
  },
}));

export function PhaseTorusDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[1]!}
      identities={[IDENTITIES[0]!, IDENTITIES[2]!, IDENTITIES[3]!]}
      mathematicalBody={[
        "位相空間はflat二次元トーラスT²=R²/(2πZ)²です。無理比流θᵢ(t)は角速度ベクトル0.08(1,√2)を持ち、√2が無理数なので周期を持たず、Kroneckerの定理によりT²上で稠密です。有限の描画履歴はこの定理の証明としては使いません。",
        "Fourier場Fₜは格子支持1≤|m|+|n|≤3上の24文字eⁱ⁽ᵐθ¹⁺ⁿθ²⁾からなる有限和です。係数絶対値はe⁻⁰·³⁵⁽ᵐ²⁺ⁿ²⁾に比例し、初期点(π/5,π/7)を位相へ組み込んでいます。共役対称性c₋ₘ,₋ₙ=conj(cₘ,ₙ)により場は実数値です。",
        "比較する有理流0.08(1,2)は時間25π秒で初期点へ戻る閉軌道です。画面の3Dトーラスはflat基本領域と係数格子を観察する非等長埋め込みであり、その曲率をFourier文字の固有値や係数へ混入させません。",
      ]}
      scopeNotice="無理比から非周期性と稠密性を数学的に区別しますが、直近180秒の線が面を埋める見た目だけを証明とはしません。3D形状は表示写像で、有限24項の係数は直接評価し、FFT推定しません。"
      parameters={[
        { label: "位相空間", value: "T²=R²/(2πZ)² / flat metric" },
        { label: "無理流", value: "ω=0.08(1,√2) rad/s" },
        { label: "有理比較", value: "ω=0.08(1,2) / 周期25π秒" },
        { label: "Fourier支持", value: "1≤|m|+|n|≤3 / 24格子点" },
        { label: "代表共役対", value: `${REPRESENTATIVE_MODES.length}組` },
        { label: "係数規約", value: "Σ|cₘₙ|=1、共役対称" },
        { label: "初期点", value: "(π/5, π/7)" },
        { label: "表示履歴", value: "直近180秒 / 最大2,048点" },
        { label: "音楽構成", value: "84秒 / 420イベント / 7/8巡回 / 5幕" },
        { label: "変換アルゴリズム", value: "24項直接評価・FFT不使用" },
      ]}
      profile={{
        eyebrow: "FOURIER-LATTICE PROFILE",
        title: "12共役対の代表係数 |cₘₙ|",
        description:
          "各棒は±(m,n)共役対の片側代表です。反対格子点は同じ絶対値と逆符号の位相を持ち、実数場を構成します。",
        items: REPRESENTATIVE_MODES.map((mode) => ({
          id: `torus-magnitude-${mode.m}-${mode.n}`,
          label: `${mode.m},${mode.n}`,
          value: mode.magnitude,
          displayValue: mode.magnitude.toFixed(4),
        })),
      }}
      tables={[
        {
          eyebrow: "CONJUGATE MODE LEDGER",
          title: "代表格子点・係数位相・流に沿う角速度",
          description:
            "mode speedは無理流に沿う文字位相の時間微分0.08(m+n√2)です。音高にはその絶対値を単調圧縮して使います。",
          columns: [
            { key: "mode", label: "(m,n)" },
            { key: "conjugate", label: "共役点" },
            { key: "magnitude", label: "|cₘₙ|" },
            { key: "phase", label: "arg c" },
            { key: "speed", label: "位相速度" },
            { key: "absoluteSpeed", label: "|m+n√2|" },
          ],
          rows: MODE_ROWS,
        },
        {
          eyebrow: "FLOW COMPARISON",
          title: "有理比と無理比の軌道分類",
          description:
            "分類は角速度比から得ます。表示履歴の長さや標本密度から推測したものではありません。",
          columns: [
            { key: "flow", label: "流" },
            { key: "ratio", label: "ω₂/ω₁" },
            { key: "period", label: "周期" },
            { key: "closure", label: "軌道" },
            { key: "reason", label: "根拠" },
          ],
          rows: [
            {
              id: "rational-flow",
              cells: {
                flow: "rational mirror",
                ratio: "2",
                period: "25π s",
                closure: "閉軌道",
                reason: "整数関係 2ω₁−ω₂=0",
              },
            },
            {
              id: "irrational-flow",
              cells: {
                flow: "open orbit",
                ratio: "√2",
                period: "なし",
                closure: "非周期・稠密",
                reason: "1と√2はQ上一次独立",
              },
            },
          ],
        },
      ]}
      causality={[
        {
          id: "torus-flow",
          quantity: "Kronecker流θᵢ(t)",
          status: "保持",
          visual: "トーラス上の絶対時刻軌道",
          audio: "閉じない連続回転定位",
        },
        {
          id: "torus-mode",
          quantity: "格子点(m,n)と係数cₘₙ",
          status: "保持",
          visual: "基本領域の24点と実数場",
          audio: "位相・ゲイン・巡回順序",
        },
        {
          id: "torus-pitch",
          quantity: "組合せ速度|m+n√2|",
          status: "圧縮",
          visual: "文字位相の厳密な進行",
          audio: "440–960 Hzへ単調写像",
        },
        {
          id: "torus-poetic",
          quantity: "位相霧・環状ハロー",
          status: "演出",
          visual: "3D埋め込みの周囲へ付加",
          audio: "回転残響、係数は不変",
        },
      ]}
    />
  );
}
