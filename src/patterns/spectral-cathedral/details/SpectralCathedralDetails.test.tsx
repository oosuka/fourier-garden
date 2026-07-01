import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { spectralCathedralPattern } from "../definition";
import { SpectralCathedralDetails } from "./SpectralCathedralDetails";

describe("SpectralCathedralDetails", () => {
  it("renders the eigenvalue analysis without calling it a Hz spectrum", () => {
    const markup = renderToStaticMarkup(
      <SpectralCathedralDetails pattern={spectralCathedralPattern} />,
    );

    expect(markup).toContain("固有値 λ");
    expect(markup).toContain("相対エネルギー指標");
    expect(markup).toContain("12モード");
    expect(markup).toContain("75秒・18小節・360イベント・5幕");
    expect(spectralCathedralPattern.education.poeticLayerBody).toContain(
      "局所的な光柱とアーチ伝播",
    );
    expect(spectralCathedralPattern.education.scopeNotice).toContain("Hzスペクトル、DFT、FFT");
    expect(markup).not.toContain("10小節");
  });
});
