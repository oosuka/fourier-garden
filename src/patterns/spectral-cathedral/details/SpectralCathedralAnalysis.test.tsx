import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SpectralCathedralAnalysis } from "./SpectralCathedralAnalysis";

describe("SpectralCathedralAnalysis", () => {
  it("renders the strict twelve-mode table and two separate analysis plots", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <SpectralCathedralAnalysis timeOutputRef={createRef<HTMLOutputElement>()} />,
    );

    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(container.querySelectorAll("canvas")).toHaveLength(2);
    expect(container.querySelector("output")?.getAttribute("aria-label")).toContain("絶対数学時刻");
    expect(container.textContent).toContain("符号付き係数");
    expect(container.textContent).toContain("相対エネルギー指標");
    expect(container.textContent).toContain("Hz・FFTではない");
  });

  it("keeps both lambda 27 basis modes as separate table rows", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <SpectralCathedralAnalysis timeOutputRef={createRef<HTMLOutputElement>()} />,
    );
    const rows = [...container.querySelectorAll("tbody tr")];
    const repeated = rows.filter(
      (row) => row.querySelector("td:nth-child(3)")?.textContent === "27",
    );

    expect(repeated).toHaveLength(2);
    expect(repeated[0]?.textContent).not.toBe(repeated[1]?.textContent);
  });
});
