"use client";

import { useSession } from "@/state/auth/AuthProvider";
import { selectUid } from "@/state/auth/authSlice";
import { useSelector } from "react-redux";
import { useIsOffline } from "@/state/network/useIsOffline";
import { useLoginNavigation } from "./useLoginNavigation";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { LoginIntro } from "./LoginIntro";
import { AuthTabs } from "./AuthTabs";

export default function LoginClient() {
  const uid = useSelector(selectUid);
  const isOffline = useIsOffline();
  const { isUser, hydrated } = useSession();
  const { nextPath, replaceToNextPath } = useLoginNavigation();
  const authFlows = useLoginAuthFlows({
    isOffline,
    nextPath,
    replaceToNextPath
  });

  return (
    <main>
      {/* <LoginIntro
        isOffline={isOffline}
        nextPath={nextPath}
        hydrated={hydrated}
        uid={uid}
        isUser={isUser}
      /> */}

      {!isOffline && (
        <AuthTabs
          nextPath={nextPath}
          isOffline={isOffline}
          authFlows={authFlows}
        />
      )}
    </main>
  );
}
