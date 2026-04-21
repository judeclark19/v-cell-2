"use client";

import styled, { css } from "styled-components";

type PlayingCardRootProps = {
  $dragging: boolean;
  $autoMoving: boolean;
  $dropTarget: boolean;
  $faceDown: boolean;
  $keyboardCarried: boolean;
  $keyboardCarriedStack: boolean;
  $locked: boolean;
  $playable: boolean;
  $pullbackDisabled: boolean;
};

type CardSlotRootProps = {
  $dropTarget: boolean;
};

export const CardInner = styled.div`
  pointer-events: none;
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 220ms ease;
  will-change: transform;

  :root[data-reduced-motion="true"] & {
    transition: none;
  }
`;

const CardFace = styled.div`
  position: absolute;
  inset: 0;
  border-radius: var(--card-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 35cqw;
`;

export const CardFaceFront = styled(CardFace)`
  background-color: var(--card-front-bg);
  color: var(--card-front-fg);
  box-shadow:
    inset 0 1px 0 var(--card-front-inset),
    var(--card-shadow);
  padding: 4px;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
  border: 1px solid var(--card-front-border);

  @media (max-width: 600px) {
    padding: 2px;
  }

  :root[data-reduced-motion="true"] & {
    transition: none;
  }
`;

export const CardFaceBack = styled(CardFace)`
  transform: rotateY(180deg);
  background-color: var(--card-back-bg);
  background-image: repeating-linear-gradient(
    45deg,
    var(--card-back-pattern-a),
    var(--card-back-pattern-a) 8px,
    var(--card-back-pattern-b) 8px,
    var(--card-back-pattern-b) 16px
  );
  box-shadow:
    inset 0 0 0 2px
      color-mix(in srgb, var(--card-back-border) 55%, transparent),
    var(--card-shadow);
  border: 1px solid
    color-mix(in srgb, var(--card-back-border) 55%, transparent);
`;

export const CardSuit = styled.img`
  &[data-size="small"] {
    width: 0.8em;
    height: 0.8em;
  }

  &[data-size="large"] {
    width: 1.5em;
    height: 1.5em;
  }
`;

export const CardFrontTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CardFrontMain = styled.div`
  flex-grow: 1;
  display: grid;
  place-items: center;
`;

export const PlayingCardRoot = styled.div<PlayingCardRootProps>`
  border-radius: var(--card-radius);
  width: 100%;
  aspect-ratio: 2 / 3;
  perspective: 900px;
  display: block;
  user-select: none;
  container-type: inline-size;
  touch-action: none;
  transition:
    box-shadow 120ms ease,
    background-color 120ms ease;

  ${({ $faceDown }) =>
    $faceDown
      ? css`
          ${CardInner} {
            transform: rotateY(180deg);
          }
        `
      : ""}

  &:hover ${CardFaceFront} {
    box-shadow:
      inset 0 1px 0 var(--card-front-inset),
      var(--card-shadow-hover);
  }

  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus ${CardFaceFront},
  &:focus-visible ${CardFaceFront} {
    background-color: color-mix(
      in srgb,
      var(--card-front-bg) 86%,
      var(--accent) 14%
    );
    box-shadow:
      var(--focus-ring-strong),
      inset 0 1px 0 var(--card-front-inset),
      var(--card-shadow-hover);
  }

  ${({ $dragging }) =>
    $dragging
      ? css`
          z-index: var(--z-drag);
          cursor: grabbing;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
          margin-top: 0;
        `
      : ""}

  ${({ $dragging, $autoMoving }) =>
    $dragging || $autoMoving
      ? css`
          margin-top: 0;
        `
      : ""}

  ${({ $locked }) =>
    $locked
      ? css`
          ${CardFaceFront} {
            background-color: var(--card-front-bg-locked);
          }
        `
      : ""}

  ${({ $playable }) =>
    $playable
      ? css`
          cursor: grab;
          box-shadow: 0 0 0 1px
            color-mix(in srgb, var(--accent) 18%, transparent);

          &:hover {
            box-shadow: 0 0 0 1px
              color-mix(in srgb, var(--accent) 26%, transparent);
          }

          &:focus,
          &:focus-visible {
            box-shadow: none;
          }

          &:active {
            cursor: grabbing;
          }

          ${CardFaceFront} {
            box-shadow:
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow);
          }

          &:hover ${CardFaceFront} {
            box-shadow:
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow-hover);
          }

          &:not(.is-drop-target):focus ${CardFaceFront},
          &:not(.is-drop-target):focus-visible ${CardFaceFront} {
            background-color: color-mix(
              in srgb,
              var(--card-front-bg) 86%,
              var(--accent) 14%
            );
            box-shadow:
              var(--focus-ring-strong),
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow-hover);
          }
        `
      : ""}

  ${({ $pullbackDisabled }) =>
    $pullbackDisabled
      ? css`
          &,
          &:active,
          &.is-playable {
            cursor: not-allowed;
          }

          &.is-playable,
          &.is-playable:hover {
            box-shadow: none;
          }
        `
      : ""}

  ${({ $dropTarget }) =>
    $dropTarget
      ? css`
          ${CardFaceFront} {
            background-color: color-mix(
              in srgb,
              var(--card-front-bg) 84%,
              var(--kb-highlight) 16%
            );
            box-shadow:
              0 0 0 3px
                color-mix(in srgb, var(--kb-highlight) 55%, transparent),
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow-hover);
          }
        `
      : ""}

  ${({ $keyboardCarried, $keyboardCarriedStack }) =>
    $keyboardCarried || $keyboardCarriedStack
      ? css`
          ${CardFaceFront} {
            background-color: color-mix(
              in srgb,
              var(--card-front-bg) 86%,
              var(--accent) 14%
            );
            box-shadow:
              var(--focus-ring-strong),
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow-hover);
          }
        `
      : ""}

  ${({ $keyboardCarried }) =>
    $keyboardCarried
      ? css`
          opacity: 0.9;
        `
      : ""}

  ${({ $keyboardCarriedStack }) =>
    $keyboardCarriedStack
      ? css`
          opacity: 0.75;
        `
      : ""}

  :root[data-reduced-motion="true"] & {
    transition: none;
  }
`;

export const CardSlotRoot = styled.div<CardSlotRootProps>`
  border-radius: var(--card-radius);
  width: 100%;
  aspect-ratio: 2 / 3;
  background: var(--card-slot-bg);
  border: 1px dashed var(--card-slot-border);
  box-shadow: none;
  opacity: 0.9;
  container-type: inline-size;
  display: grid;
  place-items: center;

  &:focus {
    box-shadow:
      var(--focus-ring-strong),
      inset 0 1px 0 var(--card-front-inset),
      var(--card-shadow-hover);
  }

  ${({ $dropTarget }) =>
    $dropTarget
      ? css`
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--kb-highlight) 55%, transparent);
          background: color-mix(
            in srgb,
            var(--card-slot-bg) 88%,
            var(--kb-highlight) 12%
          );
          border-color: color-mix(
            in srgb,
            var(--kb-highlight) 55%,
            var(--card-slot-border)
          );
        `
      : ""}
`;

export const EmptyCardLabel = styled.span`
  pointer-events: none;
  color: var(--muted);
  font-size: 80cqw;
`;
