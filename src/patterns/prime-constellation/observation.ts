import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "25の素数 · 位相と間隔",
  accent: "#dbae77",
  invitation: "集まり、ほどける25点。間隔にも耳をすます。",
  question: "不規則に見える星は、同じ形へ戻る？",
  answer:
    "素数の間隔は一定ではありませんが、回転数はすべて整数です。位相点の配置は数学変数が2π進むと正確に戻ります。一方、音楽の60秒周期はその周期と別。楽譜の繰り返しと形の繰り返しを聴き分けられます。",
  mapping:
    "25点は97以下の素数に対応し、24個の素数間隔が発音の間隔を作ります。音の立ち上がりと同時に、対応する点に琥珀色の火花が生まれます。",
  background:
    "係数はすべて1/25。それでも和の大きさが変わるのは、個々の強さではなく位相の向きがそろったり、打ち消し合ったりするためです。周りの微粒子は素数の個数に含めません。",
  related: [
    {
      id: "residue-bloom",
      reason: "等間隔の剰余類と、素数の支持を比べる。",
    },
    {
      id: "phase-torus",
      reason: "整数の回転数を、無理数の比へ変えて考える。",
    },
  ],
};
