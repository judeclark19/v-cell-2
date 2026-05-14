"use client";

import { Panel, Tabs } from "@vcell/ui";
import { useEffect, useId, useState } from "react";
import styled from "styled-components";
import UserStatsTables, { type GameStats } from "@/ui/UserStatsTables";
import HistoryTabContent, {
  HISTORY_PAGE_SIZE
} from "./HistoryTabContent";

type StatsTabId = "highlights" | "history";

function isStatsTabId(value: string): value is StatsTabId {
  return value === "highlights" || value === "history";
}

function readHashTab(): StatsTabId | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.replace(/^#/, "");
  return isStatsTabId(hash) ? hash : null;
}

function readPageParam(): number {
  if (typeof window === "undefined") return 1;

  const params = new URLSearchParams(window.location.search);
  const rawPage = Number(params.get("page"));

  return Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
}

function writeStatsUrl({
  tab,
  page,
  replace = false
}: {
  tab: StatsTabId;
  page: number;
  replace?: boolean;
}) {
  const url = new URL(window.location.href);

  if (tab === "history" && page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }

  url.hash = `#${tab}`;

  const method = replace ? "replaceState" : "pushState";
  window.history[method](window.history.state, "", url.toString());
}

const TabLabel = styled.h2`
  font-size: 24px;
  margin-bottom: 0;
`;

export default function StatsTabs({ derived }: { derived: GameStats }) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<StatsTabId>(
    () => readHashTab() ?? "highlights"
  );
  const [historyPage, setHistoryPage] = useState<number>(() => readPageParam());

  useEffect(() => {
    const syncFromLocation = () => {
      setActiveTab(readHashTab() ?? "highlights");
      setHistoryPage(readPageParam());
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(derived.ended.length / HISTORY_PAGE_SIZE)
  );
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);

  function changeTab(nextTab: StatsTabId) {
    setActiveTab(nextTab);

    const nextPage = nextTab === "history" ? currentHistoryPage : 1;
    writeStatsUrl({
      tab: nextTab,
      page: nextPage,
      replace: false
    });
  }

  function changeHistoryPage(nextPage: number | ((current: number) => number)) {
    const resolvedPage =
      typeof nextPage === "function" ? nextPage(currentHistoryPage) : nextPage;
    const clampedPage = Math.max(1, Math.min(totalHistoryPages, resolvedPage));

    setHistoryPage(clampedPage);
    writeStatsUrl({
      tab: "history",
      page: clampedPage,
      replace: false
    });
  }

  const items = [
    {
      id: "highlights",
      label: <TabLabel>Highlights</TabLabel>,
      content: <UserStatsTables derived={derived} />
    },
    {
      id: "history",
      label: <TabLabel>History</TabLabel>,
      content: (
        <HistoryTabContent
          games={derived.ended}
          page={currentHistoryPage}
          onPageChange={changeHistoryPage}
        />
      )
    }
  ] as const;

  return (
    <Panel aria-label="Stats">
      <Tabs
        activeId={activeTab}
        ariaLabel="Stats views"
        baseId={baseId}
        items={items as unknown as Parameters<typeof Tabs>[0]["items"]}
        onChange={(id) => changeTab(id as StatsTabId)}
        panelPadding="lg"
      />
    </Panel>
  );
}
