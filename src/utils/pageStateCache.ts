export interface PageStateCacheItem {
  searchTerm?: string;
  currentPage?: number;
  selectedStatuses?: string[];
  selectedSuperGroups?: string[];
  selectedGroups?: string[];
  selectedCategories?: string[];
  selectedBusinesses?: string[];
  selectedCodes?: string[];
  selectedActives?: string[];
  selectedCreators?: string[];
  selectedApprovers?: string[];
  selectedTypes?: string[];
  scrollPos?: {
    pageBodyScrollTop?: number;
    tableScrollTop?: number;
    windowScrollY?: number;
  };
}

// Bộ nhớ cache tạm trong bộ nhớ JavaScript của SPA
// Khi người dùng F5 / reload lại trang, toàn bộ JavaScript được tải lại nên cache tự động bị xóa (trở về mặc định)
// Khi chuyển qua lại giữa trang cha và trang con trong ứng dụng, cache được bảo tồn đầy đủ
const cache = new Map<string, PageStateCacheItem>();

export const getCachedPageState = (key: string): PageStateCacheItem | undefined => {
  return cache.get(key);
};

export const setCachedPageState = (key: string, state: Partial<PageStateCacheItem>) => {
  const prev = cache.get(key) || {};
  cache.set(key, { ...prev, ...state });
};

export const clearCachedPageState = (key: string) => {
  cache.delete(key);
};

export const savePageScroll = (key: string) => {
  const pageBody = document.querySelector('.page-body') || document.querySelector('[class*="page-body"]');
  const tableContainer = document.querySelector('.data-table-container');
  setCachedPageState(key, {
    scrollPos: {
      pageBodyScrollTop: pageBody ? pageBody.scrollTop : 0,
      tableScrollTop: tableContainer ? tableContainer.scrollTop : 0,
      windowScrollY: window.scrollY,
    }
  });
};

export const restorePageScroll = (key: string) => {
  const item = getCachedPageState(key);
  if (!item?.scrollPos) return;
  requestAnimationFrame(() => {
    setTimeout(() => {
      const pageBody = document.querySelector('.page-body') || document.querySelector('[class*="page-body"]');
      const tableContainer = document.querySelector('.data-table-container');
      if (pageBody && item.scrollPos?.pageBodyScrollTop !== undefined) {
        pageBody.scrollTop = item.scrollPos.pageBodyScrollTop;
      }
      if (tableContainer && item.scrollPos?.tableScrollTop !== undefined) {
        tableContainer.scrollTop = item.scrollPos.tableScrollTop;
      }
      if (item.scrollPos?.windowScrollY !== undefined) {
        window.scrollTo(0, item.scrollPos.windowScrollY);
      }
    }, 60);
  });
};
