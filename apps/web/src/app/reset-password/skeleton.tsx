import { PasswordRouteSkeleton } from "@/ui/PasswordRouteSkeleton";

export function ResetPasswordRouteLoading() {
  return (
    <PasswordRouteSkeleton
      fields={[
        { labelWidth: 112, marginBottom: 12 },
        { labelWidth: 154, marginBottom: 14 }
      ]}
      label="Loading reset password form"
      titleWidth="66%"
    />
  );
}
