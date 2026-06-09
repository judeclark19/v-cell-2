"use client";

import {
  SkeletonHeadingBlock,
  SkeletonStatsTable,
  SkeletonTabTitle,
  SkeletonTextLine,
  SkeletonTextLines,
  SkeletonTitleText
} from "@/ui/RouteLoading.shared";
import {
  Panel,
  Tabs,
  UserStatsTableHeading,
  UserStatsTablesRoot
} from "@vcell/ui";
import styled from "styled-components";

const StatsHeader = styled.header`
  text-align: center;
`;

const StatsMain = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 2rem;

  > * {
    min-width: 0;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryPanel = styled(Panel).attrs({
  forwardedAs: "section",
  padding: "lg"
})`
  height: fit-content;
`;

const StatsPanel = styled(Panel)`
  min-width: 0;
`;

const SummaryDivider = styled.hr`
  margin: 1.5rem 0;
`;

const SummaryMetric = styled.section`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

function SummaryMetricSkeleton({ width }: { width: number | string }) {
  return (
    <SummaryMetric>
      <h3 style={{ marginBottom: 8 }}>
        <SkeletonTextLine $height={20} $radius="999px" $width={width} />
      </h3>
      <SkeletonTextLines widths={["82%", "64%"]} />
    </SummaryMetric>
  );
}

function HighlightsSkeleton() {
  return (
    <UserStatsTablesRoot>
      {[
        "Fastest wins",
        "Fewest moves (wins)",
        "Most recent completed games"
      ].map((title) => (
        <section key={title}>
          <UserStatsTableHeading>
            <SkeletonHeadingBlock $width="36%" />
          </UserStatsTableHeading>
          <SkeletonStatsTable rows={4} />
        </section>
      ))}
    </UserStatsTablesRoot>
  );
}

export function StatsRouteLoading() {
  return (
    <>
      <StatsHeader>
        <h1>
          <SkeletonTitleText label="Stats" />
        </h1>
      </StatsHeader>

      <StatsMain role="status" aria-live="polite" aria-label="Loading stats">
        <SummaryPanel>
          <h2 style={{ marginBottom: "0.5rem" }}>
            <SkeletonHeadingBlock $width="55%" />
          </h2>
          <SkeletonTextLines widths={["35%"]} />
          <br />
          <SummaryDivider />
          <br />

          <SummaryMetricSkeleton width="72%" />
          <SummaryMetricSkeleton width="58%" />
          <SummaryMetricSkeleton width="68%" />
        </SummaryPanel>

        <StatsPanel aria-label="Stats">
          <Tabs
            activeId="highlights"
            ariaLabel="Stats views"
            baseId="stats-loading"
            items={[
              {
                id: "highlights",
                label: <SkeletonTabTitle width={128} />,
                content: <HighlightsSkeleton />
              },
              {
                id: "history",
                label: <SkeletonTabTitle width={98} />,
                content: null
              }
            ]}
            onChange={() => undefined}
            panelPadding="lg"
          />
        </StatsPanel>
      </StatsMain>
    </>
  );
}
