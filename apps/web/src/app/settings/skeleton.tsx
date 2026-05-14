import {
  LoadingStyles,
  RouteTitleSkeleton,
  SkeletonBlock
} from "@/ui/RouteLoading.shared";
import {
  SettingsHeader,
  SettingsPanel,
  SettingsPanels
} from "./page.styles";
import styled from "styled-components";

const PanelContent = styled.div`
  display: grid;
  gap: 1rem;
`;

const FieldStack = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const FieldGroup = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const SelectSkeleton = styled(SkeletonBlock).attrs({
  $height: 56,
  $radius: "8px",
  $width: "100%"
})``;

export function SettingsRouteLoading() {
  return (
    <>
      <LoadingStyles />
      <main
        role="status"
        aria-live="polite"
        aria-label="Loading settings"
      >
        <SettingsHeader>
          <RouteTitleSkeleton label="Settings" width={260} />
        </SettingsHeader>

        <SettingsPanels>
          <SettingsPanel as="section" padding="lg" aria-label="Account settings">
            <PanelContent>
              <SkeletonBlock $height={32} $width="36%" />
              <SkeletonBlock $height={18} $width="88%" />
              <SkeletonBlock $height={18} $width="72%" />
              <SkeletonBlock $height={18} $width="80%" />
            </PanelContent>
          </SettingsPanel>

          <SettingsPanel
            as="section"
            padding="lg"
            aria-label="Appearance settings"
          >
            <PanelContent>
              <SkeletonBlock $height={32} $width="46%" />

              <FieldStack>
                <FieldGroup>
                  <SkeletonBlock $height={20} $width="22%" />
                  <SelectSkeleton />
                  <SkeletonBlock $height={18} $width="84%" />
                </FieldGroup>

                <FieldGroup>
                  <SkeletonBlock $height={20} $width="28%" />
                  <SelectSkeleton />
                </FieldGroup>

                <FieldGroup>
                  <SkeletonBlock $height={20} $width="34%" />
                  <SelectSkeleton />
                  <SkeletonBlock $height={18} $width="72%" />
                </FieldGroup>
              </FieldStack>
            </PanelContent>
          </SettingsPanel>
        </SettingsPanels>
      </main>
    </>
  );
}
