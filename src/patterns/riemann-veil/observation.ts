import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "二乗周波数 · 有限部分和",
  accent: "#c99c87",
  invitation: "細い糸ほど速く揺れる。全体は静かにまとまる。",
  question: "高さの差が小さくなれば、傾きも近づく？",
  answer:
    "第n項の振幅は1/n²、周波数はn²です。高さへの寄与は小さくても、微分するとその二つが打ち消し合います。曲線が近づくことと、傾きが近づくことは同じではありません。",
  mapping:
    "二乗に基づくイベント間隔を、主音と二つの応答へ。選ばれたn²の位相が音像を動かし、対応する有限部分和の上に銅色の光の糸を残します。",
  background:
    "画面の12・24・48・96項はどれも滑らかな有限和です。無限級数との差の絶対値は1/M以下に抑えられますが、その事実だけで微分可能性は決まりません。この画面を無限関数の厳密な形とは呼びません。",
  related: [
    {
      id: "wavelet-rain",
      reason: "細部をどの尺度で分けるか、別の基底で考える。",
    },
    {
      id: "dirichlet-lanterns",
      reason: "関数の収束と、局所的な形の違いを見比べる。",
    },
  ],
};
