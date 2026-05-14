import { Panel } from "@vcell/ui";
import styled from "styled-components";
import {
  LoadingStyles,
  RouteTitleSkeleton,
  SkeletonBlock
} from "@/ui/RouteLoading.shared";

const HowToPlayMain = styled.main`
  display: block;
`;

const HowToPlayPanel = styled(Panel).attrs({
  as: "section",
  padding: "lg"
})`
  flex: 0 auto 2rem;
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SectionBlock = styled.section`
  display: grid;
  gap: 0.75rem;
`;

const ListBlock = styled.div`
  display: grid;
  gap: 0.5rem;
  padding-left: 1.5rem;
`;

export function HowToPlayRouteLoading() {
  return (
    <>
      <LoadingStyles />
      <RouteTitleSkeleton label="How to Play" width={280} />
      <HowToPlayMain
        role="status"
        aria-live="polite"
        aria-label="Loading how to play"
      >
        <HowToPlayPanel aria-label="How to play instructions">
          <Sections>
            <SectionBlock>
              <SkeletonBlock $height={28} $width="18%" />
              <SkeletonBlock $height={18} $width="44%" />
              <SkeletonBlock $height={18} $width="68%" />
            </SectionBlock>

            <SectionBlock>
              <SkeletonBlock $height={28} $width="24%" />
              <ListBlock>
                <SkeletonBlock $height={18} $width="82%" />
                <SkeletonBlock $height={18} $width="76%" />
                <SkeletonBlock $height={18} $width="88%" />
              </ListBlock>
            </SectionBlock>

            <SectionBlock>
              <SkeletonBlock $height={28} $width="18%" />
              <SkeletonBlock $height={18} $width="86%" />
              <ListBlock>
                <SkeletonBlock $height={18} $width="92%" />
                <SkeletonBlock $height={18} $width="78%" />
                <SkeletonBlock $height={18} $width="80%" />
                <SkeletonBlock $height={18} $width="86%" />
              </ListBlock>
              <SkeletonBlock $height={22} $width="36%" />
              <SkeletonBlock $height={18} $width="90%" />
              <SkeletonBlock $height={18} $width="72%" />
            </SectionBlock>

            <SectionBlock>
              <SkeletonBlock $height={28} $width="34%" />
              <SkeletonBlock $height={18} $width="80%" />
              <ListBlock>
                {["88%", "84%", "76%", "62%", "58%", "64%", "56%", "52%", "60%"].map(
                  (width, index) => (
                    <SkeletonBlock
                      key={`keyboard-line-${index}`}
                      $height={18}
                      $width={width}
                    />
                  )
                )}
              </ListBlock>
            </SectionBlock>

            <SectionBlock>
              <SkeletonBlock $height={28} $width="16%" />
              <ListBlock>
                <SkeletonBlock $height={18} $width="86%" />
                <SkeletonBlock $height={18} $width="72%" />
                <SkeletonBlock $height={18} $width="84%" />
              </ListBlock>
            </SectionBlock>
          </Sections>
        </HowToPlayPanel>
      </HowToPlayMain>
    </>
  );
}
