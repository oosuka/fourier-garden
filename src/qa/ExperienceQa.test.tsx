import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AudioEngine } from "../audio/AudioEngine";
import { Transport } from "../core/transport";
import { createSpectralCathedralAudioProgram } from "../patterns/spectral-cathedral/audio/synthesis";
import ExperienceQa from "./ExperienceQa";
import { ExperienceCapture } from "./experienceCapture";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountCapture() {
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.className = "sceneCanvas";
  canvas.dataset.rendererBackend = "webgpu";
  canvas.dataset.motion = "reduced";
  document.body.append(canvas, container);
  const root = createRoot(container);
  const capture = new ExperienceCapture();
  const transport = new Transport(() => 0);
  transport.play();
  const audio = new AudioEngine(createSpectralCathedralAudioProgram());
  const sampleRate = vi.spyOn(audio, "sampleRateHz", "get").mockReturnValue(48_000);
  async function render(chapter: string, silentPlayback = false) {
    await act(async () =>
      root.render(
        <ExperienceQa
          capture={capture}
          audio={audio}
          transport={transport}
          chapter={chapter}
          ready
          muted={silentPlayback}
          volume={0.35}
          silentPlayback={silentPlayback}
          onSeek={async () => {}}
        />,
      ),
    );
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === label,
    );
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }
  function readReport(): Record<string, unknown> {
    return JSON.parse(container.querySelector("[data-qa-report]")?.textContent ?? "{}");
  }
  return { root, capture, sampleRate, render, click, readReport };
}

describe("experience report provenance", () => {
  it("seals the measured audio generation before a chapter change and delayed UI polling", async () => {
    const qa = await mountCapture();
    await qa.render("mobius-choir");
    await qa.click("60秒を記録");
    qa.capture.record(0, 2, 16, -3);
    qa.capture.record(60_000, 2, 76, -3);
    qa.sampleRate.mockReturnValue(96_000);
    await qa.render("bessel-tide");
    await act(async () => vi.advanceTimersByTime(500));
    expect(qa.readReport()).toMatchObject({
      chapter: "mobius-choir",
      audioSampleRateHz: 48_000,
      mutedAtStart: false,
      volumeAtStart: 0.35,
      motionAtStart: "reduced",
    });
    expect(qa.readReport()).not.toHaveProperty("workletObservationAfterCapture");
    await act(async () => qa.root.unmount());
  });

  it("names a completed download for its captured chapter after navigating away", async () => {
    const qa = await mountCapture();
    await qa.render("mobius-choir");
    await qa.click("60秒を記録");
    qa.capture.record(0, 2, 0, null);
    qa.capture.record(60_000, 2, 60, null);
    await act(async () => vi.advanceTimersByTime(500));
    await qa.render("bessel-tide");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:qa");
    let filename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });
    await qa.click("JSONを保存");
    expect(filename).toMatch(/^fourier-mobius-choir-\d+\.json$/);
    await act(async () => qa.root.unmount());
  });

  it("identifies silent playback without claiming an audio output clock", async () => {
    const qa = await mountCapture();
    qa.sampleRate.mockReturnValue(null);
    await qa.render("mobius-choir", true);
    await qa.click("60秒を記録");
    qa.capture.record(0, 2, 0, null);
    qa.capture.record(60_000, 2, 60, null);
    await act(async () => vi.advanceTimersByTime(500));
    expect(qa.readReport()).toMatchObject({
      clock: "performance",
      audioSampleRateHz: null,
      mutedAtStart: true,
      playingAtStart: true,
      synchronizationSamples: 0,
      visualLeadP95Ms: null,
    });
    await act(async () => qa.root.unmount());
  });
});
