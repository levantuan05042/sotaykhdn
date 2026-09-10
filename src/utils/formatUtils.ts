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

/** CHA đang ẩn: không cho hiện CON. */
export const isParentHidden = (
  item?: {
    cascadeHiddenBy?: string | null;
    groupActive?: boolean | null;
    categoryActive?: boolean | null;
    businessActive?: boolean | null;
    productGroups?: any;
  } | null
): boolean => {
  if (!item) return false;
  if (Boolean(item.cascadeHiddenBy)) return true;
  if (item.groupActive === false) return true;
  if (item.categoryActive === false) return true;
  if (item.businessActive === false) return true;
  return isCriteriaFullyLocked(item);
};

export const getCascadeRowClassName = (_item?: { cascadeHiddenBy?: string | null; productGroups?: any } | null): string =>
  '';

export const CASCADE_LOCK_MESSAGE =
  'Bản ghi này đang bị ẩn theo đối tượng cha nên chỉ xem, không thể chỉnh sửa.';

export interface VersionConfirmInfo {
  isNewVersion: boolean;
  baseVersion: number;
  targetVersion: number;
}

const APPROVED_VERSION_STATUSES = new Set(['ACTIVE', 'APPROVED', 'COMPLETED', 'ARCHIVED']);

const toVersionNumber = (value: any): number | null => {
  if (value === null || value === undefined || String(value).trim() === '' || String(value).toLowerCase() === 'null') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getVersionConfirmInfo = (
  entityData: any,
  currentId?: string,
  isProductActiveFlag?: boolean
): VersionConfirmInfo => {
  const currentStatus = String(entityData?.status || '').toUpperCase();
  const isCurrentActive = Boolean(isProductActiveFlag) || currentStatus === 'ACTIVE' || currentStatus === 'APPROVED' || currentStatus === 'COMPLETED';
  const isDraftLike = currentStatus === 'DRAFT' || currentStatus === 'NEEDS_REVISION' || currentStatus === 'PENDING_APPROVAL';

  const activeId = currentId || entityData?.id;
  const versions: any[] = Array.isArray(entityData?.versions) ? entityData.versions : [];
  const siblings = versions.filter((v: any) => !activeId || v.id !== activeId);

  const priorActive = siblings.find((v: any) => APPROVED_VERSION_STATUSES.has(String(v.status || '').toUpperCase()));

  const priorVersionNumbers = siblings
    .map((v: any) => toVersionNumber(v.version))
    .filter((n: number | null): n is number => n !== null);
  const maxPriorVersion = priorVersionNumbers.length > 0 ? Math.max(...priorVersionNumbers) : null;

  const hasDifferentOriginalId = Boolean(
    entityData?.originalId && activeId && entityData.originalId !== activeId
  );
  const hasPriorApprovedVersion = Boolean(priorActive) || maxPriorVersion !== null;
  const hasSiblingHistory = siblings.length > 0 || versions.length > 1;
  const currentVersionNumber = toVersionNumber(entityData?.version);
  const hasCurrentVersionNumber = currentVersionNumber !== null && currentVersionNumber > 1;

  const isNewVersion =
    isCurrentActive ||
    hasPriorApprovedVersion ||
    hasCurrentVersionNumber ||
    hasDifferentOriginalId ||
    (isDraftLike && hasSiblingHistory);

  let baseVersion = 1;
  let targetVersion = 2;

  if (isCurrentActive) {
    baseVersion = currentVersionNumber || 1;
    targetVersion = baseVersion + 1;
  } else if (hasCurrentVersionNumber && currentVersionNumber) {
    targetVersion = currentVersionNumber;
    baseVersion = Math.max(1, targetVersion - 1);
  } else if (hasPriorApprovedVersion || hasDifferentOriginalId || (isDraftLike && hasSiblingHistory)) {
    baseVersion = toVersionNumber(priorActive?.version) || maxPriorVersion || 1;
    targetVersion = baseVersion + 1;
  }

  return { isNewVersion, baseVersion, targetVersion };
};

export const getActionConfirmDesc = (
  entityData: any,
  currentId: string | undefined,
  confirmAction: string | null,
  entityTypeName: string,
  isProductActiveFlag?: boolean
): string => {
  const { isNewVersion, baseVersion, targetVersion } = getVersionConfirmInfo(entityData, currentId, isProductActiveFlag);
  const isDraftAction = confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION';
  const isSubmitAction = confirmAction === 'PENDING_APPROVAL';

  if (isNewVersion && isSubmitAction) {
    return `Bạn đang thực hiện chỉnh sửa Phiên bản ${baseVersion} của sản phẩm.\nSau khi xác nhận, nội dung chỉnh sửa sẽ được tạo thành Phiên bản ${targetVersion} và gửi đến Kiểm soát để phê duyệt.`;
  }

  if (isNewVersion && isDraftAction) {
    return `Bạn đang thực hiện chỉnh sửa Phiên bản ${baseVersion} của sản phẩm.\nSau khi xác nhận, nội dung chỉnh sửa sẽ được lưu thành bản nháp của Phiên bản ${targetVersion}.`;
  }

  if (isDraftAction) {
    return `Bạn có chắc chắn muốn lưu bản nháp ${entityTypeName} không?`;
  }

  return `Bạn có chắc chắn muốn gửi phê duyệt ${entityTypeName} không?`;
};

export const DISABLED_CONTROL_STYLE = {
  backgroundColor: '#F9FAFB',
  color: '#374151',
  cursor: 'not-allowed' as const,
  opacity: 1,
};

export const isApprovedVersionStatus = (status?: string | null) => {
  const s = String(status || '').toUpperCase();
  return s === 'ACTIVE' || s === 'APPROVED' || s === 'COMPLETED' || s === 'ARCHIVED';
};

export const filterApprovedVersions = <T extends { status?: string | null }>(versions?: T[] | null): T[] =>
  (versions || []).filter((v) => isApprovedVersionStatus(v.status));

export const normalizeActorId = (value?: string | null): string => {
  if (!value) return '';
  return String(value).trim().split('_')[0].toLowerCase();
};

export const isSameActor = (current?: string | null, createdBy?: string | null): boolean => {
  const a = normalizeActorId(current);
  const b = normalizeActorId(createdBy);
  return Boolean(a && b && a === b);
};

