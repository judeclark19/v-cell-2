/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import type { Card, Suit } from "@vcell/engine";
import "./card.css";

function suitSymbol(suit: Suit, size: "small" | "large" = "large") {
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
  onActivate,
  onPointerDownCard,
  disableInternalDrag
}: {
  card?: Card | null;
  faceDown?: boolean;
  playable?: boolean;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  onActivate?: () => void;
  onPointerDownCard?: (e: React.PointerEvent<HTMLDivElement>) => void;
  disableInternalDrag?: boolean;
}) {
  const isEmpty = !card;

  const [drag, setDrag] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [fixedRect, setFixedRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const startRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    width: number;
    height: number;
  } | null>(null);

  const canDrag =
    Boolean(card) &&
    playable &&
    !faceDown &&
    !disableInternalDrag &&
    !onPointerDownCard;
  const canActivate =
    Boolean(card) && playable && !faceDown && Boolean(onActivate);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (onPointerDownCard) {
      onPointerDownCard(e);
      return;
    }
    if (!canDrag) return;
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();

    setFixedRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });

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
    // IMPORTANT: do NOT clear startRef here — we still need the original
    // left/top/width/height while the return transition runs.
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

    // Return animation finished; now it's safe to drop the fixed-position styling.
    startRef.current = null;
    setFixedRect(null);
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
      } ${className}`.trim()}
      style={
        (isDragging || isReturning) && fixedRect
          ? {
              ...style,
              position: "fixed",
              left: fixedRect.left,
              top: fixedRect.top,
              width: fixedRect.width,
              height: fixedRect.height,
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
              zIndex: 999999,
              marginTop: 0,
              marginLeft: 0,
              transition: isReturning ? "transform 180ms ease" : "none"
            }
          : style
      }
      aria-label={`Card ${card.id}${faceDown ? ", face down" : ""}`}
      tabIndex={-1}
      onDoubleClick={() => canActivate && onActivate?.()}
      onKeyDown={(e) => {
        if (!canActivate) return;
        if (e.key === "Enter") {
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
