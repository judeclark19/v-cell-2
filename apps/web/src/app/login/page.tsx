import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginPageSkeleton() {
  return <main style={{ padding: 24, opacity: 0.7 }}>Loading login…</main>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginClient />
    </Suspense>
  );
}
