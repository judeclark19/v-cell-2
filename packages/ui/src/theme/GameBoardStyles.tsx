"use client";

import { createGlobalStyle } from "styled-components";

const GameBoardStyleSheet = createGlobalStyle`
  :root[data-reduced-motion="true"] .pause-overlay { backdrop-filter: none; }
  .card { border-radius: var(--card-radius); width: 100%; aspect-ratio: 2 / 3; perspective: 900px; display: block; user-select: none; container-type: inline-size; touch-action: none; transition: box-shadow 120ms ease, background-color 120ms ease; }
  .card-inner { pointer-events: none; width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 220ms ease; will-change: transform; }
  .card.face-down .card-inner { transform: rotateY(180deg); }
  .card-face { position: absolute; inset: 0; border-radius: var(--card-radius); backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0); box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; font-size: 35cqw; }
  .card-face--front { background-color: var(--card-front-bg); color: var(--card-front-fg); box-shadow: inset 0 1px 0 var(--card-front-inset), var(--card-shadow); padding: 4px; transition: background-color 160ms ease, color 160ms ease, box-shadow 160ms ease; border: 1px solid var(--card-front-border); }
  @media (max-width: 600px) { .card-face--front { padding: 2px; } }
  .card-face--back { transform: rotateY(180deg); background-color: var(--card-back-bg); background-image: repeating-linear-gradient(45deg, var(--card-back-pattern-a), var(--card-back-pattern-a) 8px, var(--card-back-pattern-b) 8px, var(--card-back-pattern-b) 16px); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--card-back-border) 55%, transparent), var(--card-shadow); border: 1px solid color-mix(in srgb, var(--card-back-border) 55%, transparent); }
  .card-suit--small { width: 0.8em; height: 0.8em; }
  .card-suit--large { width: 1.5em; height: 1.5em; }
  .card-front__top { display: flex; justify-content: space-between; align-items: center; }
  .card-front__main { flex-grow: 1; display: grid; place-items: center; }
  .card:hover .card-face--front { box-shadow: inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card:focus, .card:focus-visible { outline: none; }
  .card-slot:focus { box-shadow: var(--focus-ring-strong), inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card:focus .card-face--front, .card:focus-visible .card-face--front { background-color: color-mix(in srgb, var(--card-front-bg) 86%, var(--accent) 14%); box-shadow: var(--focus-ring-strong), inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card.is-dragging { z-index: var(--z-drag); cursor: grabbing; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6); margin-top: 0; }
  .card.is-dragging, .card.is-auto-moving { margin-top: 0; }
  .card-slot { border-radius: var(--card-radius); width: 100%; aspect-ratio: 2 / 3; background: var(--card-slot-bg); border: 1px dashed var(--card-slot-border); box-shadow: none; opacity: 0.9; container-type: inline-size; display: grid; place-items: center; }
  .card-slot .empty-label { pointer-events: none; color: var(--muted); font-size: 80cqw; }
  .card-slot.is-drop-target { box-shadow: 0 0 0 3px color-mix(in srgb, var(--kb-highlight) 55%, transparent); background: color-mix(in srgb, var(--card-slot-bg) 88%, var(--kb-highlight) 12%); border-color: color-mix(in srgb, var(--kb-highlight) 55%, var(--card-slot-border)); }
  .card.is-locked .card-face--front { background-color: var(--card-front-bg-locked); }
  .card.is-playable { cursor: grab; box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent); }
  .card.is-playable:hover { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent); }
  .card.is-playable:focus, .card.is-playable:focus-visible { box-shadow: none; }
  .card.is-playable:active { cursor: grabbing; }
  .card.is-pullback-disabled, .card.is-pullback-disabled:active, .card.is-playable.is-pullback-disabled { cursor: not-allowed; }
  .card.is-playable.is-pullback-disabled, .card.is-playable.is-pullback-disabled:hover { box-shadow: none; }
  .card.is-playable .card-face--front { box-shadow: inset 0 1px 0 var(--card-front-inset), var(--card-shadow); }
  .card.is-playable:hover .card-face--front { box-shadow: inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card.is-playable:not(.is-drop-target):focus .card-face--front, .card.is-playable:not(.is-drop-target):focus-visible .card-face--front { background-color: color-mix(in srgb, var(--card-front-bg) 86%, var(--accent) 14%); box-shadow: var(--focus-ring-strong), inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .pile-card { position: absolute; inset: 0; }
  .card.is-drop-target .card-face--front { background-color: color-mix(in srgb, var(--card-front-bg) 84%, var(--kb-highlight) 16%); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kb-highlight) 55%, transparent), inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card.is-kb-carried .card-face--front, .card.is-kb-carried-stack .card-face--front { background-color: color-mix(in srgb, var(--card-front-bg) 86%, var(--accent) 14%); box-shadow: var(--focus-ring-strong), inset 0 1px 0 var(--card-front-inset), var(--card-shadow-hover); }
  .card.is-kb-carried { opacity: 0.9; }
  .card.is-kb-carried-stack { opacity: 0.75; }
  :root[data-reduced-motion="true"] .card, :root[data-reduced-motion="true"] .card-inner, :root[data-reduced-motion="true"] .card-face--front, :root[data-reduced-motion="true"] .card.is-drop-target .card-face--front { transition: none; }
`;

export function GameBoardStyles() {
  return <GameBoardStyleSheet />;
}
