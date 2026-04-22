"use client";

import { useIsOffline } from "@/state/network/useIsOffline";
import { useLoginNavigation } from "./useLoginNavigation";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { AuthTabs } from "./AuthTabs";
import {
  Button,
  GuestPlayCopy,
  GuestPlayNotice,
  LoginPageStack
} from "@vcell/ui";
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
    <LoginPageStack>
      {!isOffline && (
        <>
          <GuestPlayNotice aria-label="Guest play option">
            <GuestPlayCopy>
              <strong>No account needed.</strong>
              <p>
                You can play as a guest on this device. Log in only if you want
                synced history and stats.
              </p>
            </GuestPlayCopy>
            <Button as={Link} href={nextPath} variant="secondary">
              Continue as guest
            </Button>
          </GuestPlayNotice>
          <AuthTabs
            nextPath={nextPath}
            isOffline={isOffline}
            authFlows={authFlows}
          />
        </>
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
    </LoginPageStack>
  );
}
