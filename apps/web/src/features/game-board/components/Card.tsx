/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import type { Card, Suit } from "@vcell/engine";
import {
  CardFaceBack,
  CardFaceFront,
  CardFrontMain,
  CardFrontTop,
  CardInner,
  CardSlotRoot,
  CardSuit,
  EmptyCardLabel,
  PlayingCardRoot
} from "@vcell/ui";

function suitSymbol(suit: Suit, size: "small" | "large" = "large") {
  return (
    <CardSuit
      src={`/images/${suit}.svg`}
      alt=""
      className={`card-suit card-suit--${size}`}
      data-size={size}
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
  region: "tableau" | "freecell" | "foundation" | "drag-layer";
  regionIndex?: number; // which tableau col / freecell index / foundation index
  positionInStack?: number; // -1 represents the empty slot / column container
  faceDown?: boolean;
  playable?: boolean;
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  // Return true if a move was performed (e.g. moved to foundation). Return false if no move occurred.
  onActivate?: (el: HTMLElement) => boolean;
  onAutoFreeCell?: (el: HTMLElement) => void;
  onPointerDownCard?: (e: React.PointerEvent<HTMLDivElement>) => void;
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onKeyDown" | "onDoubleClick" | "className" | "style"
>;

function Card({
  card,
  region,
  regionIndex,
  positionInStack,
  faceDown = false,
  playable = false,
  emptyLabel = "",
  className = "",
  style,
  onActivate,
  onPointerDownCard,
  onAutoFreeCell,
  ...forwardedDivProps
}: CardProps) {
  const isEmpty = !card;
  const classNames = className.split(/\s+/).filter(Boolean);
  const hasClassName = (name: string) => classNames.includes(name);

  const canActivate =
    Boolean(card) && playable && !faceDown && Boolean(onActivate);

  const { onPointerDown: onPointerDownFromProps, ...restDivProps } =
    forwardedDivProps;

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    onPointerDownFromProps?.(e);

    // Preserve native right-click/context-menu behavior for the card itself.
    // Dragging should only begin from the primary mouse button (or touch/pen).
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }

    // Card is a pure view: it never drags itself. Board-level drag (via onPointerDownCard)
    // is the only drag implementation.
    if (onPointerDownCard) {
      onPointerDownCard(e);
    }
  };

  if (isEmpty) {
    return (
      <CardSlotRoot
        {...restDivProps}
        className={`card-slot ${className}`.trim()}
        $dropTarget={hasClassName("is-drop-target")}
        style={style}
        data-card-slot="true"
        data-card-drop-target={hasClassName("is-drop-target") || undefined}
        data-region={region}
        data-region-index={regionIndex}
        data-position-in-stack={positionInStack}
        tabIndex={restDivProps.tabIndex ?? -1}
      >
        {emptyLabel && <EmptyCardLabel>{emptyLabel}</EmptyCardLabel>}
      </CardSlotRoot>
    );
  }

  return (
    <PlayingCardRoot
      {...restDivProps}
      data-card-id={card.id}
      data-card-root="true"
      data-card-auto-moving={hasClassName("is-auto-moving") || undefined}
      data-card-dragging={hasClassName("is-dragging") || undefined}
      data-card-drop-target={hasClassName("is-drop-target") || undefined}
      data-card-keyboard-carried={
        hasClassName("is-kb-carried") || undefined
      }
      data-card-keyboard-carried-stack={
        hasClassName("is-kb-carried-stack") || undefined
      }
      data-card-locked={!playable || undefined}
      data-card-playable={playable || undefined}
      data-card-pullback-disabled={
        hasClassName("is-pullback-disabled") || undefined
      }
      data-region={region}
      data-region-index={regionIndex}
      data-position-in-stack={positionInStack}
      className={`card ${faceDown ? "face-down" : ""} ${
        playable ? "is-playable" : "is-locked"
      } ${className}`.trim()}
      $autoMoving={hasClassName("is-auto-moving")}
      $dragging={hasClassName("is-dragging")}
      $dropTarget={hasClassName("is-drop-target")}
      $faceDown={faceDown}
      $keyboardCarried={hasClassName("is-kb-carried")}
      $keyboardCarriedStack={hasClassName("is-kb-carried-stack")}
      $locked={!playable}
      $playable={playable}
      $pullbackDisabled={hasClassName("is-pullback-disabled")}
      style={style}
      aria-label={`Card ${card.id}${faceDown ? ", face down" : ""}`}
      tabIndex={-1}
      onDoubleClick={(e) => {
        if (!canActivate) return;
        onActivate?.(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (!canActivate) return;
        if (e.key === "Enter") {
          e.preventDefault();
          onActivate?.(e.currentTarget);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();

        // Right-click: try foundation first (onActivate). If that fails, fall back to free cell.
        if (!card || faceDown) return;

        if (!onActivate && !onAutoFreeCell) return;

        const activated =
          canActivate && onActivate ? onActivate(e.currentTarget) : false;
        if (!activated && onAutoFreeCell) {
          onAutoFreeCell(e.currentTarget);
        }
      }}
      onPointerDown={onPointerDown}
    >
      <CardInner className="card-inner">
        <CardFaceFront className="card-face card-face--front">
          <CardFrontTop className="card-front__top">
            {displayRank(card.rank)}
            {suitSymbol(card.suit, "small")}
          </CardFrontTop>

          <CardFrontMain className="card-front__main">
            {suitSymbol(card.suit, "large")}
          </CardFrontMain>
        </CardFaceFront>

        <CardFaceBack className="card-face card-face--back" aria-hidden>
          <img src="/images/V.png" alt="" className="card-back-image" />
        </CardFaceBack>
      </CardInner>
    </PlayingCardRoot>
  );
}

export default Card;
