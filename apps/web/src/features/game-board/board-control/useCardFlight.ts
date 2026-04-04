import { Card } from "@vcell/engine";
import { useCallback, useState } from "react";

export type DropTarget =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number }
  | { type: "freecell"; index: number };

export type CardFlightState = {
  active: boolean;
  baseLeft: number;
  baseTop: number;
  x: number;
  y: number;
  stack: Card[];
  dropTarget: DropTarget | null;
  durationMs?: number;
};

export type StartCardFlightArgs = {
  fromEl: HTMLElement;
  toEl: HTMLElement;
  stack: Card[];
  dropTarget: DropTarget;
  durationMs?: number;
};

function emptyCardFlight(): CardFlightState {
  return {
    active: false,
    baseLeft: 0,
    baseTop: 0,
    x: 0,
    y: 0,
    stack: [],
    dropTarget: null
  };
}

export function useCardFlight() {
  const [cardFlight, setCardFlight] =
    useState<CardFlightState>(emptyCardFlight());

  const startCardFlight = useCallback(
    ({
      fromEl,
      toEl,
      stack,
      dropTarget,
      durationMs
    }: StartCardFlightArgs) => {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      setCardFlight({
        active: true,
        baseLeft: fromRect.left,
        baseTop: fromRect.top,
        x: 0,
        y: 0,
        stack,
        dropTarget,
        durationMs
      });

      requestAnimationFrame(() => {
        setCardFlight((cur) => {
          if (!cur.active) return cur;

          return {
            ...cur,
            x: dx,
            y: dy
          };
        });
      });
    },
    []
  );

  const clearCardFlight = useCallback(() => {
    setCardFlight(emptyCardFlight());
  }, []);

  return { cardFlight, startCardFlight, clearCardFlight };
}
