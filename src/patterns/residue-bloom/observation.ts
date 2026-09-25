import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "円の連なり · 剰余類と射影",
  accent: "#d7bc82",
  invitation: "円の先端と波の高さが、いつも同じ場所を指す。",
  question: "4分の1周だけ時間を進めると？",
  answer:
    "すべての回転数が4で割って1余るので、時間変数をπ/2進めると、13本のフェーザはそろって90度回ります。全体の形は回転するだけ。虚部だった波は、それまでの実部になります。",
  mapping:
    "回る先端の位置が音像へ、半径が発音の強さと減衰へ。局所コロナは同じ有限包絡で光り、高次調波の接触が薄れると細い円の光も先に落ち着きます。履歴に残る光は、音と同じ強さを起点に足した詩的な余韻です。",
  background:
    "周波数を剰余類で選ぶことは、回転に対する対称性を選ぶことでもあります。z(x+π/2)=iz(x)という短い式に、見えている形の規則が隠れています。",
  related: [
    {
      id: "prime-constellation",
      reason: "整数の選び方を変えると、位相の集まり方はどう変わるか。",
    },
    {
      id: "dirichlet-lanterns",
      reason: "波を足し合わせて、鋭い形を作るもうひとつの方法。",
    },
  ],
};
