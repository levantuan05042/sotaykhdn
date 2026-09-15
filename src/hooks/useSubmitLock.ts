import { useCallback, useRef, useState } from 'react';

export type SubmitKind = 'draft' | 'submit';

export const draftActionLabel = (isSubmitting: boolean, kind?: string | null) =>
  isSubmitting && (kind === 'draft' || kind === 'DRAFT' || kind === 'NEEDS_REVISION')
    ? 'Đang lưu...'
    : 'Lưu nháp';

export const submitActionLabel = (isSubmitting: boolean, kind?: string | null) =>
  isSubmitting && (kind === 'submit' || kind === 'PENDING_APPROVAL')
    ? 'Đang gửi...'
    : 'Gửi phê duyệt';

/** Synchronous lock so a second click cannot start another API call in the same tick. */
export function useSubmitLock() {
  const lockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitKind, setSubmitKind] = useState<SubmitKind | null>(null);

  const beginSubmit = useCallback((kind: SubmitKind = 'submit') => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setSubmitKind(kind);
    setIsSubmitting(true);
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    lockRef.current = false;
    setSubmitKind(null);
    setIsSubmitting(false);
  }, []);

  return { isSubmitting, submitKind, beginSubmit, endSubmit };
}
