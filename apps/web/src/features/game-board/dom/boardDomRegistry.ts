import { useCallback, useRef } from "react";

export type BoardDomRegistry = {
  tableauColRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  setTableauColRef: (colIndex: number, el: HTMLDivElement | null) => void;

  freeCellRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  setFreeCellRef: (index: number, el: HTMLDivElement | null) => void;

  foundationRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  setFoundationRef: (index: number, el: HTMLDivElement | null) => void;
};

export function useBoardDomRegistry(): BoardDomRegistry {
  const tableauColRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setTableauColRef = useCallback(
    (colIndex: number, el: HTMLDivElement | null) => {
      tableauColRefs.current[colIndex] = el;
    },
    []
  );

  const freeCellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFreeCellRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      freeCellRefs.current[index] = el;
    },
    []
  );

  const foundationRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFoundationRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      foundationRefs.current[index] = el;
    },
    []
  );

  return {
    tableauColRefs,
    setTableauColRef,
    freeCellRefs,
    setFreeCellRef,
    foundationRefs,
    setFoundationRef
  };
}
