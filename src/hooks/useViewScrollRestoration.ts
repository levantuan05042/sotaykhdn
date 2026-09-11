import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

const positions = new Map<string, number>();
const locationKey = (pathname: string, search: string) => pathname + search;

function readScrollY(scroller: HTMLElement | null): number {
  return scroller?.scrollTop || 0;
}

export function useViewScrollRestoration(containerRef: RefObject<HTMLElement | null>) {
  const location = useLocation();
  const key = locationKey(location.pathname, location.search);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const scroller = containerRef.current;
    if (!scroller) return;

    const snapshot = () => {
      const y = readScrollY(scroller);
      const k = keyRef.current;
      if (y > 0) {
        positions.set(k, y);
        return;
      }
      const prev = positions.get(k) ?? 0;
      if (prev > 0 && scroller.scrollHeight <= scroller.clientHeight + 10) return;
      positions.set(k, 0);
    };

    const onPointerDown = () => snapshot();
    scroller.addEventListener('scroll', snapshot, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      scroller.removeEventListener('scroll', snapshot);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [containerRef]);

  useLayoutEffect(() => {
    const scroller = containerRef.current;
    if (!scroller) return;

    const saved = positions.get(key) ?? 0;
    scroller.scrollTop = saved;
  }, [containerRef, key]);
}
