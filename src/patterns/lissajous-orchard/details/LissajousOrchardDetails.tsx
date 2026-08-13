import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { LISSAJOUS_RATIOS, greatestCommonDivisor } from "../math/model";

const IDENTITIES = [
  "\\gamma_{a,b}(s,t)=(as+\\delta_L(t),bs)\\bmod2\\pi,\\qquad \\Gamma_{a,b}=(\\sin\\gamma_1,\\sin\\gamma_2)",
  "\\delta_L(t)=\\frac\\pi2+\\frac\\pi3\\sin(0.025t),\\qquad \\frac\\pi6\\le\\delta_L\\le\\frac{5\\pi}6",
  "\\gcd(a,b)=1\\Longrightarrow\\gamma_{a,b}(s+2\\pi,t)=\\gamma_{a,b}(s,t)",
];

const RATIO_ROWS = LISSAJOUS_RATIOS.map(([a, b], index) => ({
  id: `farey-${a}-${b}`,
  cells: {
    order: String(index + 1),
    ratio: `${a}/${b}`,
    gcd: String(greatestCommonDivisor(a, b)),
    slope: (a / b).toFixed(3),
    winding: `(${a},${b})`,
    return: "2π",
  },
}));

export function LissajousOrchardDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[0]!}
      identities={IDENTITIES.slice(1)}
      mathematicalBody={[
        "第5次Farey列の0と1を除く9個の既約分数a/bを、flat torus T²上の線形流s↦(as+δₗ(t),bs) mod 2πとして扱います。整数ベクトル(a,b)の最大公約数が1なので、トーラス上の軌道はs=2πで一周して閉じます。",
        "画面のLissajous曲線はこのトーラス流へ座標ごとにsinを適用した平面射影です。自己交差は異なるトーラス点が同じ平面座標へ投影された結果で、曲線に上下関係や3次元の結び目構造を付与しません。",
        "曲線パラメータsと絶対transport時刻tを分離しています。sは一つの閉軌道をたどり、tは全9曲線で共有する位相差δₗ(t)だけをπ/6から5π/6の範囲で連続変化させます。60秒の音楽スコアが反復してもδₗの数学時刻はリセットしません。",
      ]}
      scopeNotice="閉軌道性はa/bが有理数であることから導きます。無理比の軌道を閉曲線とは呼びません。枝、花粉、奥行き配置は平面射影の座標やFarey順序を変えない詩的造形です。"
      parameters={[
        { label: "比の集合", value: "F₅∩(0,1) / 9既約分数" },
        { label: "トーラス流", value: "(as+δₗ(t), bs) mod 2π" },
        { label: "平面射影", value: "(sin γ₁, sin γ₂)" },
        { label: "閉軌道条件", value: "a,b∈Z、gcd(a,b)=1" },
        { label: "共通帰還", value: "s=2π（トーラス上）" },
        { label: "位相差範囲", value: "π/6≤δₗ(t)≤5π/6" },
        { label: "位相差速度", value: "|δ′ₗ(t)|≤π/120 rad/s" },
        { label: "数学時刻", value: "絶対transport / スコア非同期" },
        { label: "音楽構成", value: "60秒 / 288イベント / 5幕" },
        { label: "変換アルゴリズム", value: "解析的正弦対・FFT不使用" },
      ]}
      profile={{
        eyebrow: "FAREY PROFILE",
        title: "第5次Farey列内点の傾き a/b",
        description:
          "左からFarey順です。棒長は平坦トーラス上の第一角速度と第二角速度の比a/bを示します。",
        items: LISSAJOUS_RATIOS.map(([a, b]) => ({
          id: `ratio-${a}-${b}`,
          label: `${a}:${b}`,
          value: a / b,
          displayValue: (a / b).toFixed(3),
        })),
      }}
      tables={[
        {
          eyebrow: "RATIONAL ORBIT ATLAS",
          title: "既約比・巻回数・帰還条件",
          description:
            "巻回ベクトル(a,b)は一周の間に二つの角度が進む回数です。帰還2πはflat torus上の流について記載しています。",
          columns: [
            { key: "order", label: "Farey順" },
            { key: "ratio", label: "a/b" },
            { key: "gcd", label: "gcd" },
            { key: "slope", label: "傾き" },
            { key: "winding", label: "巻回(a,b)" },
            { key: "return", label: "帰還s" },
          ],
          rows: RATIO_ROWS,
        },
      ]}
      causality={[
        {
          id: "lissajous-ratio",
          quantity: "既約比a:b",
          status: "保持",
          visual: "曲線の水平・垂直巻回数",
          audio: "左右声部の発音分割比",
        },
        {
          id: "lissajous-phase",
          quantity: "共有位相差δₗ(t)",
          status: "保持",
          visual: "全曲線の連続な形態変化",
          audio: "発音開始位相と連続drift",
        },
        {
          id: "lissajous-register",
          quantity: "整数和a+b",
          status: "圧縮",
          visual: "Farey順の奥行き配置",
          audio: "500–890 Hzの中域音高",
        },
        {
          id: "lissajous-poetic",
          quantity: "枝影・花粉・花弁ハロー",
          status: "演出",
          visual: "厳密曲線の周囲だけに付加",
          audio: "短い部屋鳴りのみ付加",
        },
      ]}
    />
  );
}
