import {
  LoadingStyles,
  RouteTitleSkeleton,
  SkeletonBlock
} from "@/ui/RouteLoading.shared";
import { Panel } from "@vcell/ui";
import styled from "styled-components";

const StatsMain = styled.main`
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryPanel = styled(Panel).attrs({
  as: "section",
  padding: "lg"
})`
  height: fit-content;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const StatsPanelStack = styled.div`
  min-width: 0;
`;

const StatsPanel = styled(Panel).attrs({
  as: "section",
  padding: "none"
})``;

const StatsPanelContent = styled.div`
  display: grid;
  gap: 1rem;
`;

const TabsListSkeleton = styled.div`
  display: flex;
  border-bottom: 1px solid var(--tabs-border);
`;

const TabSkeleton = styled.div`
  flex: 1;
  min-height: 50px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--tabs-border);

  &:first-child {
    border-bottom-color: var(--tabs-active-border);
  }
`;

const TabPanelSkeleton = styled.div`
  display: grid;
  gap: 1.5rem;
  padding: 40px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`;

const TableSectionSkeleton = styled.section`
  display: grid;
  gap: 1rem;
`;

export function StatsRouteLoading() {
  return (
    <>
      <LoadingStyles />
      <RouteTitleSkeleton label="Stats" />
      <StatsMain role="status" aria-live="polite" aria-label="Loading stats">
        <SummaryPanel>
          <SummaryGrid>
            <SkeletonBlock $height={32} $width="55%" />
            <SkeletonBlock $height={20} $width="35%" />
            <SkeletonBlock $height={1} $width="100%" $radius="0" />
            <SkeletonBlock $height={20} $width="72%" />
            <SkeletonBlock $height={20} $width="82%" />
            <SkeletonBlock $height={44} $width="68%" />
            <SkeletonBlock $height={20} $width="58%" />
            <SkeletonBlock $height={20} $width="78%" />
          </SummaryGrid>
        </SummaryPanel>

        <StatsPanelStack>
          <StatsPanel>
            <TabsListSkeleton aria-hidden="true">
              <TabSkeleton>
                <SkeletonBlock $height={34} $width={128} $radius="999px" />
              </TabSkeleton>
              <TabSkeleton>
                <SkeletonBlock $height={34} $width={98} $radius="999px" />
              </TabSkeleton>
            </TabsListSkeleton>

            <TabPanelSkeleton>
              {["Fastest wins", "Fewest moves", "Recent games"].map((title) => (
                <TableSectionSkeleton key={title}>
                  <SkeletonBlock $height={28} $width="36%" />
                  <StatsPanelContent>
                    <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                    <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                    <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                    <SkeletonBlock $height={44} $width="92%" $radius="14px" />
                  </StatsPanelContent>
                </TableSectionSkeleton>
              ))}
            </TabPanelSkeleton>
          </StatsPanel>
        </StatsPanelStack>
      </StatsMain>
    </>
  );
}
