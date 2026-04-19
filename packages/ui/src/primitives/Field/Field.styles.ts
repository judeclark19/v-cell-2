"use client";

import styled from "styled-components";

export const FieldRoot = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const FieldLabel = styled.span`
  font: inherit;
  color: inherit;
`;

export const FieldHint = styled.small`
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
`;
