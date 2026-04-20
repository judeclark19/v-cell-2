"use client";

import styled, { css } from "styled-components";

type BoardBorderRootProps = {
  $keyboardCarrying: boolean;
};

export const BoardBorderRoot = styled.div<BoardBorderRootProps>`
  position: relative;
  --board-h: min(max(450px, calc(100vh - 200px)), 1440px);
  width: min(100%, 900px, calc(var(--board-h) * 3 / 4));
  background-image: var(--board-border-image);
  background-size: cover;
  box-sizing: border-box;
  padding: 4px;
  margin: 0 auto;
  border-radius: var(--radius);
  background-color: var(--board-border-color);

  @media (max-width: 450px) {
    --board-h: min(550px, 70vh);
  }

  ${({ $keyboardCarrying }) =>
    $keyboardCarrying
      ? css`
          outline: 3px dashed var(--kb-highlight);
          outline-offset: 6px;

          &::after {
            content: attr(data-carrying-label);
            text-align: center;
            position: absolute;
            top: 6px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            width: max-content;
            max-width: calc(100% - 12px);
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 999px;
            background: color-mix(
              in srgb,
              var(--kb-highlight) 85%,
              transparent
            );
            color: var(--kb-highlight-contrast, #000);
            pointer-events: none;
          }

          .card-face--front {
            transition: none;
          }

          .card:not(.is-drop-target):not(.is-kb-carried):not(
              .is-kb-carried-stack
            ):hover
            .card-face--front,
          .card.is-playable:not(.is-drop-target):not(.is-kb-carried):not(
              .is-kb-carried-stack
            ):hover
            .card-face--front {
            box-shadow:
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow);
          }

          .card:not(.is-drop-target):not(.is-kb-carried):not(
              .is-kb-carried-stack
            ):focus
            .card-face--front {
            background-color: var(--card-front-bg);
            box-shadow:
              inset 0 1px 0 var(--card-front-inset),
              var(--card-shadow);
          }
        `
      : ""}
`;
