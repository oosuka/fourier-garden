import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "二つの角度 · Kronecker流",
  accent: "#9db9a1",
  invitation: "近くへ戻っても、同じ時刻には戻らない。",
  question: "閉じた空間で、道が閉じないことはある？",
  answer:
    "二つの角度は1対√2の速さで進みます。両方が同時に一周の整数倍だけ進む正の時刻はありません。理想的な無限時間では軌道はトーラスに稠密になりますが、画面は有限時間の履歴だけです。",
  mapping:
    "24個の係数から選ぶ共役代表の位相速度を音高へ。絶対時刻のモード位相が音像と局所的な環状の光を動かします。金色の主軌跡は実際の二角度の流れで、局所応答とは別に描かれます。",
  background:
    "トーラスは「二つの周期を同時に持つ」空間の模型です。3DのドーナツはT²を観察するための埋め込みで、位相平面の距離と見た目の表面距離は同じとは限りません。",
  related: [
    {
      id: "lissajous-orchard",
      reason: "閉じない流れから、有理比で閉じる形へ。",
    },
    {
      id: "prime-constellation",
      reason: "整数の回転数による正確な再会と比べる。",
    },
  ],
};
