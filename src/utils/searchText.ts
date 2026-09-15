/** Chuẩn hóa để tìm kiếm không phân biệt hoa thường / dấu / HTML. */
export const normalizeSearch = (value?: string | null): string =>
  String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const matchesSearch = (source?: string | null, keyword?: string | null): boolean => {
  const kw = normalizeSearch(keyword);
  if (!kw) return true;
  return normalizeSearch(source).includes(kw);
};
