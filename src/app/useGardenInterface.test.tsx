import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useGardenInterface } from "./useGardenInterface";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("closes the other panel and shows each chapter hint only once", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let controls: ReturnType<typeof useGardenInterface>;
  function Probe() {
    const current = useGardenInterface({ entered: true, playing: false });
    useEffect(() => {
      controls = current;
    }, [current]);
    return (
      <output>{`${current.detailsOpen}/${current.indexOpen}/${current.detailsHintVisible}`}</output>
    );
  }

  await act(async () => root.render(<Probe />));
  await act(async () => controls.onChapterEntered("residue-bloom"));
  expect(container.textContent).toBe("false/false/true");
  await act(async () => controls.dismissDetailsHint());
  await act(async () => controls.onChapterSwitchEnd("spectral-cathedral"));
  expect(container.textContent).toBe("false/false/true");
  await act(async () => controls.dismissDetailsHint());
  await act(async () => controls.onChapterSwitchEnd("spectral-cathedral"));
  expect(container.textContent).toBe("false/false/false");
  await act(async () => controls.toggleDetails());
  expect(container.textContent).toBe("true/false/false");
  await act(async () => controls.toggleIndex());
  expect(container.textContent).toBe("false/true/false");
  await act(async () => controls.onChapterSwitchStart());
  await act(async () => controls.onChapterSwitchEnd("prime-constellation"));
  expect(container.textContent).toBe("false/false/false");
  await act(async () => root.unmount());
});
