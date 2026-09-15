import { useCallback, useEffect, useState } from 'react';

export type ProductsViewMode = 'grid' | 'list';

const STORAGE_KEY = 'viewProductsDisplayMode';

function readStoredMode(): ProductsViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'list' || raw === 'grid') return raw;
  } catch {
    /* ignore */
  }
  return 'grid';
}

export function useProductsViewMode() {
  const [viewMode, setViewModeState] = useState<ProductsViewMode>(() => readStoredMode());

  useEffect(() => {
    const sync = () => setViewModeState(readStoredMode());
    window.addEventListener('storage', sync);
    window.addEventListener('viewProductsDisplayModeChanged', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('viewProductsDisplayModeChanged', sync);
    };
  }, []);

  const setViewMode = useCallback((mode: ProductsViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('viewProductsDisplayModeChanged'));
  }, []);

  return { viewMode, setViewMode };
}
