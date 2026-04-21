"use client";

import styled from "styled-components";

export const TableauColumnRoot = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: calc(var(--card-w) * 1.5);

  > .card,
  > .card-slot {
    position: relative;
    z-index: 1;
  }

  > .card.is-locked {
    pointer-events: none;
  }

  > :is(.card, .card-slot) + :is(.card, .card-slot) {
    margin-top: -107%;
  }

  > :is(.card.is-dragging, .card.is-auto-moving) {
    margin-top: 0;
  }
`;

export const TableauEmptySlotRoot = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 2 / 3;
  z-index: var(--z-base, 0);

  > .card,
  > .card-slot {
    width: 100%;
    height: 100%;
  }
`;
