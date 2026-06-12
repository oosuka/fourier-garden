import { AlertCircle, AudioLines, LoaderCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import katex from "katex";

import { AudioEngine } from "./audio/AudioEngine";
import { CanvasStage } from "./components/CanvasStage";
import { ControlBar } from "./components/ControlBar";
import { DetailsPanel } from "./components/DetailsPanel";
import { Transport } from "./core/transport";
import { patternRegistry } from "./patterns/registry";

export function App() {
  const pattern = patternRegistry[0]!;
  const transport = useMemo(() => new Transport(), []);
  const audio = useMemo(
    () =>
      new AudioEngine(
        pattern.audio.fundamentalHz,
        pattern.audio.initialVolume,
      ),
    [pattern.audio.fundamentalHz, pattern.audio.initialVolume],
  );
  const [entered, setEntered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(audio.currentVolume);
  const [uiVisible, setUiVisible] = useState(true);
  const [sceneStatus, setSceneStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [sceneError, setSceneError] = useState("");
  const [audioError, setAudioError] = useState("");
  const hideTimer = useRef<number>(0);
  const autoPaused = useRef(false);
  const formula = useMemo(
    () =>
      katex.renderToString(pattern.formulaLatex, {
        throwOnError: false,
        displayMode: true,
      }),
    [pattern.formulaLatex],
  );

  const revealUi = useCallback(() => {
    setUiVisible(true);
    window.clearTimeout(hideTimer.current);
    if (entered && playing && !detailsOpen) {
      hideTimer.current = window.setTimeout(() => {
        setUiVisible(false);
      }, 4_000);
    }
  }, [detailsOpen, entered, playing]);

  const startPlayback = useCallback(async () => {
    const position = transport.currentTime;
    transport.play();
    setPlaying(true);
    try {
      await audio.play(position);
      transport.setClock(() => audio.currentTime);
      setAudioError("");
    } catch (error) {
      setAudioError(
        error instanceof Error
          ? error.message
          : "音声を開始できませんでした",
      );
    }
  }, [audio, transport]);

  const handleEnter = useCallback(async () => {
    setEntered(true);
    await startPlayback();
    revealUi();
  }, [revealUi, startPlayback]);

  const togglePlayback = useCallback(() => {
    if (playing) {
      transport.pause();
      audio.pause();
      setPlaying(false);
      setUiVisible(true);
      return;
    }
    void startPlayback();
  }, [audio, playing, startPlayback, transport]);

  const handleVolume = useCallback(
    (value: number) => {
      audio.setVolume(value);
      setVolume(value);
      revealUi();
    },
    [audio, revealUi],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setSceneError("このブラウザでは全画面表示を開始できませんでした");
    }
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && playing) {
        autoPaused.current = true;
        transport.pause();
        audio.pause();
      } else if (!document.hidden && autoPaused.current) {
        autoPaused.current = false;
        void startPlayback();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [audio, playing, startPlayback, transport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!entered) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
      if (event.key.toLowerCase() === "d") {
        setDetailsOpen((open) => !open);
      }
      if (event.key.toLowerCase() === "f") {
        void toggleFullscreen();
      }
      revealUi();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entered, revealUi, toggleFullscreen, togglePlayback]);

  useEffect(() => {
    revealUi();
    return () => window.clearTimeout(hideTimer.current);
  }, [revealUi]);

  useEffect(
    () => () => {
      void audio.dispose();
    },
    [audio],
  );

  const interfaceHidden = entered && !uiVisible && !detailsOpen;

  return (
    <main
      className={`app ${detailsOpen ? "app--details" : ""} ${
        interfaceHidden ? "app--uiHidden" : ""
      }`}
      onPointerMove={revealUi}
      onPointerDown={revealUi}
    >
      <CanvasStage
        pattern={pattern}
        transport={transport}
        playing={playing}
        onStatus={setSceneStatus}
        onError={setSceneError}
      />

      <div className="edgeVignette" aria-hidden="true" />

      <header className="brandBlock interfaceLayer">
        <h1>FOURIER GARDEN</h1>
        <p>RESIDUE BLOOM OBSERVATORY</p>
        <small>{pattern.subtitle.ja}</small>
      </header>

      <div className="mathAnnotations interfaceLayer" aria-hidden="true">
        <span className="annotation annotation--one">
          <b>n = 1</b>
          <small>55.00 Hz</small>
        </span>
        <span className="annotation annotation--two">
          <b>n = 5</b>
          <small>275.00 Hz</small>
        </span>
        <span className="annotation annotation--three">
          <b>n = 9</b>
          <small>495.00 Hz</small>
        </span>
        <span className="annotation annotation--four">
          <b>n = 13</b>
          <small>715.00 Hz</small>
        </span>
      </div>

      <section className="formulaBlock interfaceLayer">
        <span className="eyebrow">FOURIER SERIES / フーリエ級数</span>
        <div
          className="mainFormula"
          dangerouslySetInnerHTML={{ __html: formula }}
        />
        <p>
          Every visible orbit and the audible timbre derive from this
          finite series.
        </p>
      </section>

      <section className="poeticBlock interfaceLayer">
        <span>VISIBLE HARMONICS / AUDIBLE GEOMETRY</span>
        <p>
          円は音になり、
          <br />
          音は光の庭になる。
        </p>
      </section>

      {sceneStatus !== "ready" && (
        <div className="sceneStatus">
          {sceneStatus === "loading" ? (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              <span>INITIALIZING WEBGPU FIELD</span>
            </>
          ) : (
            <>
              <AlertCircle aria-hidden="true" />
              <span>{sceneError || "描画を開始できませんでした"}</span>
            </>
          )}
        </div>
      )}

      {audioError && entered && (
        <div className="audioNotice interfaceLayer">
          <AlertCircle aria-hidden="true" />
          <span>映像のみで再生中</span>
        </div>
      )}

      <div className="interfaceLayer controlsLayer">
        <ControlBar
          playing={playing}
          volume={volume}
          detailsOpen={detailsOpen}
          fullscreen={fullscreen}
          pattern={pattern}
          chapterCount={patternRegistry.length}
          transport={transport}
          onTogglePlay={togglePlayback}
          onVolume={handleVolume}
          onToggleDetails={() => setDetailsOpen((open) => !open)}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      </div>

      <DetailsPanel
        open={detailsOpen}
        pattern={pattern}
        audio={audio}
        playing={playing}
        onClose={() => setDetailsOpen(false)}
      />

      {!entered && (
        <section className="entryScreen">
          <div className="entryMark">
            <span>01</span>
            <i />
            <span>∞</span>
          </div>
          <p className="entryEyebrow">A LIVING FOURIER OBSERVATORY</p>
          <h2>FOURIER GARDEN</h2>
          <p className="entryJapanese">
            見えない音の粒たちが、
            <br />
            円を描き、重なりあい、ひとつの波になる。
          </p>
          <button
            className="enterButton"
            onClick={() => void handleEnter()}
            disabled={sceneStatus === "loading"}
          >
            <AudioLines aria-hidden="true" />
            <span>
              ENTER FOURIER GARDEN
              <small>音と光の観測をはじめる</small>
            </span>
          </button>
          <p className="entryHint">
            Headphones recommended · Space: pause · D: details · F: fullscreen
          </p>
        </section>
      )}
    </main>
  );
}
