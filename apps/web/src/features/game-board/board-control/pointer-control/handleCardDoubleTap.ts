import { useRef } from "react";

export function useHandleCardDoubleTap(
  onCardDoubleTap: (el: HTMLElement) => void,
  isDragPending: boolean,
  isCardFlightActive: boolean
) {
  const lastTapRef = useRef<{
    t: number;
    x: number;
    y: number;
    cardId: string;
  } | null>(null);

  const handleCardDoubleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCardFlightActive) return;

    const el = e.currentTarget as HTMLElement;
    const cardId = el.dataset.cardId;
    if (!cardId) return;

    const now = performance.now();
    const x = e.clientX;
    const y = e.clientY;

    const processTap = () => {
      const last = lastTapRef.current;

      const MAX_DT_MS = 300;
      const MAX_DIST_PX = 12;

      if (last) {
        const dt = now - last.t;
        const dist = Math.hypot(x - last.x, y - last.y);

        if (dt <= MAX_DT_MS && dist <= MAX_DIST_PX && last.cardId === cardId) {
          lastTapRef.current = null;
          onCardDoubleTap(el);
          return;
        }
      }

      lastTapRef.current = { t: now, x, y, cardId };
    };

    if (isDragPending) {
      queueMicrotask(processTap);
      return;
    }

    processTap();
  };

  return { handleCardDoubleTap };
}
