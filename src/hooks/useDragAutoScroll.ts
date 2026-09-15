import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE_PX = 88;
const MAX_SPEED = 28;
const GHOST_ID = 'criterion-pointer-ghost';

function isScrollable(el: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(el);
  const canOverflow = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  return canOverflow && el.scrollHeight > el.clientHeight + 1;
}

function isPageScroller(el: HTMLElement): boolean {
  if (!isScrollable(el)) return false;
  const minH = Math.min(360, window.innerHeight * 0.45);
  return el.clientHeight >= minH;
}

function collectPageScrollers(start: HTMLElement | null): Array<HTMLElement | Window> {
  const list: Array<HTMLElement | Window> = [];
  let node: HTMLElement | null = start;
  while (node) {
    if (isPageScroller(node)) list.push(node);
    node = node.parentElement;
  }
  if (list.length === 0) list.push(window);
  return list;
}

function getScrollTop(target: HTMLElement | Window): number {
  if (target === window) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return (target as HTMLElement).scrollTop;
}

function getMaxScroll(target: HTMLElement | Window): number {
  if (target === window) {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  const el = target as HTMLElement;
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

function scrollByY(target: HTMLElement | Window, dy: number): number {
  if (!dy) return 0;
  const before = getScrollTop(target);
  const next = Math.max(0, Math.min(getMaxScroll(target), before + dy));
  const applied = next - before;
  if (!applied) return 0;
  if (target === window) {
    window.scrollBy(0, applied);
  } else {
    (target as HTMLElement).scrollTop = next;
  }
  return applied;
}

function scrollChain(targets: Array<HTMLElement | Window>, dy: number) {
  let remaining = dy;
  for (const t of targets) {
    if (Math.abs(remaining) < 0.5) break;
    remaining -= scrollByY(t, remaining);
  }
}

function wheelDeltaY(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

function upsertGhost(label: string, x: number, y: number, ghostId = GHOST_ID) {
  let el = document.getElementById(ghostId);
  if (!el) {
    el = document.createElement('div');
    el.id = ghostId;
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '100000',
      pointerEvents: 'none',
      padding: '8px 12px',
      borderRadius: '8px',
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
      fontSize: '13px',
      fontWeight: '600',
      color: '#1F2937',
      maxWidth: '280px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    document.body.appendChild(el);
  }
  el.textContent = label;
  el.style.left = `${x + 14}px`;
  el.style.top = `${y + 14}px`;
}

function removeGhost(ghostId = GHOST_ID) {
  document.getElementById(ghostId)?.remove();
}

export function usePointerListDrag(
  options: {
    cardSelector: string;
    idAttr: string;
    ghostId?: string;
  },
  onReorder: (fromId: string, toId: string) => void,
  enabled = true
) {
  const { cardSelector, idAttr, ghostId = 'pointer-list-ghost' } = options;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const stopRef = useRef<(() => void) | null>(null);

  const firstVisible = useCallback((): HTMLElement | null => {
    const cards = document.querySelectorAll(cardSelector);
    for (const card of cards) {
      const r = (card as HTMLElement).getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return card as HTMLElement;
    }
    return null;
  }, [cardSelector]);

  const idAtPoint = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const card = el instanceof Element ? el.closest(cardSelector) : null;
    return card?.getAttribute(idAttr) || null;
  }, [cardSelector, idAttr]);

  const startDrag = useCallback((id: string, e: React.PointerEvent, label = '') => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const currentDraggedId = id;
    let overId: string | null = null;
    let lastX = e.clientX;
    let lastY = e.clientY;
    setDraggedId(id);
    setDragOverId(null);
    upsertGhost(label, lastX, lastY, ghostId);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const syncOver = (x: number, y: number) => {
      const found = idAtPoint(x, y);
      const next = found && found !== currentDraggedId ? found : null;
      if (overId !== next) {
        overId = next;
        setDragOverId(next);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      upsertGhost(label, lastX, lastY, ghostId);
      syncOver(lastX, lastY);
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const el = ev.target instanceof HTMLElement ? ev.target : firstVisible();
      scrollChain(collectPageScrollers(el), wheelDeltaY(ev));
      syncOver(lastX, lastY);
    };

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stopRef.current?.();
      if (overId && overId !== currentDraggedId) onReorderRef.current(currentDraggedId, overId);
      removeGhost(ghostId);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDraggedId(null);
      setDragOverId(null);
    };

    const wheelOpts: AddEventListenerOptions = { capture: true, passive: false };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    document.addEventListener('wheel', onWheel, wheelOpts);

    let raf = 0;
    const tick = () => {
      const targets = collectPageScrollers(firstVisible());
      const topZone = EDGE_PX;
      const bottomZone = window.innerHeight - EDGE_PX;
      if (lastY < topZone) {
        const intensity = Math.min(1, Math.max(0, (topZone - lastY) / EDGE_PX));
        scrollChain(targets, -Math.ceil(MAX_SPEED * intensity));
        syncOver(lastX, lastY);
      } else if (lastY > bottomZone) {
        const intensity = Math.min(1, Math.max(0, (lastY - bottomZone) / EDGE_PX));
        scrollChain(targets, Math.ceil(MAX_SPEED * intensity));
        syncOver(lastX, lastY);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const stop = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      document.removeEventListener('wheel', onWheel, wheelOpts);
      cancelAnimationFrame(raf);
      stopRef.current = null;
    };
    stopRef.current = stop;
  }, [enabled, firstVisible, ghostId, idAtPoint]);

  useEffect(() => () => {
    stopRef.current?.();
    removeGhost(ghostId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [ghostId]);

  return { draggedId, dragOverId, startDrag };
}

export function useCriteriaPointerDrag(
  onReorder: (fromId: string, toId: string) => void,
  enabled = true
) {
  const { draggedId, dragOverId, startDrag } = usePointerListDrag(
    {
      cardSelector: '.criterion-card',
      idAttr: 'data-criterion-id',
      ghostId: GHOST_ID,
    },
    onReorder,
    enabled
  );
  return { draggedCriterionId: draggedId, dragOverCriterionId: dragOverId, startDrag };
}
