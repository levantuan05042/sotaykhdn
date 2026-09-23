import { useEffect, useRef } from 'react';

/** Poll nhanh để màn quản lý cập nhật gần realtime khi DB đổi. */
export const ADMIN_REFRESH_INTERVAL_MS = 2000;

export const ADMIN_DATA_CHANGED_EVENT = 'adminDataChanged';
const BROADCAST_CHANNEL_NAME = 'admin_data_sync_channel';
const LOCAL_STORAGE_SYNC_KEY = 'admin_data_changed_ts';

let sharedBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    sharedBroadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  sharedBroadcastChannel = null;
}

/** Gọi sau create/update/delete/approve/toggle để các màn đang mở refresh ngay lập tức trên mọi tab. */
export function notifyAdminDataChanged() {
  try {
    // 1. Same-window event
    window.dispatchEvent(new CustomEvent(ADMIN_DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }

  try {
    // 2. Cross-tab BroadcastChannel
    if (sharedBroadcastChannel) {
      sharedBroadcastChannel.postMessage({ type: ADMIN_DATA_CHANGED_EVENT, ts: Date.now() });
    }
  } catch {
    /* ignore */
  }

  try {
    // 3. Fallback cross-tab storage event
    localStorage.setItem(LOCAL_STORAGE_SYNC_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function useAdminAutoRefresh(
  refresh: () => void | Promise<unknown>,
  deps: unknown[] = [],
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
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

    const interval = window.setInterval(run, ADMIN_REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    const onDataChanged = () => run();

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
            run();
          }
        };
      }
    } catch {
      bc = null;
    }

    // 3. Storage event fallback for cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_SYNC_KEY) {
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
