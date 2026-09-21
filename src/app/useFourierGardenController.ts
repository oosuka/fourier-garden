import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioEngine } from "../audio/AudioEngine";
import { DeferredDisposer } from "../core/deferredDisposer";
import { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";
import { getPatternRegistry } from "../patterns/registry";
import { ExperienceCapture } from "../qa/experienceCapture";
import { getExperienceQaConfig } from "../qa/experienceConfig";
import type { ChapterEcho, ChapterFrameCapture } from "../experience/chapterEcho";
import type { ChapterAfterimageState } from "../components/ChapterAfterimage";

const CHAPTER_NOTE_DURATION_MS = 1_800;
const CHAPTER_TRANSITION_EXIT_MS = 300;

type SceneStatus = "loading" | "ready" | "error";

interface SceneReadyWaiter {
  generation: number;
  resolve: (ready: boolean) => void;
}

function createDeferredControllerDisposer(
  playbackOperation: { current: number },
  audio: { current: AudioEngine },
  departingAudio: { current: Set<AudioEngine> },
  capturedEcho: { current: ChapterEcho | null },
): DeferredDisposer {
  return new DeferredDisposer(() => {
    ++playbackOperation.current;
    void audio.current.dispose();
    for (const retiring of departingAudio.current) void retiring.dispose();
    departingAudio.current.clear();
    capturedEcho.current?.dispose();
  });
}

export function useFourierGardenController() {
  const patterns = useMemo(() => getPatternRegistry(window.location.search), []);
  const qaConfig = useMemo(
    () =>
      getExperienceQaConfig(
        window.location.search,
        patterns.map((candidate) => candidate.id),
      ),
    [patterns],
  );
  const qaCapture = useMemo(() => (qaConfig ? new ExperienceCapture() : null), [qaConfig]);
  const [patternIndex, setPatternIndex] = useState(qaConfig?.patternIndex ?? 0);
  const pattern = patterns[patternIndex]!;
  const transport = useMemo(() => {
    const clock = new Transport();
    if (qaConfig) clock.reset(qaConfig.timeSeconds);
    return clock;
  }, [qaConfig]);
  const [audio, setAudio] = useState(
    () => new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume),
  );
  const audioRef = useRef(audio);
  const departingAudio = useRef(new Set<AudioEngine>());
  const capturedEcho = useRef<ChapterEcho | null>(null);
  const captureSceneRef = useRef<ChapterFrameCapture | null>(null);
  const unmountDisposerRef = useRef<DeferredDisposer | null>(null);
  const [transitionEcho, setTransitionEcho] = useState<ChapterAfterimageState | null>(null);
  const playbackOperation = useRef(0);
  const [entered, setEntered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [startingPlayback, setStartingPlayback] = useState(false);
  const playbackIntent = useRef(false);
  const [silentPlayback, setSilentPlayback] = useState(false);
  const silentPlaybackRef = useRef(false);
  const setSilentPlaybackMode = useCallback((silent: boolean) => {
    silentPlaybackRef.current = silent;
    setSilentPlayback(silent);
  }, []);
  const [switchingChapter, setSwitchingChapter] = useState(false);
  const [transitionPattern, setTransitionPattern] = useState<PatternDefinition | null>(null);
  const [transitionSource, setTransitionSource] = useState<PatternDefinition | null>(null);
  const [transitionLeaving, setTransitionLeaving] = useState(false);
  const sceneGenerationRef = useRef(0);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const sceneReadyResolver = useRef<SceneReadyWaiter | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const transitionTimer = useRef<number>(0);
  const [detailsHintVisible, setDetailsHintVisible] = useState(false);
  const detailsDiscovered = useRef(false);
  const hintedPatternIds = useRef(new Set<string>());
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(audio.currentVolume);
  const [uiVisible, setUiVisible] = useState(true);
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("loading");
  const sceneStatusRef = useRef<SceneStatus>("loading");
  const resumeAfterRecovery = useRef(false);
  const [sceneError, setSceneError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [uiNotice, setUiNotice] = useState("");
  const hideTimer = useRef<number>(0);
  const autoPaused = useRef(false);

  const pausePlayback = useCallback(() => {
    qaCapture?.interrupt("playback-paused");
    playbackIntent.current = false;
    ++playbackOperation.current;
    transport.pause();
    audioRef.current.pause();
    setPlaying(false);
    setStartingPlayback(false);
    setUiVisible(true);
  }, [qaCapture, transport]);

  useEffect(
    () =>
      audio.subscribeToErrors((error) => {
        if (audio !== audioRef.current) return;
        autoPaused.current = false;
        resumeAfterRecovery.current = false;
        pausePlayback();
        setAudioError(error.message);
      }),
    [audio, pausePlayback],
  );

  const captureFrame = useCallback(
    (nowMs: number, cpuMs: number, timeSeconds: number) => {
      if (qaCapture?.active)
        qaCapture.record(
          nowMs,
          cpuMs,
          timeSeconds,
          audioRef.current.readSynchronization(timeSeconds)?.visualLeadMs ?? null,
        );
    },
    [qaCapture],
  );

  const scheduleUiHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    if (!entered || !playing || detailsOpen || indexOpen) return;
    hideTimer.current = window.setTimeout(() => {
      setUiVisible(false);
    }, 4_000);
  }, [detailsOpen, entered, indexOpen, playing]);

  const revealUi = useCallback(() => {
    setUiVisible(true);
    scheduleUiHide();
  }, [scheduleUiHide]);

  const showDetailsHint = useCallback((patternId: string) => {
    if (detailsDiscovered.current || hintedPatternIds.current.has(patternId)) return;
    hintedPatternIds.current.add(patternId);
    setDetailsHintVisible(true);
  }, []);

  const dismissDetailsHint = useCallback(() => setDetailsHintVisible(false), []);

  const toggleDetails = useCallback(() => {
    if (!detailsOpen) detailsDiscovered.current = true;
    dismissDetailsHint();
    setDetailsOpen(!detailsOpen);
    setIndexOpen(false);
  }, [detailsOpen, dismissDetailsHint]);

  const playAudio = useCallback(
    async (
      targetAudio: AudioEngine,
      position: number,
      operation: number,
      fadeInSeconds?: number,
    ) => {
      transport.pause();
      playbackIntent.current = true;
      setPlaying(false);
      setStartingPlayback(true);

      try {
        const epoch =
          fadeInSeconds === undefined
            ? await targetAudio.play(position)
            : await targetAudio.play(position, fadeInSeconds);
        if (operation !== playbackOperation.current) return false;
        transport.setClock(() => targetAudio.presentationTime);
        transport.startAt(position, epoch);
        setPlaying(true);
        setAudioError("");
        return true;
      } catch (error) {
        if (operation !== playbackOperation.current) return false;
        playbackIntent.current = false;
        transport.pause();
        transport.reset(position);
        targetAudio.pause();
        setPlaying(false);
        setAudioError(error instanceof Error ? error.message : "音声を開始できませんでした");
        return false;
      } finally {
        if (operation === playbackOperation.current) setStartingPlayback(false);
      }
    },
    [transport],
  );

  const startSilentPlayback = useCallback(() => {
    transport.setClock(() => performance.now() / 1_000);
    transport.play();
    playbackIntent.current = true;
    setPlaying(true);
    setStartingPlayback(false);
    return true;
  }, [transport]);

  const replaceAudio = useCallback(
    (soundMuted: boolean) => {
      const previous = audioRef.current;
      previous.pause();
      const replacement = new AudioEngine(pattern.audio.createProgram(), previous.currentVolume);
      replacement.setVolume(previous.currentVolume);
      replacement.setMuted(soundMuted);
      audioRef.current = replacement;
      setAudio(replacement);
      void previous.dispose();
      return replacement;
    },
    [pattern],
  );

  const startPlayback = useCallback(() => {
    if (document.hidden || sceneStatusRef.current !== "ready") return Promise.resolve(false);
    transport.pause();
    if (silentPlaybackRef.current) return Promise.resolve(startSilentPlayback());
    const operation = ++playbackOperation.current;
    const targetAudio = audioError ? replaceAudio(muted) : audioRef.current;
    return playAudio(targetAudio, transport.currentTime, operation);
  }, [audioError, muted, playAudio, replaceAudio, startSilentPlayback, transport]);

  const handleEnter = useCallback(
    async (sound = true) => {
      if (sceneStatus !== "ready") return;
      setMuted(!sound);
      audio.setMuted(!sound);
      setSilentPlaybackMode(!sound);
      setEntered(true);
      showDetailsHint(pattern.id);
      await startPlayback();
      revealUi();
    },
    [
      pattern.id,
      revealUi,
      showDetailsHint,
      startPlayback,
      audio,
      sceneStatus,
      setSilentPlaybackMode,
    ],
  );

  const togglePlayback = useCallback(() => {
    if (switchingChapter || sceneStatus !== "ready") return;
    if (playbackIntent.current) {
      autoPaused.current = false;
      resumeAfterRecovery.current = false;
      pausePlayback();
      return;
    }
    void startPlayback();
  }, [pausePlayback, startPlayback, switchingChapter, sceneStatus]);

  const seekForQa = useCallback(
    async (seconds: number) => {
      if (
        !qaConfig ||
        switchingChapter ||
        sceneStatus !== "ready" ||
        !Number.isFinite(seconds) ||
        seconds < 0 ||
        seconds > 86_400
      )
        return;
      const resume = playbackIntent.current;
      pausePlayback();
      transport.reset(seconds);
      if (resume) await startPlayback();
    },
    [qaConfig, switchingChapter, sceneStatus, pausePlayback, transport, startPlayback],
  );

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
      qaCapture?.interrupt("chapter-changed");
      const resumeAfterSwitch = playbackIntent.current;
      playbackIntent.current = false;
      resumeAfterRecovery.current = false;
      setStartingPlayback(false);
      const nextPattern = patterns[nextIndex]!;
      const nextSceneGeneration = ++sceneGenerationRef.current;
      const transitionStarted = performance.now();
      const sceneReady = new Promise<boolean>((resolve) => {
        sceneReadyResolver.current = { generation: nextSceneGeneration, resolve };
      });
      window.clearTimeout(transitionTimer.current);
      setIndexOpen(false);
      setSwitchingChapter(true);
      setTransitionPattern(nextPattern);
      setTransitionSource(pattern);
      setTransitionLeaving(false);
      setPlaying(false);
      dismissDetailsHint();
      setUiVisible(true);
      setSceneStatus("loading");
      setSceneError("");
      setAudioError("");

      try {
        const echo = await captureSceneRef.current?.();
        if (operation !== playbackOperation.current) {
          echo?.dispose();
          return;
        }
        // A rapid second switch retires the earlier tail: at most one old graph remains.
        for (const retiring of departingAudio.current) void retiring.dispose();
        departingAudio.current.clear();
        departingAudio.current.add(audio);
        void audio
          .fadeOutAndDispose({ preserveTail: true })
          .catch(() => audio.dispose())
          .finally(() => {
            departingAudio.current.delete(audio);
          });
        capturedEcho.current?.dispose();
        capturedEcho.current = echo ?? null;
        setTransitionEcho(echo ? { echo, level: () => audio.departureGain } : null);

        transport.pause();
        transport.reset(0);

        const nextAudio = new AudioEngine(
          nextPattern.audio.createProgram(),
          nextPattern.audio.initialVolume,
        );
        nextAudio.setMuted(muted);
        nextAudio.setVolume(volume);
        audioRef.current = nextAudio;
        setPatternIndex(nextIndex);
        setSceneGeneration(nextSceneGeneration);
        setAudio(nextAudio);
        setVolume(nextAudio.currentVolume);

        const ready = await sceneReady;
        if (operation !== playbackOperation.current) return;

        if (resumeAfterSwitch && ready && !document.hidden) {
          if (silentPlaybackRef.current) startSilentPlayback();
          else
            await playAudio(
              nextAudio,
              0,
              operation,
              Math.max(0.065, audio.departureSecondsRemaining),
            );
        } else if (resumeAfterSwitch && ready) {
          autoPaused.current = true;
        }
        transitionTimer.current = window.setTimeout(
          () => {
            setTransitionLeaving(true);
            transitionTimer.current = window.setTimeout(() => {
              setTransitionPattern(null);
              setTransitionSource(null);
              setTransitionEcho(null);
            }, CHAPTER_TRANSITION_EXIT_MS);
          },
          Math.max(0, CHAPTER_NOTE_DURATION_MS - (performance.now() - transitionStarted)),
        );
      } catch (error) {
        if (operation === playbackOperation.current) {
          setAudioError(
            error instanceof Error ? error.message : "章の音声を切り替えられませんでした",
          );
          setTransitionPattern(null);
          setTransitionSource(null);
          setTransitionEcho(null);
        }
      } finally {
        if (operation === playbackOperation.current) {
          setSwitchingChapter(false);

          if (sceneReadyResolver.current?.generation === nextSceneGeneration) {
            sceneReadyResolver.current = null;
          }
          if (!detailsDiscovered.current && !hintedPatternIds.current.has(nextPattern.id)) {
            hintedPatternIds.current.add(nextPattern.id);
            setDetailsHintVisible(true);
          }
        }
      }
    },
    [
      audio,
      dismissDetailsHint,
      patternIndex,
      pattern,
      patterns,
      playAudio,
      startSilentPlayback,
      departingAudio,
      switchingChapter,
      transport,
      muted,
      volume,
      qaCapture,
    ],
  );

  const handleSceneStatus = useCallback(
    (status: SceneStatus, generation: number) => {
      if (generation !== sceneGenerationRef.current) return;
      sceneStatusRef.current = status;
      setSceneStatus(status);
      if (status !== "ready" && playbackIntent.current) {
        resumeAfterRecovery.current = status === "loading";
        pausePlayback();
      }
      if (status === "error") resumeAfterRecovery.current = false;
      if (status === "ready" || status === "error") {
        const waiter = sceneReadyResolver.current;
        if (waiter?.generation === generation) {
          waiter.resolve(status === "ready");
          sceneReadyResolver.current = null;
        }
      }
      if (status === "ready" && resumeAfterRecovery.current) {
        resumeAfterRecovery.current = false;
        if (document.hidden) autoPaused.current = true;
        else if (silentPlaybackRef.current) startSilentPlayback();
        else void playAudio(audioRef.current, transport.currentTime, ++playbackOperation.current);
      }
    },
    [pausePlayback, playAudio, startSilentPlayback, transport],
  );

  const handleSceneError = useCallback((message: string, generation?: number) => {
    if (generation !== undefined && generation !== sceneGenerationRef.current) return;
    setSceneError(message);
  }, []);

  const retryAudio = useCallback(() => {
    if (document.hidden || sceneStatusRef.current !== "ready") return;
    transport.pause();
    const position = transport.currentTime;
    const replacement = replaceAudio(false);
    setSilentPlaybackMode(false);
    setMuted(false);
    void playAudio(replacement, position, ++playbackOperation.current);
  }, [replaceAudio, playAudio, transport, setSilentPlaybackMode]);

  const continueSilently = useCallback(() => {
    pausePlayback();
    setSilentPlaybackMode(true);
    setMuted(true);
    audio.setMuted(true);
    startSilentPlayback();
  }, [audio, pausePlayback, startSilentPlayback, setSilentPlaybackMode]);

  const retryScene = useCallback(() => {
    sceneReadyResolver.current?.resolve(false);
    sceneReadyResolver.current = null;
    resumeAfterRecovery.current = false;
    setSceneError("");
    sceneStatusRef.current = "loading";
    setSceneStatus("loading");
    setSceneGeneration(++sceneGenerationRef.current);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted && silentPlaybackRef.current) {
      if (audioError && playbackIntent.current) {
        retryAudio();
        revealUi();
        return;
      }
      setSilentPlaybackMode(false);
      setMuted(false);
      audio.setMuted(false);
      if (playbackIntent.current) void startPlayback();
      revealUi();
      return;
    }
    audio.setMuted(!muted);
    setMuted(!muted);
    revealUi();
  }, [audio, audioError, muted, revealUi, retryAudio, startPlayback, setSilentPlaybackMode]);

  const toggleIndex = useCallback(() => {
    setIndexOpen((value) => !value);
    setDetailsOpen(false);
    revealUi();
  }, [revealUi]);

  const handleVolume = useCallback(
    (value: number) => {
      audio.setVolume(value);
      setVolume(value);
      revealUi();
    },
    [audio, revealUi],
  );

  const toggleFullscreen = useCallback(async () => {
    setUiNotice("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setUiNotice("このブラウザでは全画面表示を開始できませんでした");
    }
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) for (const retiring of departingAudio.current) void retiring.dispose();
      if (document.hidden) qaCapture?.interrupt("document-hidden");
      if (document.hidden && playbackIntent.current) {
        autoPaused.current = true;
        pausePlayback();
      } else if (!document.hidden && autoPaused.current && sceneStatusRef.current === "ready") {
        autoPaused.current = false;
        void startPlayback();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pausePlayback, qaCapture, startPlayback, departingAudio]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!entered || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        setIndexOpen(false);
        setDetailsOpen(false);
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      )
        return;
      if (
        event.code === "Space" &&
        !(target instanceof HTMLElement && target.closest("button, a, summary"))
      ) {
        event.preventDefault();
        togglePlayback();
      }
      if (event.key.toLowerCase() === "d") toggleDetails();
      if (event.key.toLowerCase() === "c") toggleIndex();
      if (event.key.toLowerCase() === "m") toggleMute();
      if (event.key.toLowerCase() === "f") void toggleFullscreen();
      revealUi();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entered, revealUi, toggleDetails, toggleFullscreen, togglePlayback, toggleIndex, toggleMute]);

  useEffect(() => {
    scheduleUiHide();
    return () => window.clearTimeout(hideTimer.current);
  }, [scheduleUiHide]);

  useEffect(() => {
    for (const candidate of [patterns[patternIndex - 1], patterns[patternIndex + 1]]) {
      if (candidate) void candidate.loadScene().catch(() => undefined);
    }
  }, [patternIndex, patterns]);

  useEffect(() => {
    if (!unmountDisposerRef.current) {
      unmountDisposerRef.current = createDeferredControllerDisposer(
        playbackOperation,
        audioRef,
        departingAudio,
        capturedEcho,
      );
    }
    return unmountDisposerRef.current.mount();
  }, []);
  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  return {
    patterns,
    qaCapture,
    silentPlayback,
    captureFrame: qaCapture ? captureFrame : undefined,
    seekForQa,
    patternIndex,
    pattern,
    transport,
    audio,
    entered,
    playing,
    startingPlayback,
    switchingChapter,
    transitionPattern,
    transitionSource,
    transitionEcho,
    captureSceneRef,
    transitionLeaving,
    detailsOpen,
    detailsHintVisible,
    fullscreen,
    volume,
    sceneStatus,
    sceneGeneration,
    sceneError,
    audioError,
    uiNotice,
    dismissNotice: () => setUiNotice(""),
    interfaceHidden: entered && !uiVisible && !detailsOpen && !indexOpen && !detailsHintVisible,
    indexOpen,
    muted,
    toggleMute,
    toggleIndex,
    closeIndex: () => setIndexOpen(false),
    revealUi,
    dismissDetailsHint,
    toggleDetails,
    closeDetails: () => setDetailsOpen(false),
    handleEnter,
    togglePlayback,
    switchChapter,
    handleSceneStatus,
    handleSceneError,
    retryScene,
    retryAudio,
    continueSilently,
    handleVolume,
    toggleFullscreen,
  };
}
