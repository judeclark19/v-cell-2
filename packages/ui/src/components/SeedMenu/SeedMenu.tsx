import * as React from "react";
import { SeedMenuRoot } from "./SeedMenu.styles";

export type SeedMenuProps = React.HTMLAttributes<HTMLDivElement> & {
  ariaLabel?: string;
  open: boolean;
};

export function SeedMenu({
  ariaLabel = "Seed menu",
  children,
  open,
  ...props
}: SeedMenuProps) {
  return (
    <SeedMenuRoot
      aria-label={ariaLabel}
      aria-hidden={!open}
      $open={open}
      role="dialog"
      onClick={(event) => event.stopPropagation()}
      {...props}
    >
      {children}
    </SeedMenuRoot>
  );
}
