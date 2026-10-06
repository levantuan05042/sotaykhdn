import { useEffect, useRef } from 'react';
import { ADMIN_DATA_CHANGED_EVENT } from './useAdminAutoRefresh';

/** Tần số tự động làm mới màn View (1 giây - độ trễ tối đa 1s). */
export const VIEW_REFRESH_INTERVAL_MS = 1000;

const BROADCAST_CHANNEL_NAME = 'admin_data_sync_channel';
const LOCAL_STORAGE_VIEW_KEY = 'last_view_change_ts';

export function useViewAutoRefresh(
  refresh: () => void | Promise<unknown>,
  deps: unknown[] = [],
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || Boolean((window as any).__OFFLINE_DATA__))) {
      return;
    }

    let lastRunTime = 0;
    let timeoutId: number | null = null;

    const run = () => {
      if (document.hidden) return;
      const now = Date.now();
      // Debounce rapid calls (within 150ms) to avoid duplicate simultaneous fetches
      if (now - lastRunTime < 150) {
        if (timeoutId) window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          lastRunTime = Date.now();
          void refreshRef.current();
        }, 150);
        return;
      }
      lastRunTime = now;
      void refreshRef.current();
    };

    const interval = window.setInterval(run, VIEW_REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    const onDataChanged = (e: any) => {
      if (e?.detail?.isViewAffecting === false) return;
      run();
    };

    // 1. Same-window event listener & visibility listeners
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(ADMIN_DATA_CHANGED_EVENT, onDataChanged);

    // 2. BroadcastChannel cross-tab listener
    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event?.data?.type === ADMIN_DATA_CHANGED_EVENT) {
            if (event?.data?.isViewAffecting === false) return;
            run();
          }
        };
      }
    } catch {
      bc = null;
    }

    // 3. Storage event fallback for cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_VIEW_KEY) {
        run();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(ADMIN_DATA_CHANGED_EVENT, onDataChanged);
      window.removeEventListener('storage', onStorage);
      if (bc) {
        bc.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
