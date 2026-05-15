import {
  SkeletonBlock,
  SkeletonHeadingBlock,
  SkeletonSelectField,
  SkeletonTitleText
} from "@/ui/RouteLoading.shared";
import {
  SettingsFields,
  SettingsHeader,
  SettingsHint,
  SettingsPanel,
  SettingsPanels
} from "./page.styles";
import styled from "styled-components";

const AccountHintSkeleton = styled(SettingsHint)`
  display: grid;
  gap: 0.35rem;
`;

export function SettingsRouteLoading() {
  return (
    <main role="status" aria-live="polite" aria-label="Loading settings">
      <SettingsHeader>
        <h1>
          <SkeletonTitleText label="Settings" width={260} />
        </h1>
      </SettingsHeader>

      <SettingsPanels>
        <SettingsPanel as="section" padding="lg" aria-label="Account settings">
          <h2>
            <SkeletonHeadingBlock $width="36%" />
          </h2>

          <AccountHintSkeleton>
            <SkeletonBlock $height={18} $width="88%" />
            <SkeletonBlock $height={18} $width="72%" />
          </AccountHintSkeleton>
        </SettingsPanel>

        <SettingsPanel
          as="section"
          padding="lg"
          aria-label="Appearance settings"
        >
          <h2>
            <SkeletonHeadingBlock $width="46%" />
          </h2>

          <SettingsFields>
            <SkeletonSelectField labelWidth="22%" hintWidth="84%" />
            <SkeletonSelectField labelWidth="28%" />
            <SkeletonSelectField labelWidth="34%" hintWidth="72%" />
          </SettingsFields>
        </SettingsPanel>
      </SettingsPanels>
    </main>
  );
}
