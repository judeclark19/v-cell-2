"use client";

import React, { useState, useRef } from "react";
import type { Card } from "@vcell/engine";
import "./card.css";

function suitSymbol(suit: string, size: "small" | "large" = "large") {
  return (
    <img
      src={`/images/${suit}.svg`}
      alt=""
      className={`card-suit card-suit--${size}`}
      aria-hidden
    />
  );
}

function displayRank(rank: number) {
  switch (rank) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return rank;
  }
}

function Card({
  card,
  faceDown = false,
  playable = false,
  emptyLabel = "",
  className = "",
  style,
  onActivate
}: {
  card?: Card | null;
  faceDown?: boolean;
  playable?: boolean;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  onActivate?: () => void;
}) {
  const isEmpty = !card;

  const [drag, setDrag] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const startRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    width: number;
    height: number;
  } | null>(null);

  const canDrag = Boolean(card) && playable && !faceDown;
  const canActivate =
    Boolean(card) && playable && !faceDown && Boolean(onActivate);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!canDrag) return;
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);
    startRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height
    };

    setIsReturning(false);
    setIsDragging(true);
    setDrag({ x: 0, y: 0 });
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current) return;
    if (e.pointerId !== startRef.current.pointerId) return;

    const dx = e.clientX - startRef.current.startX;
    const dy = e.clientY - startRef.current.startY;
    setDrag({ x: dx, y: dy });
  };

  const endDrag = () => {
    const s = startRef.current;
    if (!s) return;

    // Switch to “returning” state so we can animate transform back to 0,0.
    setIsReturning(true);
    setIsDragging(false);

    // Next frame, reset the drag offset to origin; CSS transition will slide it back.
    requestAnimationFrame(() => {
      setDrag({ x: 0, y: 0 });
    });
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current) return;
    if (e.pointerId !== startRef.current.pointerId) return;
    endDrag();
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current) return;
    if (e.pointerId !== startRef.current.pointerId) return;
    endDrag();
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
  };

  const onTransitionEnd: React.TransitionEventHandler<HTMLDivElement> = (e) => {
    if (!isReturning) return;
    if (e.propertyName !== "transform") return;

    startRef.current = null;
    setIsReturning(false);
    setDrag({ x: 0, y: 0 });
  };

  if (isEmpty) {
    return (
      <div className={`card-slot ${className}`.trim()} style={style}>
        {emptyLabel && <span className="empty-label">{emptyLabel}</span>}
      </div>
    );
  }

  return (
    <div
      className={`card ${faceDown ? "face-down" : ""} ${
        playable ? "is-playable" : "is-locked"
      } ${isDragging ? "is-dragging" : ""} ${
        isReturning ? "is-returning" : ""
      }${className}`.trim()}
      style={
        (isDragging || isReturning) && startRef.current
          ? {
              ...style,
              position: "fixed",
              left: startRef.current.startLeft,
              top: startRef.current.startTop,
              width: startRef.current.width,
              height: startRef.current.height,
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
              zIndex: 999999,
              marginTop: 0,
              marginLeft: 0,
              transition: isReturning ? "transform 180ms ease" : "none"
            }
          : style
      }
      aria-label={`Card ${card.id}${faceDown ? ", face down" : ""}`}
      tabIndex={playable ? 0 : -1}
      onDoubleClick={() => canActivate && onActivate?.()}
      onKeyDown={(e) => {
        if (!canActivate) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.();
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="card-inner">
        <div className="card-face card-face--front">
          <div className="card-front__top">
            {displayRank(card.rank)}
            {suitSymbol(card.suit, "small")}
          </div>

          <div className="card-front__main">
            {suitSymbol(card.suit, "large")}
          </div>
        </div>

        <div className="card-face card-face--back" aria-hidden>
          <img src="/images/V.png" alt="" className="card-back-image" />
        </div>
      </div>
    </div>
  );
}

export default Card;
