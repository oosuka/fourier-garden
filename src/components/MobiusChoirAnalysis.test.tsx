import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MobiusChoirAnalysis, MobiusChoirPlots } from "./MobiusChoirAnalysis";

describe("MobiusChoirAnalysis", () => {
  it("renders absolute time, parity analysis, and the six-mode table", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <MobiusChoirAnalysis timeOutputRef={createRef<HTMLOutputElement>()} />,
    );
    expect(container.querySelector("output")?.getAttribute("aria-label")).toContain("絶対数学時刻");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(container.textContent).toContain("m+nは奇数");
    expect(container.textContent).toContain("固有値 λ（線形軸 0–13）");
    expect(container.textContent).toContain("DFT・FFTではない");
  });

  it("renders plots independently for the detail panel", () => {
    const markup = renderToStaticMarkup(<MobiusChoirPlots />);
    expect(markup).toContain("許容／不許容モード");
    expect(markup).toContain("正弦・余弦対");
  });
});
