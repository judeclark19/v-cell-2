"use client";

import { useIsOffline } from "@/state/network/useIsOffline";
import { useLoginNavigation } from "./useLoginNavigation";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { AuthTabs } from "./AuthTabs";
import Link from "next/link";

export default function LoginClient() {
  const isOffline = useIsOffline();
  const { nextPath, replaceToNextPath } = useLoginNavigation();
  const authFlows = useLoginAuthFlows({
    isOffline,
    nextPath,
    replaceToNextPath
  });

  return (
    <main>
      {!isOffline && (
        <AuthTabs
          nextPath={nextPath}
          isOffline={isOffline}
          authFlows={authFlows}
        />
      )}
      {isOffline && (
        <p role="status" style={{ marginBottom: 16 }}>
          You are currently offline. Login and signup are temporarily
          unavailable, but you can still{" "}
          <Link
            style={{
              textDecoration: "underline"
            }}
            href={nextPath}
          >
            continue as a guest
          </Link>{" "}
          and play locally on this device.
        </p>
      )}
    </main>
  );
}
