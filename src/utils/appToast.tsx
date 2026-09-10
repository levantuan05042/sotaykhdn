import { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BASE_URL } from '../config/apiConfig';
import { isCriteriaFullyLocked, isParentHidden } from './formatUtils';

type ToastType = 'success' | 'error';
type ToastItem = { id: number; type: ToastType; title: string; description?: string };

let toasts: ToastItem[] = [];
let seq = 1;
const subscribers = new Set<() => void>();
let hostRoot: Root | null = null;

const notifySubscribers = () => {
  subscribers.forEach((fn) => fn());
};

const ensureHost = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('app-toast-host');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast-host';
    document.body.appendChild(el);
  }
  if (!hostRoot) {
    hostRoot = createRoot(el);
    hostRoot.render(<ToastHost />);
  }
};

const pushToast = (type: ToastType, title: string, description?: string) => {
  ensureHost();
  const id = seq++;
  toasts = [...toasts, { id, type, title, description }];
  notifySubscribers();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifySubscribers();
  }, 5000);
};

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="17" stroke="#A6F4C5" strokeWidth="2" />
    <circle cx="18" cy="18" r="13.5" stroke="#6CE9A6" strokeWidth="1.5" />
    <circle cx="18" cy="18" r="10" fill="#12B76A" />
    <path d="M13.5 18.2L16.3 21L22.5 14.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="17" stroke="#FECDCA" strokeWidth="2" />
    <circle cx="18" cy="18" r="13.5" stroke="#FDA29B" strokeWidth="1.5" />
    <path d="M18 9.5L27.5 26H8.5L18 9.5Z" fill="#F04438" />
    <path d="M18 15V20.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="18" cy="23.2" r="1" fill="white" />
  </svg>
);

const ToastHost = () => {
  const [items, setItems] = useState<ToastItem[]>(toasts);
  useEffect(() => {
    const onChange = () => setItems([...toasts]);
    subscribers.add(onChange);
    onChange();
    return () => {
      subscribers.delete(onChange);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 2147483647,
        pointerEvents: 'none',
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            background: '#ffffff',
            padding: '12px 16px',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
            border: '1px solid #E5E7EB',
            minWidth: 360,
            maxWidth: 520,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36 }}>
              {item.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: item.type === 'success' ? 600 : 700,
                  lineHeight: '20px',
                  color: item.type === 'success' ? '#027A48' : '#1A191B',
                }}
              >
                {item.title}
              </div>
              {item.description ? (
                <div style={{ fontSize: 13, fontWeight: 400, lineHeight: '18px', color: '#6B7280', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                  {item.description}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => {
              toasts = toasts.filter((t) => t.id !== item.id);
              notifySubscribers();
            }}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              padding: 2,
              marginTop: 2,
            }}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
};

export const showSuccessToast = (title: string) => {
  pushToast('success', title);
};

export const showErrorToast = (title: string, description?: string) => {
  pushToast('error', title, description);
};

export const PARENT_HIDDEN_DESCRIPTION =
  'Nghiệp vụ cha đang ẩn. Vui lòng hiện nghiệp vụ cha trước';

export const plainDisplayName = (name?: string | null): string => {
  if (!name) return '';
  return String(name)
    .replace(/<[^>]+>/g, ' ')
    .replace(/^-\s*/, '')
    .replace(/\(\*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const displaySuccessMessage = (isShow: boolean, typeLabel: string, name?: string | null): string =>
  `${isShow ? 'Hiện' : 'Ẩn'} ${typeLabel} "${plainDisplayName(name)}" thành công`;

export const getHideBlockedByPendingCopy = (
  kind: 'group' | 'category' | 'business',
  name?: string | null
): { title: string; description: string } => {
  const itemName = plainDisplayName(name);
  if (kind === 'group') {
    return {
      title: `Không thể ẩn nhóm sản phẩm "${itemName}"`,
      description: 'Đang có sản phẩm hoặc danh mục hoặc nghiệp vụ con đang ở trạng thái lưu nháp, chờ duyệt hoặc chỉnh sửa',
    };
  }
  if (kind === 'category') {
    return {
      title: `Không thể ẩn danh mục "${itemName}"`,
      description: 'Đang có sản phẩm hoặc nghiệp vụ con đang ở trạng thái lưu nháp, chờ duyệt hoặc chỉnh sửa',
    };
  }
  return {
    title: `Không thể ẩn nghiệp vụ "${itemName}"`,
    description: 'Đang có sản phẩm đang ở trạng thái lưu nháp, chờ duyệt hoặc chỉnh sửa',
  };
};

export const getShowBlockedByParentCopy = (
  typeLabel: string,
  name?: string | null
): { title: string; description: string } => ({
  title: `Không thể hiện ${typeLabel} "${plainDisplayName(name)}"`,
  description: PARENT_HIDDEN_DESCRIPTION,
});

export const hasPendingOrRevisionChildren = (counts?: { pendingOrRevisionCount?: number } | null): boolean =>
  Number(counts?.pendingOrRevisionCount || 0) > 0;

export const showDisplayStatusFromApi = (errJson: any, fallback = 'Không thể cập nhật hiệu lực') => {
  const title = errJson?.data?.title;
  const description = errJson?.data?.description || errJson?.message || fallback;
  if (title) {
    showErrorToast(title, description);
    return;
  }
  showErrorToast(description || fallback);
};

const unwrapEntity = (json: any) => {
  if (!json || typeof json !== 'object') return json;
  if (json.data && typeof json.data === 'object' && ('active' in json.data || 'id' in json.data)) {
    return json.data;
  }
  return json;
};

const fetchEntity = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return unwrapEntity(await res.json().catch(() => null));
};

const isInactive = (entity: any) => entity && entity.active === false;

/** Trả về true nếu đã chặn và hiện toast — không được hiện CON. */
export const notifyIfCannotShowChild = async (
  typeLabel: string,
  name: string | null | undefined,
  item?: any
): Promise<boolean> => {
  const copy = getShowBlockedByParentCopy(typeLabel, name);
  if (isParentHidden(item) || isCriteriaFullyLocked(item)) {
    showErrorToast(copy.title, copy.description);
    return true;
  }

  try {
    const businessId = item?.businessId;
    const categoryId = item?.categoryId || item?.productCategoryId;
    const groupId = item?.groupId || item?.productGroupId;

    if (businessId) {
      const business = await fetchEntity(`${BASE_URL}/business/${businessId}`);
      if (isInactive(business)) {
        showErrorToast(copy.title, copy.description);
        return true;
      }
    }
    if (categoryId) {
      const category = await fetchEntity(`${BASE_URL}/product-category/${categoryId}`);
      if (category && (category.active === false || category.groupActive === false)) {
        showErrorToast(copy.title, copy.description);
        return true;
      }
      if (category?.groupId) {
        const group = await fetchEntity(`${BASE_URL}/product-groups/${category.groupId}`);
        if (isInactive(group)) {
          showErrorToast(copy.title, copy.description);
          return true;
        }
      }
    }
    if (groupId) {
      const group = await fetchEntity(`${BASE_URL}/product-groups/${groupId}`);
      if (isInactive(group)) {
        showErrorToast(copy.title, copy.description);
        return true;
      }
    }
  } catch {
    // ignore network errors here; caller still hits update API
  }
  return false;
};
