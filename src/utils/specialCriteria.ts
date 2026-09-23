export interface SpecialCriteriaConfig {
  code: string;
  name: string;
  isRequired: boolean;
  superGroup: 'SERVICE' | 'INSURANCE' | 'PROGRAM';
  superGroupName: string;
}

export const SPECIAL_CRITERIA_LIST: SpecialCriteriaConfig[] = [
  {
    code: 'TCSP_0003',
    name: 'Tên sản phẩm dịch vụ',
    isRequired: true,
    superGroup: 'SERVICE',
    superGroupName: 'Sản phẩm dịch vụ',
  },
  {
    code: 'TCBH_0001',
    name: 'Tên sản phẩm',
    isRequired: true,
    superGroup: 'INSURANCE',
    superGroupName: 'Sản phẩm bảo hiểm',
  },
  {
    code: 'TCUD_001',
    name: 'Tên chương trình',
    isRequired: true,
    superGroup: 'PROGRAM',
    superGroupName: 'Chương trình ưu đãi',
  },
];

const normalizeForComparison = (str?: string | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Kiểm tra xem một đối tượng tiêu chí có phải là 1 trong 3 tiêu chí đặc biệt không.
 */
export const isSpecialCriteria = (item?: { code?: string; name?: string; id?: string } | null): boolean => {
  if (!item) return false;
  const c = (item.code || '').trim().toUpperCase();
  const n = normalizeForComparison(item.name);
  const idStr = String(item.id || '').toLowerCase();

  return SPECIAL_CRITERIA_LIST.some(sc => {
    if (c && sc.code.toUpperCase() === c) return true;
    if (n && normalizeForComparison(sc.name) === n) return true;
    if (idStr.includes(sc.code.toLowerCase())) return true;
    return false;
  });
};

/**
 * Lấy cấu hình tiêu chí đặc biệt theo code hoặc name
 */
export const getSpecialCriteriaConfig = (item?: { code?: string; name?: string; id?: string } | null): SpecialCriteriaConfig | undefined => {
  if (!item) return undefined;
  const c = (item.code || '').trim().toUpperCase();
  const n = normalizeForComparison(item.name);
  const idStr = String(item.id || '').toLowerCase();

  return SPECIAL_CRITERIA_LIST.find(sc => {
    if (c && sc.code.toUpperCase() === c) return true;
    if (n && normalizeForComparison(sc.name) === n) return true;
    if (idStr.includes(sc.code.toLowerCase())) return true;
    return false;
  });
};

/**
 * Kiểm tra xem mã hoặc tên có bị trùng với bất kỳ tiêu chí đặc biệt nào hay không.
 * Dùng khi Thêm mới hoặc Sửa tiêu chí thông thường.
 */
export const checkSpecialCriteriaConflict = (
  code?: string,
  name?: string
): { hasConflict: boolean; message?: string; codeConflict?: string; nameConflict?: string } => {
  const c = (code || '').trim().toUpperCase();
  const n = normalizeForComparison(name);

  let codeConflict: string | undefined;
  let nameConflict: string | undefined;

  if (c) {
    const codeMatch = SPECIAL_CRITERIA_LIST.find(sc => sc.code.toUpperCase() === c);
    if (codeMatch) {
      codeConflict = `Mã tiêu chí "${code?.trim()}" trùng với tiêu chí đặc biệt của hệ thống (${codeMatch.code} - ${codeMatch.name}). Vui lòng chọn mã khác.`;
    }
  }

  if (n) {
    const nameMatch = SPECIAL_CRITERIA_LIST.find(sc => normalizeForComparison(sc.name) === n);
    if (nameMatch) {
      nameConflict = `Tên tiêu chí "${name?.trim()}" trùng với tiêu chí đặc biệt của hệ thống (${nameMatch.name} - ${nameMatch.code}). Vui lòng chọn tên khác.`;
    }
  }

  if (codeConflict || nameConflict) {
    return {
      hasConflict: true,
      message: codeConflict || nameConflict,
      codeConflict,
      nameConflict,
    };
  }

  return { hasConflict: false };
};
