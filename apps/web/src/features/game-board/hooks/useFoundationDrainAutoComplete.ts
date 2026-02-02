import { useCallback, useEffect, useRef, useState } from "react";

export type FoundationDrainPreference = "freecells-first" | "tableau-first";

export type UseFoundationDrainAutoCompleteArgs = {
  /** Whether the current seed/state is ready for interactions. */
  seedReady: boolean;

  /** Gameplay pause state (used to stop the runner). */
  paused: boolean;

  /** When true, stop (and refuse to start) because a modal is open. */
  isAnyModalOpen: boolean;

  /** When true, stop (and refuse to start) because the celebration modal condition has been reached. */
  shouldShowWinModal: boolean;

  /** Drag state (used to stop the runner while drag is active/pending). */
  drag: {
    pointerId: number | null;
    pending: boolean;
    kbFlight: { active: boolean };
  };

  /** Free cell container refs (used as sources for foundation moves). */
  freeCellRefs: React.RefObject<(HTMLDivElement | null)[]>;

  /** Tableau column refs (used to find top cards as sources for foundation moves). */
  tableauColRefs: React.RefObject<(HTMLDivElement | null)[]>;

  /** Attempts to send the card associated with `el` to foundations. Returns true if it dispatched a move. */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;

  /** Resolves when the next FLIP run completes (with its own internal failsafe). */
  waitForFlipComplete: () => Promise<void>;

  /** Source preference for draining foundation moves. Defaults to "freecells-first". */
  preference?: FoundationDrainPreference;

  /** Optional safety cap (useful in dev). If omitted, runs until no more foundation moves. */
  maxSteps?: number;
};

export type UseFoundationDrainAutoCompleteReturn = {
  isAutoCompleting: boolean;
  runAutoComplete: () => Promise<void>;
  stopAutoComplete: () => void;
};

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useFoundationDrainAutoComplete(
  args: UseFoundationDrainAutoCompleteArgs
): UseFoundationDrainAutoCompleteReturn {
  const {
    seedReady,
    paused,
    isAnyModalOpen,
    shouldShowWinModal,
    drag,
    freeCellRefs,
    tableauColRefs,
    tryAutoFoundationFromEl,
    waitForFlipComplete,
    preference = "freecells-first",
    maxSteps
  } = args;

  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  // Important: async loops outlive renders, so we must read current values via refs.
  const isAutoCompletingRef = useRef(false);
  useEffect(() => {
    isAutoCompletingRef.current = isAutoCompleting;
  }, [isAutoCompleting]);

  const seedReadyRef = useLatest(seedReady);
  const pausedRef = useLatest(paused);
  const isAnyModalOpenRef = useLatest(isAnyModalOpen);
  const shouldShowWinModalRef = useLatest(shouldShowWinModal);
  const dragRef = useLatest(drag);
  const tryAutoFoundationFromElRef = useLatest(tryAutoFoundationFromEl);
  const preferenceRef = useLatest(preference);
  const maxStepsRef = useLatest(maxSteps);

  const stopAutoComplete = useCallback(() => {
    isAutoCompletingRef.current = false;
    setIsAutoCompleting(false);
  }, []);

  const getSources = useCallback(() => {
    const freeCells = freeCellRefs.current.filter(
      (el): el is HTMLDivElement => el != null
    );
    const tableauCols = tableauColRefs.current.filter(
      (el): el is HTMLDivElement => el != null
    );

    // Build two ordered arrays of HTMLElements to test as sources.
    // Free cells: use the container itself (tryAutoFoundationFromEl knows how to interpret it).
    const freeCellSources: HTMLElement[] = freeCells;

    // Tableau: use the top card element when present.
    const tableauSources: HTMLElement[] = [];
    for (const col of tableauCols) {
      const topCard = col.querySelector<HTMLElement>(".card:last-child");
      if (topCard) tableauSources.push(topCard);
    }

    return { freeCellSources, tableauSources };
  }, [freeCellRefs, tableauColRefs]);

  const waitForFlightComplete = useCallback(async () => {
    // Wait until any kb-flight clears.
    // Note: kb-flight is represented by `drag.kbFlight.active` while `pointerId` remains null.
    const raf = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    // Wait until any pending kb-flight clears.
    // Note: `drag.pending` is treated as “a flight/animation is in progress”.
    let safety = 0;
    while (
      dragRef.current.pointerId == null &&
      dragRef.current.kbFlight.active &&
      isAutoCompletingRef.current
    ) {
      // Safety cap (~2 seconds at 60fps) to avoid infinite loops if pending is never cleared.
      safety += 1;
      if (safety > 120) break;
      await raf();
    }
  }, [dragRef]);

  const runAutoComplete = useCallback(async () => {
    // Don’t start if we’re already running or if UI/game state blocks it.
    if (isAutoCompletingRef.current) return;
    if (!seedReadyRef.current) return;
    if (pausedRef.current) return;
    if (isAnyModalOpenRef.current) return;
    if (shouldShowWinModalRef.current) return;
    if (dragRef.current.pointerId != null) return;

    isAutoCompletingRef.current = true;
    setIsAutoCompleting(true);

    try {
      let steps = 0;

      while (true) {
        if (!isAutoCompletingRef.current) break;
        if (!seedReadyRef.current) break;
        if (pausedRef.current) break;
        if (isAnyModalOpenRef.current) break;
        if (shouldShowWinModalRef.current) break;
        if (dragRef.current.pointerId != null) {
          break;
        }

        const { freeCellSources, tableauSources } = getSources();

        const prefer = preferenceRef.current;
        const first =
          prefer === "tableau-first" ? tableauSources : freeCellSources;
        const second =
          prefer === "tableau-first" ? freeCellSources : tableauSources;

        let didMove = false;

        for (const el of first) {
          if (tryAutoFoundationFromElRef.current(el)) {
            didMove = true;
            break;
          }
        }

        if (!didMove) {
          for (const el of second) {
            if (tryAutoFoundationFromElRef.current(el)) {
              didMove = true;
              break;
            }
          }
        }

        if (!didMove) break;

        steps += 1;
        const cap = maxStepsRef.current;
        if (typeof cap === "number" && cap > 0 && steps >= cap) break;

        // Wait for FLIP to finish (or its failsafe) before attempting the next move.
        await waitForFlipComplete();

        // Also wait for any kb-flight animation to finish so moves don't visually collapse into one.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await waitForFlightComplete();
      }
    } finally {
      isAutoCompletingRef.current = false;
      setIsAutoCompleting(false);
    }
  }, [
    dragRef,
    getSources,
    isAnyModalOpenRef,
    maxStepsRef,
    pausedRef,
    preferenceRef,
    seedReadyRef,
    shouldShowWinModalRef,
    tryAutoFoundationFromElRef,
    waitForFlipComplete,
    waitForFlightComplete
  ]);

  return {
    isAutoCompleting,
    runAutoComplete,
    stopAutoComplete
  };
}
