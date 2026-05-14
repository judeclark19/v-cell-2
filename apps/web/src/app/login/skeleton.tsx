import {
  GuestPlayCopy,
  GuestPlayNotice,
  LoginPageStack,
  Panel
} from "@vcell/ui";
import styled from "styled-components";
import { LoadingStyles, SkeletonBlock } from "@/ui/RouteLoading.shared";

const GuestNoticeSkeleton = styled(GuestPlayNotice)`
  border: 1px solid var(--border);
  border-radius: 16px;
`;

const NoticeCopySkeleton = styled(GuestPlayCopy)`
  display: grid;
  gap: 0.5rem;
  width: 100%;
`;

const GuestButtonSkeleton = styled(SkeletonBlock).attrs({
  $height: 44,
  $radius: "999px",
  $width: 164
})`
  flex: 0 0 auto;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const AuthPanel = styled(Panel).attrs({
  as: "section",
  maxWidth: 500
})`
  width: 100%;
`;

const TabsShell = styled.div`
  display: grid;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const TabList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border-bottom: 1px solid var(--border);
`;

const TabButtonShell = styled.div`
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: center;
`;

const PanelBody = styled.div`
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  display: grid;
  gap: 0.4rem;
`;

const GoogleButtonSkeleton = styled(SkeletonBlock).attrs({
  $height: 40,
  $radius: "999px",
  $width: "100%"
})``;

const DividerRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  align-items: center;
`;

const DividerLabel = styled(SkeletonBlock).attrs({
  $height: 14,
  $radius: "999px",
  $width: 32
})``;

const DividerLine = styled(SkeletonBlock).attrs({
  $height: 1,
  $radius: "0",
  $width: "100%"
})``;

const InputSkeleton = styled(SkeletonBlock).attrs({
  $height: 44,
  $radius: "10px",
  $width: "100%"
})``;

const SubmitSkeleton = styled(SkeletonBlock).attrs({
  $height: 44,
  $radius: "999px",
  $width: "100%"
})``;

const FooterLinkRow = styled.div`
  display: flex;
  justify-content: center;
`;

export function LoginRouteLoading() {
  return (
    <>
      <LoadingStyles />
      <LoginPageStack
        role="status"
        aria-live="polite"
        aria-label="Loading login"
      >
        <GuestNoticeSkeleton aria-label="Guest play option">
          <NoticeCopySkeleton>
            <SkeletonBlock $height={22} $width="36%" />
            <SkeletonBlock $height={18} $width="82%" />
            <SkeletonBlock $height={18} $width="70%" />
          </NoticeCopySkeleton>
          <GuestButtonSkeleton />
        </GuestNoticeSkeleton>

        <AuthPanel>
          <TabsShell>
            <TabList aria-hidden="true">
              <TabButtonShell>
                <SkeletonBlock $height={30} $width={84} $radius="999px" />
              </TabButtonShell>
              <TabButtonShell>
                <SkeletonBlock $height={30} $width={98} $radius="999px" />
              </TabButtonShell>
            </TabList>

            <PanelBody>
              <SkeletonBlock $height={18} $width="92%" />
              <SkeletonBlock $height={18} $width="78%" />

              <GoogleButtonSkeleton />

              <DividerRow>
                <DividerLine />
                <DividerLabel />
                <DividerLine />
              </DividerRow>

              <FormGroup>
                <SkeletonBlock $height={16} $width={54} $radius="999px" />
                <InputSkeleton />
              </FormGroup>

              <FormGroup>
                <SkeletonBlock $height={16} $width={78} $radius="999px" />
                <InputSkeleton />
              </FormGroup>

              <SubmitSkeleton />

              <FooterLinkRow>
                <SkeletonBlock $height={14} $width={132} $radius="999px" />
              </FooterLinkRow>
            </PanelBody>
          </TabsShell>
        </AuthPanel>
      </LoginPageStack>
    </>
  );
}
