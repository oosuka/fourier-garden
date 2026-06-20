import { AlertCircle, AudioLines, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "katex";

import { AudioEngine } from "./audio/AudioEngine";
import { CanvasStage } from "./components/CanvasStage";
import { ControlBar } from "./components/ControlBar";
import { DetailsPanel } from "./components/DetailsPanel";
import { DeferredDisposer } from "./core/deferredDisposer";
import { Transport } from "./core/transport";
import { getPatternRegistry } from "./patterns/registry";

export function App() {
  const patterns = useMemo(() => getPatternRegistry(window.location.search), []);
  const [patternIndex, setPatternIndex] = useState(0);
  const pattern = patterns[patternIndex]!;
  const transport = useMemo(() => new Transport(), []);
  const [audio, setAudio] = useState(
    () => new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume),
  );
  const audioRef = useRef(audio);
  const playbackOperation = useRef(0);
  const unmountDisposer = useMemo(
    () =>
      new DeferredDisposer(() => {
        ++playbackOperation.current;
        void audioRef.current.dispose();
      }),
    [],
  );
  const [entered, setEntered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [switchingChapter, setSwitchingChapter] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(audio.currentVolume);
  const [uiVisible, setUiVisible] = useState(true);
  const [sceneStatus, setSceneStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sceneError, setSceneError] = useState("");
  const [audioError, setAudioError] = useState("");
  const hideTimer = useRef<number>(0);
  const autoPaused = useRef(false);
  const formula = useMemo(
    () =>
      renderToString(pattern.formulaLatex, {
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

  const playAudio = useCallback(
    async (targetAudio: AudioEngine, position: number, operation: number) => {
      setPlaying(false);

      try {
        await targetAudio.play(position);
        if (operation !== playbackOperation.current) {
          targetAudio.pause();
          return false;
        }
        transport.setClock(() => targetAudio.currentTime);
        transport.reset(position);
        transport.play();
        setPlaying(true);
        setAudioError("");
        return true;
      } catch (error) {
        if (operation !== playbackOperation.current) return false;
        transport.pause();
        transport.reset(position);
        targetAudio.pause();
        setPlaying(false);
        setAudioError(error instanceof Error ? error.message : "音声を開始できませんでした");
        return false;
      }
    },
    [transport],
  );

  const startPlayback = useCallback(() => {
    const operation = ++playbackOperation.current;
    return playAudio(audio, transport.currentTime, operation);
  }, [audio, playAudio, transport]);

  const handleEnter = useCallback(async () => {
    setEntered(true);
    await startPlayback();
    revealUi();
  }, [revealUi, startPlayback]);

  const togglePlayback = useCallback(() => {
    if (switchingChapter) return;
    if (playing) {
      ++playbackOperation.current;
      transport.pause();
      audio.pause();
      setPlaying(false);
      setUiVisible(true);
      return;
    }
    void startPlayback();
  }, [audio, playing, startPlayback, switchingChapter, transport]);

  const switchChapter = useCallback(
    async (nextIndex: number) => {
      if (
        switchingChapter ||
        nextIndex < 0 ||
        nextIndex >= patterns.length ||
        nextIndex === patternIndex
      ) {
        return;
      }

      const operation = ++playbackOperation.current;
      const resumeAfterSwitch = playing;
      const nextPattern = patterns[nextIndex]!;
      setSwitchingChapter(true);
      setPlaying(false);
      setDetailsOpen(false);
      setUiVisible(true);
      setSceneStatus("loading");
      setSceneError("");
      setAudioError("");
      transport.pause();
      transport.reset(0);
      audio.pause();

      try {
        await audio.dispose();
        if (operation !== playbackOperation.current) return;

        const nextAudio = new AudioEngine(
          nextPattern.audio.createProgram(),
          nextPattern.audio.initialVolume,
        );
        audioRef.current = nextAudio;
        setPatternIndex(nextIndex);
        setAudio(nextAudio);
        setVolume(nextAudio.currentVolume);

        if (resumeAfterSwitch) {
          await playAudio(nextAudio, 0, operation);
        }
      } catch (error) {
        if (operation === playbackOperation.current) {
          setAudioError(
            error instanceof Error ? error.message : "章の音声を切り替えられませんでした",
          );
        }
      } finally {
        if (operation === playbackOperation.current) {
          setSwitchingChapter(false);
        }
      }
    },
    [audio, patternIndex, patterns, playAudio, playing, switchingChapter, transport],
  );

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
        ++playbackOperation.current;
        transport.pause();
        audio.pause();
        setPlaying(false);
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

  useEffect(() => unmountDisposer.mount(), [unmountDisposer]);

  const interfaceHidden = entered && !uiVisible && !detailsOpen;

  return (
    <main
      className={`app app--${pattern.kind} ${detailsOpen ? "app--details" : ""} ${
        interfaceHidden ? "app--uiHidden" : ""
      }`}
      onPointerMove={revealUi}
      onPointerDown={revealUi}
    >
      <CanvasStage
        key={pattern.id}
        pattern={pattern}
        transport={transport}
        playing={playing}
        onStatus={setSceneStatus}
        onError={setSceneError}
      />

      <div className="edgeVignette" aria-hidden="true" />

      <header className="brandBlock interfaceLayer">
        <h1>FOURIER GARDEN</h1>
        <p>{pattern.presentation.observatoryLabel}</p>
        <small>{pattern.subtitle.ja}</small>
      </header>

      <div className="mathAnnotations interfaceLayer" aria-hidden="true">
        <span className="annotationContext">{pattern.presentation.annotationContext}</span>
        {pattern.presentation.annotations.map((annotation, index) => (
          <span
            className={`annotation annotation--${["one", "two", "three", "four"][index]}`}
            key={annotation.label}
          >
            <b>{annotation.label}</b>
            <small>{annotation.value}</small>
          </span>
        ))}
      </div>

      <section className="formulaBlock interfaceLayer">
        <span className="eyebrow">{pattern.presentation.formulaEyebrow}</span>
        <div className="mainFormula" dangerouslySetInnerHTML={{ __html: formula }} />
        <p>{pattern.presentation.formulaSummary}</p>
      </section>

      <section className="poeticBlock interfaceLayer">
        <span>{pattern.presentation.poeticEyebrow}</span>
        <p>
          {pattern.presentation.poeticLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      </section>

      {sceneStatus !== "ready" && (
        <div className="sceneStatus">
          {sceneStatus === "loading" ? (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              <span>INITIALIZING CHAPTER FIELD</span>
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
          <span>音声を開始できませんでした</span>
        </div>
      )}

      {entered && (
        <>
          <div className="interfaceLayer controlsLayer">
            <ControlBar
              playing={playing}
              volume={volume}
              detailsOpen={detailsOpen}
              fullscreen={fullscreen}
              pattern={pattern}
              chapterCount={patterns.length}
              chapterIndex={patternIndex}
              switchingChapter={switchingChapter}
              transport={transport}
              onTogglePlay={togglePlayback}
              onVolume={handleVolume}
              onPreviousChapter={() => void switchChapter(patternIndex - 1)}
              onNextChapter={() => void switchChapter(patternIndex + 1)}
              onToggleDetails={() => setDetailsOpen((open) => !open)}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          </div>

          <DetailsPanel
            key={pattern.id}
            open={detailsOpen}
            pattern={pattern}
            audio={audio}
            onClose={() => setDetailsOpen(false)}
          />
        </>
      )}

      {!entered && (
        <section className="entryScreen">
          <div className="entryMark">
            <span>01</span>
            <i />
            <span>∞</span>
          </div>
          <p className="entryEyebrow">FINITE FOURIER SERIES · PHASOR SYNTHESIS</p>
          <h2>FOURIER GARDEN</h2>
          <p className="entryJapanese">
            複素平面を回る13のフェーザが、
            <br />
            虚部へ射影され、ひとつの波になる。
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
