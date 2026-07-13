import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { DIRICHLET_ORDERS, fejerSquareWave, squareWavePartialSum } from "../math/model";

const IDENTITIES = [
  "D_N(x)=\\sum_{n=-N}^{N}e^{inx}=\\frac{\\sin((N+1/2)x)}{\\sin(x/2)},\\qquad D_N(0)=2N+1",
  "S_Ng(x)=\\frac4\\pi\\sum_{1\\le n\\le N,\\ n\\text{ odd}}\\frac{\\sin(nx)}n",
  "\\sigma_Ng(x)=\\frac4\\pi\\sum_{1\\le n\\le N,\\ n\\text{ odd}}\\left(1-\\frac n{N+1}\\right)\\frac{\\sin(nx)}n",
  "F_N(x)=\\frac1{N+1}\\left(\\frac{\\sin((N+1)x/2)}{\\sin(x/2)}\\right)^2\\ge0",
];

const ORDER_ROWS = DIRICHLET_ORDERS.map((order) => {
  const firstMaximumX = Math.PI / (order + 1);
  const partial = squareWavePartialSum(order, firstMaximumX);
  const fejer = fejerSquareWave(order, firstMaximumX);
  return {
    id: `order-${order}`,
    cells: {
      order: String(order),
      support: String(2 * order + 1),
      oddTerms: String((order + 1) / 2),
      center: String(2 * order + 1),
      firstZero: ((2 * Math.PI) / (2 * order + 1)).toFixed(4),
      maximumX: firstMaximumX.toFixed(4),
      partial: partial.toFixed(5),
      fejer: fejer.toFixed(5),
    },
  };
});

export function DirichletLanternsDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[0]!}
      identities={IDENTITIES.slice(1)}
      mathematicalBody={[
        "Dirichlet核Dₙは−NからNまでの複素指数を同じ重みで足した有限三角多項式です。x=0の商は0/0になりますが、有限和と一致する連続延長Dₙ(0)=2N+1を使います。中心峰は次数とともに高く狭くなり、積分作用素としてFourier部分和を取り出します。",
        "対象gは2π周期の矩形波sgn(sin x)です。奇数正弦係数4/(πn)をNで打ち切ったSₙgは、跳躍点近傍でGibbs越波を示します。表のx=π/(N+1)は跳躍直後の最初の局所最大点で、有限和から直接評価しています。",
        "Fejér平均σₙgは0次からN次までの部分和のCesàro平均で、各係数へ1−n/(N+1)の三角重みを掛けます。非負のFejér核による平均化と、符号を持つDirichlet核の打切りは同じものではありません。",
      ]}
      scopeNotice="表はN=3,7,15,31の有限量です。有限部分和、N→∞の極限、跳躍点での収束値、Gibbs越波、Fejér平均を区別します。振動を描画誤差として平滑化せず、DFT・FFT推定も行いません。"
      parameters={[
        { label: "周期領域", value: "T=R/2πZ" },
        { label: "打切り次数", value: "N=3, 7, 15, 31" },
        { label: "核の支持", value: "|n|≤N / 2N+1項" },
        { label: "対象関数", value: "g(x)=sgn(sin x)" },
        { label: "矩形波係数", value: "4/(πn)、nは正の奇数" },
        { label: "中心の連続延長", value: "Dₙ(0)=2N+1" },
        { label: "Fejér重み", value: "1−n/(N+1)" },
        { label: "観測点", value: "x(t)=0.11t mod 2π / 絶対時刻" },
        { label: "音楽構成", value: "60秒 / 320イベント / 5幕" },
        { label: "変換アルゴリズム", value: "解析係数・FFT不使用" },
      ]}
      profile={{
        eyebrow: "KERNEL HEIGHT PROFILE",
        title: "中心峰 Dₙ(0)=2N+1",
        description:
          "棒長は連続延長した厳密な中心値です。次数上昇で面積が増えたことを意味せず、峰が高く狭くなる比較です。",
        items: DIRICHLET_ORDERS.map((order) => ({
          id: `height-${order}`,
          label: `N=${order}`,
          value: 2 * order + 1,
          displayValue: String(2 * order + 1),
        })),
      }}
      tables={[
        {
          eyebrow: "FINITE-KERNEL COMPARISON",
          title: "中心峰・最初の零点・跳躍近傍の有限評価",
          description:
            "Sₙgとσₙgは同じxₙ=π/(N+1)で比較します。Sₙg(xₙ)−1は上側定常値1からの越波量です。",
          columns: [
            { key: "order", label: "N" },
            { key: "support", label: "核項数" },
            { key: "oddTerms", label: "奇数項" },
            { key: "center", label: "Dₙ(0)" },
            { key: "firstZero", label: "最初の零点" },
            { key: "maximumX", label: "xₙ" },
            { key: "partial", label: "Sₙg(xₙ)" },
            { key: "fejer", label: "σₙg(xₙ)" },
          ],
          rows: ORDER_ROWS,
        },
      ]}
      causality={[
        {
          id: "dirichlet-order",
          quantity: "打切り次数N",
          status: "保持",
          visual: "4灯柱の高さ・幅・側葉",
          audio: "4区画の支持上限と発音密度",
        },
        {
          id: "dirichlet-coefficient",
          quantity: "奇数係数1/n",
          status: "保持",
          visual: "矩形波部分和の厳密曲線",
          audio: "短い部分音パケットの比率",
        },
        {
          id: "dirichlet-pitch",
          quantity: "奇数支持n≤N",
          status: "圧縮",
          visual: "側葉の局所応答位置",
          audio: "440–940 Hzへ帯域制限",
        },
        {
          id: "dirichlet-poetic",
          quantity: "灯ハロー・煙・残火",
          status: "演出",
          visual: "峰と側葉の周囲へ付加",
          audio: "短い反響、係数は不変",
        },
      ]}
    />
  );
}
