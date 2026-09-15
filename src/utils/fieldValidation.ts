export const FIELD_LIMITS = {
  /** Giữ giới hạn cho tên nhóm/danh mục/nghiệp vụ/tiêu chí master (VARCHAR). */
  name: 255,
  code: 50,
  /** VALUE / tên sản phẩm đã chuyển CLOB — không giới hạn UI. */
  criteriaValue: Number.POSITIVE_INFINITY,
  rejectReason: 1000,
} as const;

export const FieldErrors = {
  maxChars: (max: number) => `Chỉ được nhập tối đa ${max} ký tự.`,
  numbersOnly: 'Chỉ được nhập số.',
  codeFormat: 'Mã chỉ được nhập chữ, số và dấu gạch dưới.',
  invalidFormat: 'Định dạng dữ liệu không hợp lệ.',
};

export const stripHtmlText = (html?: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
};

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export const getUtf8ByteLength = (value?: string | null) => {
  const text = value ?? '';
  if (utf8Encoder) return utf8Encoder.encode(text).length;
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
};

/** Độ dài thực tế lưu cột VALUE: HTML Quill đo theo byte UTF-8, gồm cả thẻ. */
export const getStoredCriteriaLength = (html?: string | null) => getUtf8ByteLength(html);

/** Mọi tiêu chí (kể cả tên sản phẩm) đếm cùng chuẩn: byte UTF-8 của HTML lưu. */
export const getCriteriaCountLength = (html: string, _name?: string, _code?: string) =>
  getStoredCriteriaLength(html);

/** Tên nhóm/danh mục/... vẫn giới hạn 255. Tên sản phẩm (CLOB) không dùng hàm này. */
export const getNameError = (value: string, label = 'Trường này') => {
  if (value.trim().length > FIELD_LIMITS.name) {
    return `${label}: ${FieldErrors.maxChars(FIELD_LIMITS.name)}`;
  }
  return null;
};

export const getCodeError = (value: string, label = 'Mã') => {
  const v = value.trim();
  if (!v) return null;
  if (v.length > FIELD_LIMITS.code) {
    return `${label}: ${FieldErrors.maxChars(FIELD_LIMITS.code)}`;
  }
  if (!/^[A-Za-z0-9_]+$/.test(v)) {
    return `${label}: ${FieldErrors.codeFormat}`;
  }
  return null;
};

export const getNumbersOnlyError = (value: string, label: string) => {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) {
    return `${label}: ${FieldErrors.numbersOnly}`;
  }
  return null;
};

export const PRODUCT_NAME_CRITERIA_CODES = ['TCBH_0001', 'TCSP_0003', 'TCUD_001'] as const;

export const isProductNameCriteria = (name?: string, code?: string) => {
  const c = (code || '').toUpperCase();
  if ((PRODUCT_NAME_CRITERIA_CODES as readonly string[]).includes(c)) return true;
  const n = (name || '').toLowerCase().replace(/\s*\(\*\)\s*/g, ' ').trim();
  return (
    n.includes('tên sản phẩm') ||
    n.includes('tên bảo hiểm') ||
    n.includes('tên chương trình') ||
    n.includes('tên ưu đãi')
  );
};

/** Không giới hạn — VALUE/tên SP là CLOB. Trả về undefined để CharCountHint ẩn max. */
export const getCriteriaMaxLength = (_name?: string, _code?: string): number | undefined => undefined;

export const getCriteriaValueError = (_html: string, _label: string, _isProductName = false) => null;

export const getRejectReasonError = (value: string) => {
  if (value.trim().length > FIELD_LIMITS.rejectReason) {
    return FieldErrors.maxChars(FIELD_LIMITS.rejectReason);
  }
  return null;
};

export const getFirstCriteriaValueError = (
  _items: Array<{ name?: string; code?: string; value?: string; isSelected?: boolean }>
) => null;

export const parseCriteriaCreatedAt = (value: unknown): number => {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d, h = 0, min = 0, s = 0] = value.map(Number);
    const t = new Date(y, m - 1, d, h || 0, min || 0, Math.floor(s || 0)).getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, any>;
    if (o.year != null && (o.monthValue != null || o.month != null)) {
      const t = new Date(
        Number(o.year),
        Number(o.monthValue ?? o.month) - 1,
        Number(o.dayOfMonth ?? o.day ?? 1),
        Number(o.hour ?? 0),
        Number(o.minute ?? 0),
        Number(o.second ?? 0)
      ).getTime();
      return Number.isNaN(t) ? NaN : t;
    }
  }
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : NaN;
  }
  return NaN;
};

/** Oldest created first. API list is newest-first, so undated items keep reverse of original order. */
export const sortCriteriaByCreatedAtAsc = <T extends { createdAt?: unknown }>(items: T[]): T[] => {
  const indexed = items.map((item, index) => ({ item, index }));
  const anyDated = indexed.some(({ item }) => Number.isFinite(parseCriteriaCreatedAt(item.createdAt)));
  indexed.sort((a, b) => {
    const ta = parseCriteriaCreatedAt(a.item.createdAt);
    const tb = parseCriteriaCreatedAt(b.item.createdAt);
    const aOk = Number.isFinite(ta);
    const bOk = Number.isFinite(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return anyDated ? a.index - b.index : b.index - a.index;
  });
  return indexed.map(({ item }) => item);
};
