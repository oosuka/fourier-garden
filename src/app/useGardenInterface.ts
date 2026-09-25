import { useCallback, useEffect, useRef, useState } from "react";

interface GardenInterfaceOptions {
  entered: boolean;
  playing: boolean;
}

export function useGardenInterface({ entered, playing }: GardenInterfaceOptions) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [detailsHintVisible, setDetailsHintVisible] = useState(false);
  const detailsDiscovered = useRef(false);
  const hintedPatternIds = useRef(new Set<string>());
  const [fullscreen, setFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [uiNotice, setUiNotice] = useState("");
  const hideTimer = useRef<number>(0);

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

  const showUi = useCallback(() => setUiVisible(true), []);

  const onChapterEntered = useCallback((patternId: string) => {
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

  const onChapterSwitchStart = useCallback(() => {
    setIndexOpen(false);
    dismissDetailsHint();
    setUiVisible(true);
  }, [dismissDetailsHint]);

  const onChapterSwitchEnd = useCallback((patternId: string) => {
    if (!detailsDiscovered.current && !hintedPatternIds.current.has(patternId)) {
      hintedPatternIds.current.add(patternId);
      setDetailsHintVisible(true);
    }
  }, []);

  const toggleIndex = useCallback(() => {
    setIndexOpen((value) => !value);
    setDetailsOpen(false);
    revealUi();
  }, [revealUi]);

  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  const dismissNotice = useCallback(() => setUiNotice(""), []);

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
    scheduleUiHide();
    return () => window.clearTimeout(hideTimer.current);
  }, [scheduleUiHide]);

  return {
    detailsOpen,
    indexOpen,
    detailsHintVisible,
    fullscreen,
    uiNotice,
    interfaceHidden: entered && !uiVisible && !detailsOpen && !indexOpen && !detailsHintVisible,
    revealUi,
    showUi,
    onChapterEntered,
    onChapterSwitchStart,
    onChapterSwitchEnd,
    dismissDetailsHint,
    toggleDetails,
    toggleIndex,
    toggleFullscreen,
    dismissNotice,
    closeIndex,
    closeDetails,
  };
}
