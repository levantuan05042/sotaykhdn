export const FIELD_LIMITS = {
  name: 255,
  code: 50,
  criteriaValue: 4000,
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

/** Oracle VARCHAR2(4000) tính theo byte UTF-8, không phải số ký tự JS. */
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

export const getCriteriaMaxLength = (name?: string, code?: string) =>
  isProductNameCriteria(name, code) ? FIELD_LIMITS.name : FIELD_LIMITS.criteriaValue;

export const getCriteriaValueError = (html: string, label: string, isProductName = false) => {
  const stored = getStoredCriteriaLength(html);
  if (isProductName && stored > FIELD_LIMITS.name) {
    return `${label}: ${FieldErrors.maxChars(FIELD_LIMITS.name)}`;
  }
  if (stored > FIELD_LIMITS.criteriaValue) {
    return `${label}: ${FieldErrors.maxChars(FIELD_LIMITS.criteriaValue)}`;
  }
  return null;
};

export const getRejectReasonError = (value: string) => {
  if (value.trim().length > FIELD_LIMITS.rejectReason) {
    return FieldErrors.maxChars(FIELD_LIMITS.rejectReason);
  }
  return null;
};

export const getFirstCriteriaValueError = (
  items: Array<{ name?: string; code?: string; value?: string; isSelected?: boolean }>
) => {
  for (const item of items) {
    if (item.isSelected === false) continue;
    const err = getCriteriaValueError(
      item.value || '',
      item.name || 'Tiêu chí',
      isProductNameCriteria(item.name, item.code)
    );
    if (err) return err;
  }
  return null;
};
