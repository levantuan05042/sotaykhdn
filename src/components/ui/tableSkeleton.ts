export const TABLE_SKELETON_ROWS = 6;

const NARROW_KEYS = new Set(['stt', 'action', 'actions', 'active']);
const STACKED_NAME_ROWS = [true, false, true, true, false, true];

export const isNarrowSkeleton = (key: string) => NARROW_KEYS.has(key);

export const isStackedNameSkeleton = (key: string, rowIndex: number) =>
  key === 'name' && STACKED_NAME_ROWS[rowIndex % STACKED_NAME_ROWS.length];

export const skeletonBarWidth = (key: string, colIdx: number, rowIndex: number): string => {
  if (NARROW_KEYS.has(key)) return '18px';
  if (key === 'name') {
    const widths = ['72%', '58%', '86%', '64%', '48%', '70%'];
    return widths[rowIndex % widths.length];
  }
  if (key === 'status') return rowIndex % 2 === 0 ? '88px' : '72px';
  if (key === 'version') return '72px';
  if (key === 'productGroupName' || key === 'productCategoryName') {
    return rowIndex % 2 === 0 ? '110px' : '86px';
  }
  const cycle = ['72px', '56px', '96px', '64px', '80px'];
  return cycle[(rowIndex + colIdx) % cycle.length];
};
