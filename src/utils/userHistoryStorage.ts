const getHistoryUsername = (): string => {
  try {
    const stored =
      localStorage.getItem('currentUserUsername') ||
      localStorage.getItem('username') ||
      localStorage.getItem('currentUserFullName');
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }
  return 'guest';
};

const searchesKey = (username = getHistoryUsername()) => `agri_recent_searches_${username}`;
const viewedKey = (username = getHistoryUsername()) => `agri_recently_viewed_${username}`;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const getRecentSearches = (): string[] => {
  const username = getHistoryUsername();
  const key = searchesKey(username);
  const own = readJson<string[]>(key, []);
  if (own.length > 0) return own;

  if (username !== 'guest') {
    const legacy = readJson<string[]>('recentSearches', []);
    if (legacy.length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(legacy));
      } catch {
        // ignore
      }
      return legacy;
    }
  }
  return [];
};

export const setRecentSearches = (searches: string[]): void => {
  try {
    localStorage.setItem(searchesKey(), JSON.stringify(searches));
  } catch {
    // ignore
  }
};

export const clearRecentSearches = (): void => {
  try {
    localStorage.removeItem(searchesKey());
  } catch {
    // ignore
  }
};

export const addRecentSearch = (keyword: string, limit = 10): string[] => {
  const trimmed = keyword.trim();
  if (!trimmed) return getRecentSearches();
  const next = [trimmed, ...getRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, limit);
  setRecentSearches(next);
  return next;
};

export const getRecentlyViewed = <T = any>(): T[] => {
  const username = getHistoryUsername();
  const key = viewedKey(username);
  const own = readJson<T[]>(key, []);
  if (own.length > 0) return own;

  if (username !== 'guest') {
    const legacy = readJson<T[]>('recentlyViewed', []);
    if (legacy.length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(legacy));
      } catch {
        // ignore
      }
      return legacy;
    }
  }
  return [];
};

export const setRecentlyViewed = <T = any>(items: T[]): void => {
  try {
    localStorage.setItem(viewedKey(), JSON.stringify(items));
  } catch {
    // ignore
  }
};

export const addRecentlyViewed = <T extends { id?: string }>(item: T, limit = 6): T[] => {
  const history = getRecentlyViewed<T>().filter((row) => row?.id !== item?.id);
  history.unshift(item);
  const next = history.slice(0, limit);
  setRecentlyViewed(next);
  return next;
};

export const removeRecentlyViewed = (id?: string | null): void => {
  if (!id) return;
  const next = getRecentlyViewed<{ id?: string }>().filter((row) => row?.id !== id);
  setRecentlyViewed(next);
};

const categoryOrderKey = (username = getHistoryUsername()) => `agri_category_order_${username}`;

export const getUserCategoryOrder = (): string[] | null => {
  const username = getHistoryUsername();
  const key = categoryOrderKey(username);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(String) : null;
  } catch {
    return null;
  }
};

export const setUserCategoryOrder = (orderedIds: (string | number)[]): void => {
  try {
    const key = categoryOrderKey();
    localStorage.setItem(key, JSON.stringify(orderedIds.map(String)));
  } catch {
    // ignore
  }
};

export const sortCategoriesForUser = <T extends { id: string | number; [key: string]: any }>(
  categories: T[]
): T[] => {
  if (!categories || categories.length === 0) return [];

  const getCreatedTimestamp = (cat: T): number => {
    const rawDate = cat.createdAt || cat.createdDate || cat.updatedAt;
    if (rawDate) {
      const time = new Date(rawDate).getTime();
      if (!isNaN(time) && time > 0) return time;
    }
    const numId = Number(cat.id);
    if (!isNaN(numId)) return numId;
    return 0;
  };

  const savedIds = getUserCategoryOrder();

  // 1. Nếu chưa có cấu hình sắp xếp riêng của user:
  // Sắp xếp theo thứ tự từ mới đến cũ (createdAt / thời gian tạo giảm dần)
  if (!savedIds || savedIds.length === 0) {
    return [...categories].sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a));
  }

  // 2. Khi người dùng đã sắp xếp rồi:
  // Bỏ sort theo mới cũ. Các danh mục đã lưu sẽ theo đúng thứ tự đã lưu.
  // Khi có danh mục mới (id chưa có trong danh sách đã lưu) thì đưa xuống dưới cùng.
  const savedIndexMap = new Map<string, number>();
  savedIds.forEach((id, idx) => {
    savedIndexMap.set(String(id), idx);
  });

  const orderedExisting: T[] = [];
  const newItems: T[] = [];

  categories.forEach((cat) => {
    const catId = String(cat.id);
    if (savedIndexMap.has(catId)) {
      orderedExisting.push(cat);
    } else {
      newItems.push(cat);
    }
  });

  // Giữ nguyên thứ tự mà người dùng đã sắp xếp
  orderedExisting.sort((a, b) => {
    const idxA = savedIndexMap.get(String(a.id)) ?? 0;
    const idxB = savedIndexMap.get(String(b.id)) ?? 0;
    return idxA - idxB;
  });

  // Các mục mới: đưa xuống dưới cùng (trong nhóm mới này thì cái mới hơn nằm trước)
  newItems.sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a));

  return [...orderedExisting, ...newItems];
};
