import { db } from "@/lib/firebaseClient";
import type { PersistedGame } from "@/persistence/types";
import { doc, setDoc } from "firebase/firestore";

export function writeCompletedGameToCloud(
  uid: string | null,
  completed: PersistedGame
) {
  if (!uid) return;

  setDoc(doc(db, "users", uid, "games", completed.sessionId), completed, {
    merge: true
  }).catch((err) => {
    console.warn(
      "[game actions] failed to write completed game to Firestore",
      err
    );
  });
}
