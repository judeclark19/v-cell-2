import { shimmer } from "@/ui/RouteLoading.shared";
import {
  BoardBottom,
  BoardBorder,
  BoardControlsStyle,
  BoardSurface,
  BoardTimerCell,
  BoardTimerText,
  BoardTop,
  Button,
  CardSlotRoot,
  PileCell,
  PileRow,
  PileSpacer,
  SeedControlRoot,
  TableauColumn,
  TableauEmptySlot,
  TableauGrid,
  TableauScroll
} from "@vcell/ui";
import type React from "react";
import styled from "styled-components";

const GameMain = styled.main`
  display: block;
`;

function SkeletonCardSlotBase({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <CardSlotRoot
      {...props}
      $dropTarget={false}
      aria-hidden="true"
      data-card-slot="true"
      tabIndex={-1}
    >
      {children}
    </CardSlotRoot>
  );
}

const SkeletonCardSlot = styled(SkeletonCardSlotBase)`
  ${shimmer}
  border: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  opacity: 1;
`;

const TimerSkeletonText = styled(BoardTimerText).attrs({
  "aria-hidden": "true",
  muted: true
})`
  ${shimmer}
  border-radius: 999px;
  height: 24px;
  width: min(8rem, 72%);
`;

function SkeletonButtonBase({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button {...props} disabled tabIndex={-1}>
      {children}
    </Button>
  );
}

const SkeletonButton = styled(SkeletonButtonBase)`
  ${shimmer}
  border: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: transparent;
`;

const TimerSkeletonButton = styled(SkeletonButton)`
  min-height: 40px;
  width: 50%;
`;

const SpacerButtonSkeleton = styled(SkeletonButton)`
  flex: 1 1 0;
  min-height: var(--pile-spacer-button-min-height, 40px);
  padding: 0;
  width: 100%;
`;

const ControlButtonSkeleton = styled(SkeletonButton)`
  height: 42px;
  padding: 0;
  width: 42px;
`;

function SkeletonPileCell() {
  return (
    <PileCell aria-hidden="true">
      <SkeletonCardSlot />
    </PileCell>
  );
}

export function GameRouteLoading() {
  return (
    <>
      <GameMain role="status" aria-live="polite" aria-label="Loading game">
        <BoardBorder keyboardCarrying={false}>
          <BoardSurface aria-label="Game board">
            <BoardTop aria-label="Foundations">
              <PileRow aria-label="Foundations">
                <BoardTimerCell>
                  <TimerSkeletonText />
                  <TimerSkeletonButton />
                </BoardTimerCell>

                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonPileCell key={`foundation-${index}`} />
                ))}
              </PileRow>
            </BoardTop>

            <TableauScroll aria-label="Tableau">
              <TableauGrid aria-label="Tableau grid">
                {Array.from({ length: 7 }).map((_, columnIndex) => (
                  <TableauColumn
                    key={`column-${columnIndex}`}
                    data-tableau-column="true"
                    aria-label={`Tableau column ${columnIndex + 1}`}
                  >
                    <TableauEmptySlot
                      data-tableau-empty-slot="true"
                      aria-hidden="true"
                    >
                      <SkeletonCardSlot />
                    </TableauEmptySlot>

                    {Array.from({ length: 7 }).map((_, cardIndex) => (
                      <SkeletonCardSlot
                        key={`column-${columnIndex}-card-${cardIndex}`}
                      />
                    ))}
                  </TableauColumn>
                ))}
              </TableauGrid>
            </TableauScroll>

            <BoardBottom aria-label="Free cells">
              <PileRow aria-label="Free cells">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonPileCell key={`freecell-${index}`} />
                ))}

                <PileSpacer aria-hidden="true" />
                <PileSpacer aria-hidden="true">
                  <SpacerButtonSkeleton />
                  <SpacerButtonSkeleton />
                </PileSpacer>
              </PileRow>
            </BoardBottom>
          </BoardSurface>
        </BoardBorder>

        <BoardControlsStyle aria-hidden="true">
          <ControlButtonSkeleton />
          <SeedControlRoot>
            <ControlButtonSkeleton />
          </SeedControlRoot>
          <ControlButtonSkeleton />
          <ControlButtonSkeleton />
        </BoardControlsStyle>
      </GameMain>
    </>
  );
}
