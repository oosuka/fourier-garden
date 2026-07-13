import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { RIEMANN_TRUNCATIONS, getRiemannSampleCount } from "../math/model";

const IDENTITIES = [
  "R_M(x)=\\sum_{n=1}^{M}\\frac{\\sin(n^2x)}{n^2}",
  "c_k^{(M)}=\\begin{cases}-i/(2n^2)&k=n^2,\\ 1\\le n\\le M\\\\i/(2n^2)&k=-n^2,\\ 1\\le n\\le M\\\\0&\\text{otherwise}\\end{cases}",
  "R_M\\in C^\\infty(\\mathbb T),\\qquad \\sum_{n>M}\\frac1{n^2}<\\frac1M",
];

const TRUNCATION_ROWS = RIEMANN_TRUNCATIONS.map((order) => {
  const l1 = Array.from({ length: order }, (_, index) => 1 / (index + 1) ** 2).reduce(
    (sum, value) => sum + value,
    0,
  );
  const squaredCoefficientSum = Array.from(
    { length: order },
    (_, index) => 1 / (index + 1) ** 4,
  ).reduce((sum, value) => sum + value, 0);
  return {
    id: `riemann-truncation-${order}`,
    cells: {
      order: String(order),
      support: String(order),
      maximum: String(order * order),
      samples: getRiemannSampleCount(order).toLocaleString("en-US"),
      l1: l1.toFixed(8),
      energy: squaredCoefficientSum.toFixed(8),
      tail: `< ${(1 / order).toFixed(6)}`,
    },
  };
});

const MODE_ROWS = Array.from({ length: 12 }, (_, index) => {
  const n = index + 1;
  const amplitude = 1 / n ** 2;
  return {
    id: `riemann-mode-${n}`,
    cells: {
      n: String(n),
      frequency: String(n * n),
      amplitude: amplitude.toFixed(7),
      positive: `${(-amplitude / 2).toFixed(7)}i`,
      negative: `${(amplitude / 2).toFixed(7)}i`,
    },
  };
});

export function RiemannVeilDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[0]!}
      identities={IDENTITIES.slice(1)}
      mathematicalBody={[
        "平方数n²だけを周波数支持に持ち、正弦振幅を1/n²とするRiemann型三角級数の有限部分和です。M=12,24,48,96の各Rₘは有限三角多項式なので、それぞれは2π周期かつC∞です。",
        "標準的な二側複素係数では、正の平方数k=n²に−i/(2n²)、負の平方数k=−n²にその複素共役を置きます。非平方数の係数は0で、共役対称性によりRₘは実数値になります。",
        "最高周波数指数M²に対して、折れ線が高周波を偽らないよう標本数を2.5M²以上となる最小の2冪へ固定します。表の係数尾部上界は積分判定によるΣₙ﹥ₘ1/n²<1/Mで、画面の有限層と無限和を同一視するものではありません。",
      ]}
      scopeNotice="本章はRiemann型関数の有限打切り比較です。有限和の皺から極限関数の微分不可能性や自己相似性を証明せず、Riemannゼータ関数の零点とも関係付けません。各層は直接有限和で、FFT推定ではありません。"
      parameters={[
        { label: "周期領域", value: "T=R/2πZ" },
        { label: "有限打切り", value: "M=12, 24, 48, 96" },
        { label: "周波数支持", value: "k=n²、1≤n≤M" },
        { label: "正弦振幅", value: "Aₙ=1/n²、位相0" },
        { label: "複素係数", value: "cₙ²=−i/(2n²)、c₋ₙ²=conj" },
        { label: "最大指数", value: "96²=9,216" },
        { label: "最大描画標本", value: "32,768点" },
        { label: "観測点", value: "x(t)=0.037t mod 2π / 絶対時刻" },
        { label: "音楽構成", value: "80秒 / 190イベント / 5幕" },
        { label: "変換アルゴリズム", value: "直接有限和・FFT不使用" },
      ]}
      profile={{
        eyebrow: "SQUARE-SUPPORT AMPLITUDE",
        title: "先頭12項の正弦振幅 1/n²",
        description:
          "棒長は表示級数の厳密な正弦振幅です。横のnは項番号で、実際の周波数指数はn²へ疎に配置されます。",
        items: Array.from({ length: 12 }, (_, index) => {
          const n = index + 1;
          return {
            id: `amplitude-${n}`,
            label: `n=${n}`,
            value: 1 / n ** 2,
            displayValue: (1 / n ** 2).toFixed(4),
          };
        }),
      }}
      tables={[
        {
          eyebrow: "FINITE TRUNCATION AUDIT",
          title: "四層の支持・標本・有限ノルム",
          description:
            "Σ1/n²は振幅絶対値和、Σ1/n⁴は正弦振幅の二乗和です。tailは無限和との差に使える一様上界です。",
          columns: [
            { key: "order", label: "M" },
            { key: "support", label: "支持点" },
            { key: "maximum", label: "max n²" },
            { key: "samples", label: "描画標本" },
            { key: "l1", label: "Σ1/n²" },
            { key: "energy", label: "Σ1/n⁴" },
            { key: "tail", label: "尾部上界" },
          ],
          rows: TRUNCATION_ROWS,
        },
        {
          eyebrow: "QUADRATIC FOURIER SUPPORT",
          title: "先頭12平方周波数の係数規約",
          description:
            "Aₙは正弦形式、c±ₙ²は二側複素形式です。|c±ₙ²|=Aₙ/2を混同しないよう併記します。",
          columns: [
            { key: "n", label: "n" },
            { key: "frequency", label: "k=n²" },
            { key: "amplitude", label: "Aₙ" },
            { key: "positive", label: "cₙ²" },
            { key: "negative", label: "c₋ₙ²" },
          ],
          rows: MODE_ROWS,
        },
      ]}
      causality={[
        {
          id: "riemann-support",
          quantity: "平方数支持n²",
          status: "保持",
          visual: "指数軸で平方数だけを発光",
          audio: "二次位置に従う発音間隔",
        },
        {
          id: "riemann-amplitude",
          quantity: "振幅1/n²",
          status: "保持",
          visual: "四枚の有限曲線の細部",
          audio: "主音と応答声部の強度比",
        },
        {
          id: "riemann-pitch",
          quantity: "項番号nとn²位相",
          status: "圧縮",
          visual: "絶対時刻0.037n²t",
          audio: "460–1,020 Hzへ単調配置",
        },
        {
          id: "riemann-poetic",
          quantity: "膜・銀粉・残光",
          status: "演出",
          visual: "有限曲線を包む深度層",
          audio: "薄い余韻、特異点は表さない",
        },
      ]}
    />
  );
}
