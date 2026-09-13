import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "円板の波 · Fourier–Bessel展開",
  accent: "#8eb8a4",
  invitation: "円と直径の節が、波の中に静かな場所を作る。",
  question: "円板では、なぜ正弦波だけで足りない？",
  answer:
    "円に沿う方向は三角関数、中心から外へ向かう方向はBessel関数が受け持ちます。外縁を固定するために、半径方向の関数がゼロになる値を選びます。境界の形が、係数を並べる座標そのものを変えています。",
  mapping:
    "17の実モードを順に聴き、同じモードの節円・節径を観察します。選択モードの代表点に波紋が生まれ、その左右位置は音像とともに動きます。波紋の鋭い芯と音の部分音は、同じ係数と減衰から立ち上がります。",
  background:
    "角度方向の正弦と余弦は、向きが違う同じ固有値の組です。節の向きを変えても、固有周波数は変わりません。画面の波紋はそのモードの追加変位ではなく、局所的な発音の印です。",
  related: [
    {
      id: "spectral-cathedral",
      reason: "長方形と円板の境界を聴き比べる。",
    },
    {
      id: "mobius-choir",
      reason: "同じ固有値を持つ声の組を、帯の上で探す。",
    },
  ],
};
