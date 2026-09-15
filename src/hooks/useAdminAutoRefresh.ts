import { useEffect, useRef } from 'react';

/** Poll nhanh để màn quản lý cập nhật gần realtime khi DB đổi. */
export const ADMIN_REFRESH_INTERVAL_MS = 3000;

export const ADMIN_DATA_CHANGED_EVENT = 'adminDataChanged';

/** Gọi sau create/update/delete/approve để các màn đang mở refresh ngay. */
export function notifyAdminDataChanged() {
  try {
    window.dispatchEvent(new Event(ADMIN_DATA_CHANGED_EVENT));
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
    const run = () => {
      if (document.hidden) return;
      void refreshRef.current();
    };

    const interval = window.setInterval(run, ADMIN_REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    const onDataChanged = () => run();

    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(ADMIN_DATA_CHANGED_EVENT, onDataChanged);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(ADMIN_DATA_CHANGED_EVENT, onDataChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
