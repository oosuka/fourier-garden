import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { PRIME_GAPS, PRIME_SUPPORT } from "../math/model";

const IDENTITIES = [
  "z_P(x)=\\frac1{25}\\sum_{p\\le97,\\ p\\text{ prime}}e^{ipx}",
  "c_n=\\frac1{25}\\mathbf1_{\\mathcal P_{97}}(n),\\qquad \\phi_p(0)=0",
  "\\Delta_j=p_{j+1}-p_j,\\qquad |z_P(x)|\\le1,\\qquad z_P(x+2\\pi)=z_P(x)",
];

const PRIME_ROWS = PRIME_SUPPORT.map((prime, index) => ({
  id: `prime-${prime}`,
  cells: {
    index: String(index + 1),
    prime: String(prime),
    gap: index === 0 ? "—" : String(prime - PRIME_SUPPORT[index - 1]!),
    coefficient: (1 / PRIME_SUPPORT.length).toFixed(3),
    phase: "0",
  },
}));

export function PrimeConstellationDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[0]!}
      identities={IDENTITIES.slice(1)}
      mathematicalBody={[
        "97以下の25素数だけを周波数支持とする有限複素指数和です。係数は素数集合上の一様計数測度1/25で、全項の初期位相を0に固定しています。x=0では25本の単位フェーザが整列するためzₚ(0)=1です。",
        "各位相点は角度pxを持ち、隣接リンクは昇順素数pⱼとpⱼ₊₁だけを結びます。整数周波数の有限和なので2π周期で、三角不等式から全時刻で|zₚ(x)|≤1です。表示時刻x(t)=0.06tは絶対transportで進み、60秒の音楽形式ではリセットしません。",
        "素数間隔Δⱼは支持集合の隣接差としてのみ使用します。有限星座の凝集や空隙は観察対象ですが、素数定理、双子素数予想、ランダム性などの未証明・漸近的主張を視覚印象から導きません。",
      ]}
      scopeNotice="素数間隔列をDFTで分析した表示ではありません。既知の25素数を直接列挙し、有限指数和を解析式から評価しています。星雲と残光は係数支持に含まれません。"
      parameters={[
        { label: "有限支持", value: "P₉₇={p prime | p≤97} / 25点" },
        { label: "係数規約", value: "cₚ=1/25、その他0" },
        { label: "初期位相", value: "φₚ(0)=0 rad" },
        { label: "数学時刻", value: "x(t)=0.06t / 絶対transport" },
        { label: "周期", value: "2π（周波数支持のgcd=1）" },
        { label: "厳密上界", value: "|zₚ(x)|≤1" },
        { label: "音楽構成", value: "60秒 / 150イベント / 5幕" },
        { label: "主発音間隔", value: "(9.2/95)×素数間隔" },
        { label: "変換アルゴリズム", value: "DFT・FFT不使用" },
      ]}
      profile={{
        eyebrow: "PRIME-GAP PROFILE",
        title: "隣接する24個の素数間隔 Δⱼ",
        description:
          "棒長は隣接する素数の差そのものです。間隔を等間隔化せず、60秒内の各10秒句で同じ順序を保持します。",
        items: PRIME_GAPS.map((gap, index) => ({
          id: `gap-${PRIME_SUPPORT[index]}-${PRIME_SUPPORT[index + 1]}`,
          label: `${PRIME_SUPPORT[index]}→${PRIME_SUPPORT[index + 1]}`,
          value: gap,
          displayValue: String(gap),
        })),
      }}
      tables={[
        {
          eyebrow: "FINITE SUPPORT",
          title: "素数支持・係数・初期位相",
          description:
            "支持は97以下で完全に打ち切った有限集合です。係数1/25は複素指数形式の係数であり、スペクトル推定値ではありません。",
          columns: [
            { key: "index", label: "j" },
            { key: "prime", label: "pⱼ" },
            { key: "gap", label: "pⱼ−pⱼ₋₁" },
            { key: "coefficient", label: "|cₚ|" },
            { key: "phase", label: "arg cₚ" },
          ],
          rows: PRIME_ROWS,
        },
      ]}
      causality={[
        {
          id: "prime-support",
          quantity: "素数pと位相px",
          status: "保持",
          visual: "25点の角位置と高さ",
          audio: "発音順序と絶対位相drift",
        },
        {
          id: "prime-gap",
          quantity: "素数間隔Δⱼ",
          status: "保持",
          visual: "隣接点を結ぶ24リンク",
          audio: "(9.2/95)Δⱼ秒の発音間隔",
        },
        {
          id: "prime-pitch",
          quantity: "素数値p",
          status: "圧縮",
          visual: "支持軸上の厳密位置",
          audio: "立方根写像で440–920 Hz",
        },
        {
          id: "prime-poetic",
          quantity: "星雲・コロナ・星塵",
          status: "演出",
          visual: "位相点周囲の局所残光",
          audio: "係数・発音を追加しない",
        },
      ]}
    />
  );
}
