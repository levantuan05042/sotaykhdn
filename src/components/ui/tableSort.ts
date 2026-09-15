export type SortDir = 'asc' | 'desc';

const NON_SORTABLE_KEYS = new Set(['stt', 'action', 'actions', 'checkbox']);

export const isColumnSortable = (key: string, header?: string, sortable?: boolean) => {
  if (sortable === false) return false;
  if (sortable === true) return true;
  if (!header) return false;
  return !NON_SORTABLE_KEYS.has(key);
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

const parseSortDate = (value: unknown): number | null => {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim() || value === '---') return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value) || value.includes('T')) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }

  const m = value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const t = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
};

const normalizeGroups = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

export const getCellSortValue = (row: Record<string, any>, key: string): string | number => {
  if (key === 'superGroup') {
    const map: Record<string, string> = {
      SERVICE: 'Sản phẩm dịch vụ',
      INSURANCE: 'Sản phẩm bảo hiểm',
      PROGRAM: 'Chương trình ưu đãi',
    };
    return map[row.superGroup] || row.superGroup || '';
  }

  if (key === 'productGroups') {
    return normalizeGroups(row.productGroups)
      .map((g: any) => g?.name || '')
      .filter(Boolean)
      .join(', ')
      .toLowerCase();
  }

  if (key === 'active') {
    return row.active === false ? 0 : 1;
  }

  const raw = row[key];
  if (raw == null || raw === '') return '';

  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'number') return raw;

  const asDate = parseSortDate(raw);
  if (asDate != null && (key.toLowerCase().includes('at') || key.toLowerCase().includes('date'))) {
    return asDate;
  }
  if (asDate != null && typeof raw === 'string' && (/^\d{4}-\d{2}-\d{2}/.test(raw) || raw.includes('T'))) {
    return asDate;
  }

  return stripHtml(String(raw)).toLowerCase();
};

export const compareSortValues = (left: string | number, right: string | number, dir: SortDir) => {
  const emptyLeft = left === '' || left == null;
  const emptyRight = right === '' || right == null;
  if (emptyLeft && emptyRight) return 0;
  if (emptyLeft) return 1;
  if (emptyRight) return -1;

  let result = 0;
  if (typeof left === 'number' && typeof right === 'number') {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), 'vi', { numeric: true, sensitivity: 'base' });
  }
  return dir === 'asc' ? result : -result;
};

export const sortTableRows = <T extends Record<string, any>>(rows: T[], key: string, dir: SortDir): T[] => {
  return [...rows].sort((a, b) => {
    const primary = compareSortValues(getCellSortValue(a, key), getCellSortValue(b, key), dir);
    if (primary !== 0) return primary;
    if (key !== 'createdAt') {
      return compareSortValues(getCellSortValue(a, 'createdAt'), getCellSortValue(b, 'createdAt'), 'desc');
    }
    return 0;
  });
};

export const nextSortDir = (currentKey: string, currentDir: SortDir, nextKey: string): SortDir => {
  if (currentKey === nextKey) return currentDir === 'asc' ? 'desc' : 'asc';
  return nextKey === 'createdAt' || nextKey === 'updatedAt' ? 'desc' : 'asc';
};
