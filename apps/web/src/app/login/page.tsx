import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { LoginRouteLoading } from "./skeleton";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginRouteLoading />}>
      <LoginClient />
    </Suspense>
  );
}
