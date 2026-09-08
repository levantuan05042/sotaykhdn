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
