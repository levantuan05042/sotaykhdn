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
  const plain = stripHtmlText(html);
  const max = isProductName ? FIELD_LIMITS.name : FIELD_LIMITS.criteriaValue;
  if (plain.length > max) {
    return `${label}: ${FieldErrors.maxChars(max)}`;
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
