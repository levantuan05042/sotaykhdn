import { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import toast from 'react-hot-toast';
import { BASE_URL } from '../config/apiConfig';
import { collectApiErrorMessages } from './apiError';
import { isCriteriaFullyLocked, isParentHidden } from './formatUtils';
import './appToast.css';

type ToastType = 'success' | 'error';
type ToastItem = { id: number; type: ToastType; title: string; description?: string; leaving?: boolean };

const TOAST_DURATION_MS = 2200;
const TOAST_LEAVE_MS = 180;

let toasts: ToastItem[] = [];
let seq = 1;
const subscribers = new Set<() => void>();
const autoHideTimers = new Map<number, number>();
const leaveTimers = new Map<number, number>();
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

const clearTimer = (map: Map<number, number>, id: number) => {
  const timer = map.get(id);
  if (timer) {
    window.clearTimeout(timer);
    map.delete(id);
  }
};

const dismissToast = (id: number) => {
  const current = toasts.find((t) => t.id === id);
  if (!current || current.leaving) return;
  clearTimer(autoHideTimers, id);
  clearTimer(leaveTimers, id);
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  notifySubscribers();
  leaveTimers.set(
    id,
    window.setTimeout(() => {
      leaveTimers.delete(id);
      toasts = toasts.filter((t) => t.id !== id);
      notifySubscribers();
    }, TOAST_LEAVE_MS)
  );
};

const pushToast = (type: ToastType, title: string, description?: string) => {
  ensureHost();
  toasts.filter((t) => !t.leaving).forEach((t) => dismissToast(t.id));
  const id = seq++;
  toasts = [...toasts, { id, type, title, description }];
  notifySubscribers();
  autoHideTimers.set(
    id,
    window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
  );
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
    <div className="app-toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div
          key={item.id}
          className={`app-toast app-toast--${item.type}${item.leaving ? ' is-leaving' : ''}`}
          role={item.type === 'error' ? 'alert' : 'status'}
        >
          <div className="app-toast-body">
            <div className="app-toast-icon" aria-hidden>
              {item.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
            </div>
            <div className="app-toast-copy">
              <div className="app-toast-title">{item.title}</div>
              {item.description ? <div className="app-toast-desc">{item.description}</div> : null}
            </div>
          </div>
          <button
            type="button"
            className="app-toast-close"
            aria-label="Đóng"
            onClick={() => dismissToast(item.id)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
};

export const showSuccessToast = (title: string) => {
  if (title?.trim()) pushToast('success', title.trim());
};

export const showErrorToast = (title: string, description?: string) => {
  if (title?.trim()) pushToast('error', title.trim(), description?.trim() || undefined);
};

export const showApiErrorToast = (error: any, fallback = 'Có lỗi xảy ra') => {
  const messages = collectApiErrorMessages(error);
  if (messages.length === 0) {
    showErrorToast(fallback);
    return;
  }
  showErrorToast(messages[0], messages.slice(1).join('\n') || undefined);
};

const toastMessageToText = (message: unknown): string => {
  if (typeof message === 'string') return message;
  if (message == null) return '';
  if (typeof message === 'object' && 'message' in (message as object)) {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === 'string') return nested;
  }
  return '';
};

let visibleToastsInstalled = false;

/** Đưa toast.success / toast.error ra portal trên body, không bị layout cắt mất. */
export const installVisibleToasts = () => {
  if (visibleToastsInstalled) return;
  visibleToastsInstalled = true;
  toast.success = ((message: unknown) => {
    showSuccessToast(toastMessageToText(message) || 'Thành công');
    return 'app-toast';
  }) as typeof toast.success;
  toast.error = ((message: unknown) => {
    showErrorToast(toastMessageToText(message) || 'Có lỗi xảy ra');
    return 'app-toast';
  }) as typeof toast.error;
};

export const PARENT_HIDDEN_DESCRIPTION =
  'Cấp cha đang ẩn. Vui lòng hiện cấp cha trước';

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
      description: 'Đang có sản phẩm hoặc danh mục sản phẩm 1 hoặc danh mục sản phẩm 2 con đang ở trạng thái lưu nháp, chờ duyệt hoặc chỉnh sửa',
    };
  }
  if (kind === 'category') {
    return {
      title: `Không thể ẩn danh mục sản phẩm 1 "${itemName}"`,
      description: 'Đang có sản phẩm hoặc danh mục sản phẩm 2 con đang ở trạng thái lưu nháp, chờ duyệt hoặc chỉnh sửa',
    };
  }
  return {
    title: `Không thể ẩn danh mục sản phẩm 2 "${itemName}"`,
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

const blockShowChild = (typeLabel: string, name: string | null | undefined): true => {
  const copy = getShowBlockedByParentCopy(typeLabel, name);
  showErrorToast(copy.title, copy.description);
  return true;
};

/** Trả về true nếu đã chặn và hiện toast — không được hiện CON. */
export const notifyIfCannotShowChild = async (
  typeLabel: string,
  name: string | null | undefined,
  item?: any
): Promise<boolean> => {
  if (isParentHidden(item) || isCriteriaFullyLocked(item)) {
    return blockShowChild(typeLabel, name);
  }

  try {
    const businessId = item?.businessId;
    const categoryId = item?.categoryId || item?.productCategoryId;
    const groupId = item?.groupId || item?.productGroupId;

    if (businessId) {
      const business = await fetchEntity(`${BASE_URL}/business/${businessId}`);
      if (isInactive(business)) return blockShowChild(typeLabel, name);
    }
    if (categoryId) {
      const category = await fetchEntity(`${BASE_URL}/product-category/${categoryId}`);
      if (category && (category.active === false || category.groupActive === false)) {
        return blockShowChild(typeLabel, name);
      }
      if (category?.groupId) {
        const group = await fetchEntity(`${BASE_URL}/product-groups/${category.groupId}`);
        if (isInactive(group)) return blockShowChild(typeLabel, name);
      }
    }
    if (groupId) {
      const group = await fetchEntity(`${BASE_URL}/product-groups/${groupId}`);
      if (isInactive(group)) return blockShowChild(typeLabel, name);
    }
  } catch {
    // ignore network errors here; caller still hits update API
  }
  return false;
};
