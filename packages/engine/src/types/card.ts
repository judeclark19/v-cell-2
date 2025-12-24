export type Suit = "spades" | "hearts" | "clubs" | "diamonds";
export type Color = "red" | "black";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; // 1=Ace

export type CardId = string; // e.g. "AS", "10H"

export type Card = {
  id: CardId;
  suit: Suit;
  rank: Rank;
  color: Color;
};

export function cardColor(suit: Suit): Color {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}
