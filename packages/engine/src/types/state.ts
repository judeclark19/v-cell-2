import type { Card, Suit } from "./card";
import type { Rules } from "./rules";

export type TableauCard = {
  card: Card;
  faceDown: boolean;
};

export type FoundationSlot = {
  suit: Suit | null; // null until an Ace is placed
  cards: Card[]; // builds Ace→King once suit is set
};

export type GameState = {
  seed: string;
  rules: Rules;

  tableau: TableauCard[][]; // length 7
  freeCells: (Card | null)[]; // length 5
  foundations: [FoundationSlot, FoundationSlot, FoundationSlot, FoundationSlot];
};
