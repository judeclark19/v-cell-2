import { db } from "@/lib/firebaseClient";
import {
  collection,
  getDocs,
  getDocsFromServer,
  orderBy,
  query,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";

type CloudReadSource = "default" | "server";

export type CloudInProgressGameDoc = {
  doc: QueryDocumentSnapshot<DocumentData>;
  sessionId: string;
};

export async function getNewestCloudInProgressForDevice({
  deviceId,
  pruneStale,
  source = "server",
  uid
}: {
  deviceId: string;
  pruneStale: boolean;
  source?: CloudReadSource;
  uid: string;
}): Promise<CloudInProgressGameDoc | null> {
  const q = query(
    collection(db, "users", uid, "games"),
    where("status", "==", "in_progress"),
    where("deviceId", "==", deviceId),
    orderBy("updatedAtMs", "desc")
  );

  const snap = source === "server" ? await getDocsFromServer(q) : await getDocs(q);
  const [newestDoc, ...staleDocs] = snap.docs;

  if (pruneStale && staleDocs.length > 0) {
    const batch = writeBatch(db);
    for (const staleDoc of staleDocs) {
      batch.delete(staleDoc.ref);
    }
    await batch.commit();
  }

  if (!newestDoc) return null;

  const data = newestDoc.data();
  return {
    doc: newestDoc,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : newestDoc.id
  };
}
