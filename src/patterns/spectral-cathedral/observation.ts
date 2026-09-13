import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "長方形の共鳴 · 境界と固有モード",
  accent: "#c8d4bd",
  invitation: "動かない縁から、空間の揺れ方が決まる。",
  question: "境界が変わると、同じ波は残る？",
  answer:
    "縁で変位をゼロにする条件が、許される揺れ方を選びます。本編では12モードが重なった波と、その瞬間の合成値がゼロになる節線を描きます。上の小さな実験では一つのモードを取り出すため、節線は動かず、その揺れ方の区切りを観察できます。",
  mapping:
    "固有値の平方根の順序を音高へ、係数を知覚圧縮した大きさを声の強さへ。波面上の観測位置に立つ細い柱が、同じモードの発音包絡で明るくなります。初めの硬い響きが薄れる時間も、光の接触と共有しています。",
  background:
    "固有モードは、空間に応じて用意された波の語彙です。円板へ移ればBessel関数、帯のつなぎ方を変えればMöbiusの許容条件が現れます。",
  related: [
    {
      id: "bessel-tide",
      reason: "境界を長方形から円へ。揺れ方の語彙を聴き比べる。",
    },
    {
      id: "mobius-choir",
      reason: "端を反転してつなぐと、許されるモードも変わる。",
    },
  ],
};
