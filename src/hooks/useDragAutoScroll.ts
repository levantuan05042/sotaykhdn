import { useEffect, useRef } from 'react';

const EDGE_PX = 96;
const MAX_SPEED = 24;

function findScrollableAncestor(start: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = start;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    const scrollable =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1;
    if (scrollable) return node;
    node = node.parentElement;
  }
  return window;
}

function getViewportRect(target: HTMLElement | Window): DOMRect {
  if (target === window) {
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }
  return (target as HTMLElement).getBoundingClientRect();
}

function scrollByY(target: HTMLElement | Window, dy: number) {
  if (!dy) return;
  if (target === window) {
    window.scrollBy(0, dy);
    return;
  }
  (target as HTMLElement).scrollTop += dy;
}

export function useDragAutoScroll(active: boolean) {
  const lastYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastYRef.current = null;
      return;
    }

    const startEl = document.querySelector('.criterion-card') as HTMLElement | null;
    const scrollParent = findScrollableAncestor(startEl);

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      lastYRef.current = e.clientY;
    };

    document.addEventListener('dragover', onDragOver);

    let raf = 0;
    const tick = () => {
      const y = lastYRef.current;
      if (y != null) {
        const rect = getViewportRect(scrollParent);
        const topZone = rect.top + EDGE_PX;
        const bottomZone = rect.bottom - EDGE_PX;

        if (y < topZone) {
          const intensity = Math.min(1, Math.max(0, (topZone - y) / EDGE_PX));
          scrollByY(scrollParent, -Math.ceil(MAX_SPEED * intensity));
        } else if (y > bottomZone) {
          const intensity = Math.min(1, Math.max(0, (y - bottomZone) / EDGE_PX));
          scrollByY(scrollParent, Math.ceil(MAX_SPEED * intensity));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('dragover', onDragOver);
      cancelAnimationFrame(raf);
      lastYRef.current = null;
    };
  }, [active]);
}
