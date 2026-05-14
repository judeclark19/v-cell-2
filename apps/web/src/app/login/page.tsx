import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { LoginRouteLoading } from "./skeleton";

function LoginPageSkeleton() {
  return <LoginRouteLoading />;
}

export default function LoginPage() {
  return <LoginPageSkeleton />;
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginClient />
    </Suspense>
  );
}
