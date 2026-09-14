import { useEffect, useRef, type RefObject } from 'react';

type CloseTarget = {
  ref: RefObject<HTMLElement | null>;
  close: () => void;
};

export function useCloseOnOutsideClick(targets: CloseTarget[]) {
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      const node = event.target as Node | null;
      if (!node) return;
      targetsRef.current.forEach(({ ref, close }) => {
        if (ref.current && !ref.current.contains(node)) {
          close();
        }
      });
    };

    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
}
