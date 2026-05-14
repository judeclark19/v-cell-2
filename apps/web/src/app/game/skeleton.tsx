import {
  LoadingStyles,
  SkeletonBlock,
  shimmer
} from "@/ui/RouteLoading.shared";
import styled from "styled-components";

const GameMain = styled.main`
  display: block;
`;

const BoardFrame = styled.div`
  position: relative;
  background-color: var(--board-border-color);
  background-image: var(--board-border-image);
  background-size: cover;
  border-radius: var(--radius);
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
  padding: 4px;
  width: min(
    100%,
    900px,
    calc(min(max(450px, calc(100vh - 200px)), 1440px) * 3 / 4)
  );
`;

const BoardSurface = styled.div`
  aspect-ratio: 3 / 4;
  background-color: var(--board-bg);
  border-radius: var(--radius);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 10px);
  padding: 8px;
  width: 100%;
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--card-gap, 10px);
`;

const BottomRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--card-gap, 10px);
`;

const EmptyCell = styled.div``;

const TableauGrid = styled.div`
  background-color: var(--tableau-bg);
  border-radius: var(--radius);
  display: grid;
  flex: 1 1 auto;
  gap: var(--card-gap, 10px);
  grid-template-columns: repeat(7, minmax(0, 1fr));
  min-height: 0;
  overflow: hidden;
  padding: 8px;
`;

const TableauColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  min-height: 0;
`;

const CardSlotSkeleton = styled.div<{
  $stacked?: boolean;
}>`
  ${shimmer}
  aspect-ratio: 5 / 7;
  border-radius: var(--card-radius, 8px);
  margin-top: ${({ $stacked = false }) => ($stacked ? "-85%" : "0")};
  position: relative;
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  gap: 1rem;
`;

export function GameRouteLoading() {
  return (
    <>
      <LoadingStyles />
      <GameMain role="status" aria-live="polite" aria-label="Loading game">
        <BoardFrame>
          <BoardSurface>
            <TopRow>
              <EmptyCell aria-hidden="true" />
              <EmptyCell aria-hidden="true" />
              <EmptyCell aria-hidden="true" />
              {Array.from({ length: 4 }).map((_, index) => (
                <CardSlotSkeleton
                  key={`foundation-${index}`}
                  aria-hidden="true"
                />
              ))}
            </TopRow>

            <TableauGrid>
              {Array.from({ length: 7 }).map((_, columnIndex) => (
                <TableauColumn key={`column-${columnIndex}`}>
                  {Array.from({ length: 7 }).map((_, cardIndex) => (
                    <CardSlotSkeleton
                      key={`column-${columnIndex}-card-${cardIndex}`}
                      aria-hidden="true"
                      $stacked={cardIndex > 0}
                    />
                  ))}
                </TableauColumn>
              ))}
            </TableauGrid>

            <BottomRow>
              {Array.from({ length: 5 }).map((_, index) => (
                <CardSlotSkeleton
                  key={`freecell-${index}`}
                  aria-hidden="true"
                />
              ))}
              <EmptyCell aria-hidden="true" />
              <EmptyCell aria-hidden="true" />
            </BottomRow>
          </BoardSurface>
        </BoardFrame>

        <ControlsRow aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock
              key={`control-${index}`}
              $height={48}
              $width={48}
              $radius="var(--btn-radius, 10px)"
            />
          ))}
        </ControlsRow>
      </GameMain>
    </>
  );
}
