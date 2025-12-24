import type { Card, Rank, Suit } from "../types/card";
import { cardColor } from "../types/card";

const SUITS: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function rankToId(rank: Rank): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function suitToId(suit: Suit): string {
  switch (suit) {
    case "spades":
      return "S";
    case "hearts":
      return "H";
    case "clubs":
      return "C";
    case "diamonds":
      return "D";
  }
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `${rankToId(rank)}${suitToId(suit)}`;
      deck.push({ id, suit, rank, color: cardColor(suit) });
    }
  }
  return deck;
}
