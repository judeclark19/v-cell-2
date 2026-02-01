/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import type { Card, Suit } from "@vcell/engine";
import "../styles/card.css";

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

type CardProps = {
  card?: Card | null;
  faceDown?: boolean;
  playable?: boolean;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  onActivate?: (el: HTMLElement) => void;
  onPointerDownCard?: (e: React.PointerEvent<HTMLDivElement>) => void;
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onKeyDown" | "onDoubleClick" | "className" | "style"
>;

function Card({
  card,
  faceDown = false,
  playable = false,
  emptyLabel = "",
  className = "",
  style,
  onActivate,
  onPointerDownCard,
  ...divProps
}: CardProps) {
  const isEmpty = !card;

  const canActivate =
    Boolean(card) && playable && !faceDown && Boolean(onActivate);

  const { onPointerDown: onPointerDownFromProps, ...restDivProps } = divProps;

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    onPointerDownFromProps?.(e);
    // Card is a pure view: it never drags itself. Board-level drag (via onPointerDownCard)
    // is the only drag implementation.
    if (onPointerDownCard) {
      onPointerDownCard(e);
    }
  };

  if (isEmpty) {
    return (
      <div
        {...restDivProps}
        className={`card-slot ${className}`.trim()}
        style={style}
      >
        {emptyLabel && <span className="empty-label">{emptyLabel}</span>}
      </div>
    );
  }

  return (
    <div
      {...restDivProps}
      data-card-id={card.id}
      className={`card ${faceDown ? "face-down" : ""} ${
        playable ? "is-playable" : "is-locked"
      } ${className}`.trim()}
      style={style}
      aria-label={`Card ${card.id}${faceDown ? ", face down" : ""}`}
      tabIndex={-1}
      onDoubleClick={(e) => {
        console.log("[Card] dblclick", {
          canActivate,
          hasOnActivate: Boolean(onActivate),
          cardId: card?.id,
          targetTag: (e.currentTarget as HTMLElement).tagName,
          targetCardIdAttr: (e.currentTarget as HTMLElement).getAttribute(
            "data-card-id"
          )
        });

        if (!canActivate) return;
        onActivate?.(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (!canActivate) return;
        if (e.key === "Enter") {
          console.log("[Card] activate via Enter", {
            cardId: card?.id,
            targetTag: (e.currentTarget as HTMLElement).tagName,
            targetCardIdAttr: (e.currentTarget as HTMLElement).getAttribute(
              "data-card-id"
            )
          });

          e.preventDefault();
          onActivate?.(e.currentTarget);
        }
      }}
      onPointerDown={onPointerDown}
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
