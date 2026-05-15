import { Panel } from "@vcell/ui";
import styled from "styled-components";
import {
  RouteTitleSkeleton,
  SkeletonHeadingBlock,
  SkeletonListLines,
  SkeletonSubheadingBlock,
  SkeletonTextLines
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

const InstructionSection = styled.section`
  > :first-child {
    margin-top: 0;
  }

  > :last-child {
    margin-bottom: 0;
  }
`;

export function HowToPlayRouteLoading() {
  return (
    <>
      <HowToPlayMain
        role="status"
        aria-live="polite"
        aria-label="Loading how to play"
      >
        <RouteTitleSkeleton label="How to Play" width={280} />

        <HowToPlayPanel aria-label="How to play instructions">
          <Sections>
            <InstructionSection>
              <h2>
                <SkeletonHeadingBlock $width="18%" />
              </h2>
              <SkeletonTextLines widths={["44%"]} />
              <SkeletonTextLines widths={["68%", "42%"]} />
            </InstructionSection>

            <InstructionSection>
              <h2>
                <SkeletonHeadingBlock $width="24%" />
              </h2>
              <SkeletonListLines widths={["82%", "76%", "88%"]} />
            </InstructionSection>

            <InstructionSection>
              <h2>
                <SkeletonHeadingBlock $width="18%" />
              </h2>
              <SkeletonTextLines widths={["86%", "54%"]} />
              <SkeletonListLines widths={["92%", "78%", "80%", "86%"]} />
              <br />
              <h3>
                <SkeletonSubheadingBlock $width="36%" />
              </h3>
              <SkeletonTextLines widths={["90%", "82%", "72%"]} />
            </InstructionSection>

            <InstructionSection>
              <h2>
                <SkeletonHeadingBlock $width="34%" />
              </h2>
              <SkeletonTextLines widths={["80%", "70%"]} />
              <SkeletonListLines
                widths={[
                  "88%",
                  "84%",
                  "76%",
                  "62%",
                  "58%",
                  "64%",
                  "56%",
                  "52%",
                  "60%",
                  "44%"
                ]}
              />
            </InstructionSection>

            <InstructionSection>
              <h2>
                <SkeletonHeadingBlock $width="16%" />
              </h2>
              <SkeletonListLines widths={["86%", "72%", "84%"]} />
            </InstructionSection>
          </Sections>
        </HowToPlayPanel>
      </HowToPlayMain>
    </>
  );
}
