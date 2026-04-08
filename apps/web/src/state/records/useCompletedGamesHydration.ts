"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/state/reduxStore";
import { getAllCompletedGames } from "@/persistence/completedGamesStore";
import { setCompletedGames } from "./recordsSlice";

export function useCompletedGamesHydration() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let cancelled = false;

    getAllCompletedGames()
      .then((games) => {
        if (cancelled) return;
        dispatch(setCompletedGames(games));
      })
      .catch((err) => {
        console.error("[records] failed to hydrate completed games", err);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
