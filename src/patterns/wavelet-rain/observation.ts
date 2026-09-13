import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "Haarの多重解像度 · 支持と尺度",
  accent: "#bfc7cb",
  invitation: "広い変化から細い変化へ。雨の居場所をたどる。",
  question: "短い変化を、どこに保存する？",
  answer:
    "Haarの基底は、限られた区間だけで正負に変化します。横幅はその支持、段は尺度、符号は光の側を表します。大きな変化と細い変化を別の段へ分けるので、形のどこに細部があるかも読み取れます。",
  mapping:
    "発音順に同じ係数の区画が光り、そこから雨筋が落ちます。尺度は音域へ、係数の符号は開始位相へ。係数の位置は固定され、落下は別の詩的な造形です。",
  background:
    "6段のHaar展開は64区間で一定の関数を作ります。下の復元線を段として描くのは、斜めに補間すると本来ない傾斜を見せてしまうからです。フーリエの波とHaarの局所性を比べてみてください。",
  related: [
    {
      id: "dirichlet-lanterns",
      reason: "同じような角を、全域の波と局所の基底で描き分ける。",
    },
    {
      id: "riemann-veil",
      reason: "尺度を増やして現れる細部と、二乗周波数の細部。",
    },
  ],
};
