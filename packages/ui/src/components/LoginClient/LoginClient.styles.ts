import styled from "styled-components";

export const LoginPageStack = styled.main`
  display: grid;
  gap: 1rem;
  justify-items: center;
`;

export const GuestPlayNotice = styled.aside`
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  max-width: 720px;
  padding: 1rem;
  width: 100%;

  & a,
  & button {
    flex: 0 0 auto;
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const GuestPlayCopy = styled.div`
  min-width: 0;

  & strong {
    color: var(--text);
    display: block;
    font-weight: 700;
  }

  & p {
    color: var(--muted);
    margin: 0.25rem 0 0;
  }
`;
