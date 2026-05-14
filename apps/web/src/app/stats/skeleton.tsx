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
  display: grid;
  gap: 1.5rem;
`;

const StatsPanel = styled(Panel).attrs({
  as: "section",
  padding: "lg"
})``;

const StatsPanelContent = styled.div`
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
          {["Fastest wins", "Fewest moves", "Recent games"].map((title) => (
            <StatsPanel key={title}>
              <StatsPanelContent>
                <SkeletonBlock $height={28} $width="36%" />
                <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                <SkeletonBlock $height={44} $width="100%" $radius="14px" />
                <SkeletonBlock $height={44} $width="92%" $radius="14px" />
              </StatsPanelContent>
            </StatsPanel>
          ))}
        </StatsPanelStack>
      </StatsMain>
    </>
  );
}
