import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { HAAR_COEFFICIENTS, HAAR_SCALING_COEFFICIENT } from "../math/model";

const IDENTITIES = [
  "g(t)=\\sin(2\\pi t)+0.45\\sin(6\\pi t+\\pi/5)+0.7\\mathbf1_{[3/16,5/16)}-0.55\\mathbf1_{[11/16,13/16)}",
  "\\psi_{j,k}(t)=2^{j/2}\\psi(2^jt-k),\\qquad d_{j,k}=\\langle g,\\psi_{j,k}\\rangle",
  "P_6g=c_0\\phi+\\sum_{j=0}^{5}\\sum_{k=0}^{2^j-1}d_{j,k}\\psi_{j,k}",
  "P_6g|_{[r/64,(r+1)/64)}=64\\int_{r/64}^{(r+1)/64}g(t)\\,dt",
];

const LEVELS = Array.from({ length: 6 }, (_, level) => {
  const coefficients = HAAR_COEFFICIENTS.filter((coefficient) => coefficient.j === level);
  const energy = coefficients.reduce((sum, coefficient) => sum + coefficient.value ** 2, 0);
  const maximum = Math.max(...coefficients.map((coefficient) => Math.abs(coefficient.value)));
  return {
    level,
    count: coefficients.length,
    width: 2 ** -level,
    energy,
    maximum,
    positive: coefficients.filter((coefficient) => coefficient.value >= 0).length,
    negative: coefficients.filter((coefficient) => coefficient.value < 0).length,
  };
});

const LEVEL_ROWS = LEVELS.map((level) => ({
  id: `haar-level-${level.level}`,
  cells: {
    level: String(level.level),
    count: String(level.count),
    width: `1/${2 ** level.level}`,
    energy: level.energy.toFixed(6),
    maximum: level.maximum.toFixed(6),
    signs: `${level.positive} / ${level.negative}`,
  },
}));

const LEADING_COEFFICIENT_ROWS = HAAR_COEFFICIENTS.toSorted(
  (left, right) => Math.abs(right.value) - Math.abs(left.value),
)
  .slice(0, 14)
  .map((coefficient, rank) => ({
    id: `haar-coefficient-${coefficient.j}-${coefficient.k}`,
    cells: {
      rank: String(rank + 1),
      index: `(${coefficient.j},${coefficient.k})`,
      support: `[${coefficient.start.toFixed(4)}, ${coefficient.end.toFixed(4)})`,
      value: coefficient.value.toFixed(6),
      magnitude: Math.abs(coefficient.value).toFixed(6),
      phase: coefficient.value < 0 ? "π" : "0",
    },
  }));

export function WaveletRainDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[2]!}
      identities={[IDENTITIES[0]!, IDENTITIES[1]!, IDENTITIES[3]!]}
      mathematicalBody={[
        "区間[0,1)上で、1個の正規化スケーリング関数φと63個のHaarウェーブレットψⱼₖを使います。各ψⱼₖは二進区間[k/2ʲ,(k+1)/2ʲ)だけに支持を持ち、左半分と右半分の平均差を係数dⱼₖとして測ります。",
        "対象関数gは二つの正弦成分と二つの区分一定パルスを明示的に足した関数です。正弦積分と区間の重なり長を解析的に計算するため、係数は標本列へのFFTや離散フィルタバンクから推定していません。",
        "P₆gはV₆への有限直交射影で、64個の半開二進区間ごとにgの平均値へ一致します。不連続点での点値は区間規約に依存しますが、L²の同値類と射影係数は零測度集合上の値変更では変わりません。",
      ]}
      scopeNotice="Haar係数は局所的な時間・スケール内積であり、周波数スペクトルではありません。P₆gを元関数gそのものと呼ばず、64区間の有限射影として表示します。雨粒と飛沫は基底関数ではありません。"
      parameters={[
        { label: "定義域", value: "[0,1) / Lebesgue測度" },
        { label: "有限空間", value: "V₆ / 64二進区間" },
        { label: "基底", value: "φ＋ψⱼₖ、0≤j≤5" },
        { label: "詳細係数", value: `${HAAR_COEFFICIENTS.length}個` },
        { label: "スケーリング係数", value: `c₀=${HAAR_SCALING_COEFFICIENT.toFixed(6)}` },
        { label: "支持幅", value: "2⁻ʲ" },
        { label: "再構成値", value: "各セル上のgの平均" },
        { label: "係数計算", value: "解析積分・区間重なり" },
        { label: "音楽構成", value: "64秒 / 320イベント / 5幕" },
        { label: "変換アルゴリズム", value: "FFT・DFT・離散フィルタバンク不使用" },
      ]}
      profile={{
        eyebrow: "MULTIRESOLUTION ENERGY",
        title: "各スケールの有限詳細エネルギー Σₖ|dⱼₖ|²",
        description:
          "棒長は同一スケール内のHaar係数二乗和です。大きな値ほど、その幅で捉えた左右平均差が強いことを示します。",
        items: LEVELS.map((level) => ({
          id: `energy-${level.level}`,
          label: `j=${level.level}`,
          value: level.energy,
          displayValue: level.energy.toFixed(4),
        })),
      }}
      tables={[
        {
          eyebrow: "SCALE LEDGER",
          title: "六段の支持幅・係数数・エネルギー",
          description:
            "正/負は係数の符号別個数です。符号は左半区間と右半区間の平均差の向きを表します。",
          columns: [
            { key: "level", label: "j" },
            { key: "count", label: "係数数" },
            { key: "width", label: "支持幅" },
            { key: "energy", label: "Σ|d|²" },
            { key: "maximum", label: "max |d|" },
            { key: "signs", label: "正 / 負" },
          ],
          rows: LEVEL_ROWS,
        },
        {
          eyebrow: "LEADING LOCAL COEFFICIENTS",
          title: "絶対値上位14個の時間・スケール係数",
          description:
            "順位は有限63係数内の|dⱼₖ|順です。supportは厳密な半開区間、音響位相0/πは係数符号の写像です。",
          columns: [
            { key: "rank", label: "rank" },
            { key: "index", label: "(j,k)" },
            { key: "support", label: "support" },
            { key: "value", label: "dⱼₖ" },
            { key: "magnitude", label: "|dⱼₖ|" },
            { key: "phase", label: "音響位相" },
          ],
          rows: LEADING_COEFFICIENT_ROWS,
        },
      ]}
      causality={[
        {
          id: "haar-support",
          quantity: "支持区間[j,k]",
          status: "保持",
          visual: "六段係数面のセル位置",
          audio: "支持開始位置を左右定位へ写像",
        },
        {
          id: "haar-coefficient",
          quantity: "係数dⱼₖの絶対値・符号",
          status: "保持",
          visual: "セル明度とシアン/紫の符号",
          audio: "強度と開始位相0/π",
        },
        {
          id: "haar-scale",
          quantity: "スケールj",
          status: "圧縮",
          visual: "支持幅2⁻ʲと落下粒径",
          audio: "440+96j Hzと有限包絡",
        },
        {
          id: "haar-poetic",
          quantity: "雨滴・飛沫・残像",
          status: "演出",
          visual: "対応セルからだけ局所発生",
          audio: "短いcool room、係数は不変",
        },
      ]}
    />
  );
}
