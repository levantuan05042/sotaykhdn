export const formatApprovedBy = (userVal: string | null | undefined): string => {
  if (!userVal) return '---';
  const val = String(userVal).trim();
  if (!val || val === '---') return '---';

  const storedFullName = localStorage.getItem('currentUserFullName');
  const storedUsername = localStorage.getItem('currentUserUsername');

  if (val === 'anonymousUser') {
    if (storedFullName) return storedFullName;
    return 'anonymousUser';
  }

  const parts = val.split('_');
  const username = parts[0];
  const branchCode = parts[1];

  if (storedUsername && (username === storedUsername || val === storedUsername) && storedFullName) {
    return storedFullName;
  }

  const rawUsers = sessionStorage.getItem('beadminUsers') || sessionStorage.getItem('headminUsers');
  if (rawUsers) {
    try {
      const parsed = typeof rawUsers === 'string' && (rawUsers.startsWith('{') || rawUsers.startsWith('[')) ? JSON.parse(rawUsers) : rawUsers;
      const usersList = parsed.listUser || (Array.isArray(parsed) ? parsed : []);
      if (Array.isArray(usersList)) {
        let found = usersList.find((u: any) => u.username === username && branchCode && u.branchCode === branchCode);
        if (!found) {
          found = usersList.find((u: any) => u.username === username || u.username === val);
        }
        if (found && (found.fullname || found.fullName)) {
          return found.fullname || found.fullName;
        }
      }
    } catch (e) {
      console.error("Error parsing users from sessionStorage", e);
    }
  }

  return val;
};

export const formatUserFullName = formatApprovedBy;
export const formatCreatedBy = formatApprovedBy;

export const formatVersion = (version: any): string => {
  if (version === null || version === undefined) return '---';
  const str = String(version).trim();
  if (str === '' || str.toLowerCase() === 'null') return '---';
  return `Phiên bản ${str}`;
};

export const isCascadeHidden = (item?: { cascadeHiddenBy?: string | null } | null): boolean =>
  Boolean(item?.cascadeHiddenBy);

const toGroupList = (item?: { productGroups?: any } | null): any[] => {
  const raw = item?.productGroups;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
};

/** Khóa cả tiêu chí chỉ khi mọi nhóm gắn đều đang ẩn (kể cả chỉ 1 nhóm). */
export const isCriteriaFullyLocked = (
  item?: { cascadeHiddenBy?: string | null; productGroups?: any } | null
): boolean => {
  const groups = toGroupList(item).filter((g) => !g?.status || String(g.status).toUpperCase() === 'ACTIVE');
  if (groups.length === 0) return Boolean(item?.cascadeHiddenBy);
  return groups.every((g) => g?.active === false);
};

export const getCascadeRowClassName = (item?: { cascadeHiddenBy?: string | null; productGroups?: any } | null): string =>
  isCriteriaFullyLocked(item) ? 'row-cascade-hidden' : '';

export const CASCADE_LOCK_MESSAGE =
  'Bản ghi này đang bị ẩn theo đối tượng cha nên chỉ xem, không thể chỉnh sửa.';

