import { useCallback, useState } from "react";

export type CardFlightDropTarget =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number }
  | { type: "freecell"; index: number };

type CardFlightState = {
  active: boolean;
  cardIds: string[];
  dropTarget: CardFlightDropTarget | null;
  durationMs?: number;
};

export function useCardFlight() {
  const [cardFlight, setCardFlight] = useState<CardFlightState>({
    active: false,
    cardIds: [],
    dropTarget: null
  });

  const startCardFlight = useCallback(
    (args: { cardIds: string[]; dropTarget: CardFlightDropTarget }) => {
      setCardFlight({
        active: true,
        cardIds: args.cardIds,
        dropTarget: args.dropTarget
      });
    },
    []
  );

  const clearCardFlight = useCallback(() => {
    setCardFlight({
      active: false,
      cardIds: [],
      dropTarget: null
    });
  }, []);

  return { cardFlight, startCardFlight, clearCardFlight };
}
