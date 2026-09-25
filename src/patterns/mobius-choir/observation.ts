import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "反転してつながる帯 · 商空間",
  accent: "#d8cbc4",
  invitation: "一周して、裏表の区別がほどける。",
  question: "つなぎ目で波が切れない条件は？",
  answer:
    "帯の端は、上下を反転してつながっています。そこで値が一致するモードだけが残り、本章の規約ではm+nが奇数になります。見た目のひねりは、数学的なつなぎ方を観察するための空間表現です。",
  mapping:
    "固有値の順序を柔らかな音高へ。モードの変位と速度を音の強弱・定位へ写します。帯上の局所光も同じ有限包絡を使い、声の倍音比が変わると光の色温度が移ります。",
  background:
    "解いているのは平坦な商空間の波です。画面の3Dの帯に誘導される曲がった計量の波動方程式を解いたものではありません。位相と幾何の見た目を分けて考えることが、この章の入口です。",
  related: [
    {
      id: "spectral-cathedral",
      reason: "同じ固有モードの考え方を、異なる境界で見る。",
    },
    {
      id: "phase-torus",
      reason: "帯とトーラス。空間のつなぎ方の違いを歩く。",
    },
  ],
};
