import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioEngine } from "../audio/AudioEngine";
import { DeferredDisposer } from "../core/deferredDisposer";
import { Transport } from "../core/transport";
import type { PatternDefinition } from "../patterns/contracts";
import { getPatternRegistry } from "../patterns/registry";

const CHAPTER_TRANSITION_MINIMUM_MS = 1_800;
const CHAPTER_TRANSITION_EXIT_MS = 300;

type SceneStatus = "loading" | "ready" | "error";

interface SceneReadyWaiter {
  generation: number;
  resolve: () => void;
}

export function useFourierGardenController() {
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
  const [transitionPattern, setTransitionPattern] = useState<PatternDefinition | null>(null);
  const [transitionLeaving, setTransitionLeaving] = useState(false);
  const sceneGenerationRef = useRef(0);
  const sceneReadyResolver = useRef<SceneReadyWaiter | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsHintVisible, setDetailsHintVisible] = useState(false);
  const detailsDiscovered = useRef(false);
  const hintedPatternIds = useRef(new Set<string>());
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(audio.currentVolume);
  const [uiVisible, setUiVisible] = useState(true);
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("loading");
  const [sceneError, setSceneError] = useState("");
  const [audioError, setAudioError] = useState("");
  const hideTimer = useRef<number>(0);
  const autoPaused = useRef(false);

  const revealUi = useCallback(() => {
    setUiVisible(true);
    window.clearTimeout(hideTimer.current);
    if (entered && playing && !detailsOpen) {
      hideTimer.current = window.setTimeout(() => {
        setUiVisible(false);
      }, 4_000);
    }
  }, [detailsOpen, entered, playing]);

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
  }, [detailsOpen, dismissDetailsHint]);

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
    showDetailsHint(pattern.id);
    await startPlayback();
    revealUi();
  }, [pattern.id, revealUi, showDetailsHint, startPlayback]);

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
      const nextSceneGeneration = ++sceneGenerationRef.current;
      const transitionStarted = performance.now();
      const sceneReady = new Promise<void>((resolve) => {
        sceneReadyResolver.current = { generation: nextSceneGeneration, resolve };
      });
      setSwitchingChapter(true);
      setTransitionPattern(nextPattern);
      setTransitionLeaving(false);
      setPlaying(false);
      dismissDetailsHint();
      setUiVisible(true);
      setSceneStatus("loading");
      setSceneError("");
      setAudioError("");
      transport.pause();
      transport.reset(0);

      try {
        await audio.fadeOutAndDispose();
        if (operation !== playbackOperation.current) return;

        const nextAudio = new AudioEngine(
          nextPattern.audio.createProgram(),
          nextPattern.audio.initialVolume,
        );
        audioRef.current = nextAudio;
        setPatternIndex(nextIndex);
        setAudio(nextAudio);
        setVolume(nextAudio.currentVolume);

        const elapsed = performance.now() - transitionStarted;
        const minimumDelay = new Promise<void>((resolve) => {
          window.setTimeout(resolve, Math.max(0, CHAPTER_TRANSITION_MINIMUM_MS - elapsed));
        });
        await Promise.all([sceneReady, minimumDelay]);
        if (operation !== playbackOperation.current) return;

        if (resumeAfterSwitch) {
          await playAudio(nextAudio, 0, operation);
        }
        setTransitionLeaving(true);
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, CHAPTER_TRANSITION_EXIT_MS);
        });
      } catch (error) {
        if (operation === playbackOperation.current) {
          setAudioError(
            error instanceof Error ? error.message : "章の音声を切り替えられませんでした",
          );
        }
      } finally {
        if (operation === playbackOperation.current) {
          setSwitchingChapter(false);
          setTransitionPattern(null);
          setTransitionLeaving(false);
          if (sceneReadyResolver.current?.generation === nextSceneGeneration) {
            sceneReadyResolver.current = null;
          }
          showDetailsHint(nextPattern.id);
        }
      }
    },
    [
      audio,
      dismissDetailsHint,
      patternIndex,
      patterns,
      playAudio,
      playing,
      showDetailsHint,
      switchingChapter,
      transport,
    ],
  );

  const handleSceneStatus = useCallback((status: SceneStatus, generation: number) => {
    if (generation !== sceneGenerationRef.current) return;
    setSceneStatus(status);
    if (status === "ready" || status === "error") {
      const waiter = sceneReadyResolver.current;
      if (waiter?.generation === generation) {
        waiter.resolve();
        sceneReadyResolver.current = null;
      }
    }
  }, []);

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
        toggleDetails();
      }
      if (event.key.toLowerCase() === "f") {
        void toggleFullscreen();
      }
      revealUi();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entered, revealUi, toggleDetails, toggleFullscreen, togglePlayback]);

  useEffect(() => {
    revealUi();
    return () => window.clearTimeout(hideTimer.current);
  }, [revealUi]);

  useEffect(() => {
    for (const candidate of [patterns[patternIndex - 1], patterns[patternIndex + 1]]) {
      if (candidate) void candidate.loadScene().catch(() => undefined);
    }
  }, [patternIndex, patterns]);

  useEffect(() => unmountDisposer.mount(), [unmountDisposer]);

  return {
    patterns,
    patternIndex,
    pattern,
    transport,
    audio,
    entered,
    playing,
    switchingChapter,
    transitionPattern,
    transitionLeaving,
    detailsOpen,
    detailsHintVisible,
    fullscreen,
    volume,
    sceneStatus,
    sceneGeneration: sceneGenerationRef.current,
    sceneError,
    audioError,
    interfaceHidden: entered && !uiVisible && !detailsOpen && !detailsHintVisible,
    revealUi,
    dismissDetailsHint,
    toggleDetails,
    closeDetails: () => setDetailsOpen(false),
    handleEnter,
    togglePlayback,
    switchChapter,
    handleSceneStatus,
    handleSceneError: setSceneError,
    handleVolume,
    toggleFullscreen,
  };
}
