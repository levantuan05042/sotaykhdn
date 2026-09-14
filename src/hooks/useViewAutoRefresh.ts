import { useEffect, useRef } from 'react';

export const VIEW_REFRESH_INTERVAL_MS = 15000;

export function useViewAutoRefresh(
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

    const interval = window.setInterval(run, VIEW_REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
