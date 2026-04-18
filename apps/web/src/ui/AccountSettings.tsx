import { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";

function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [draftName, setDraftName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setDraftName(u?.displayName ?? "");
      setMessage(null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const next = draftName.trim();
    if (!next) {
      setMessage("Display name cannot be empty.");
      return;
    }

    if (next === (user.displayName ?? "").trim()) {
      setMessage("No changes to save.");
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(user, { displayName: next });
      await setDoc(
        doc(db, "users", user.uid),
        { displayName: next },
        { merge: true }
      );
      setUser({ ...user, displayName: next });
      setMessage("Display name updated.");
    } catch (err) {
      console.error("Failed to update display name", err);
      setMessage("Failed to update display name.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return <div>No user logged in.</div>;
  }

  return (
    <div className="flex-col">
      <h3>Display Name</h3>

      <p>
        <strong>Current Display Name:</strong>{" "}
        {user.displayName ?? "(No display name set)"}
      </p>

      <form onSubmit={handleSave}>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          disabled={isSaving}
          placeholder="Enter new display name"
          className="control"
          style={{ marginRight: 8 }}
        />
        <button className="btn btn--primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </form>

      {message && <p style={{ marginTop: 8 }}>{message}</p>}
    </div>
  );
}

export default AccountSettings;
