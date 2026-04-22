"use client";

import styled from "styled-components";

export const TableauScrollRoot = styled.div`
  overflow: auto;
  flex-grow: 1;
`;

export const TableauGridRoot = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--card-gap, 10px);
  padding: 4px;
  background-color: var(--tableau-bg);
  border-radius: var(--radius);
  overflow: visible;
  min-height: 100%;
  position: relative;
`;
