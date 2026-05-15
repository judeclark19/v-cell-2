import { PasswordRouteSkeleton } from "@/ui/PasswordRouteSkeleton";

export function ForgotPasswordRouteLoading() {
  return (
    <PasswordRouteSkeleton
      fields={[{ labelWidth: 54, marginBottom: 14 }]}
      label="Loading forgot password form"
      titleWidth="72%"
    />
  );
}
