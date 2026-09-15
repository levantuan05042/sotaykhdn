import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import CharCountHint from './CharCountHint';

const EMPTY_HTML = '<p><br></p>';
const DEBOUNCE_MS = 280;

export const formatDetailHtml = (val?: string): string => {
  if (!val || !val.trim()) return '';
  // Tránh regex [\s\S]* trên LOB lớn (chậm / backtracking)
  if (/<[a-z]/i.test(val)) {
    return val;
  }
  const normalized = val.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  let end = lines.length - 1;
  while (end >= start && !lines[end].trim()) end--;
  if (start > end) return '';

  return lines
    .slice(start, end + 1)
    .map((line) => {
      if (!line.trim()) return EMPTY_HTML;
      let spaces = 0;
      let tabs = 0;
      let idx = 0;
      while (idx < line.length) {
        const c = line.charAt(idx);
        if (c === '\t') {
          tabs++;
          idx++;
        } else if (c === ' ' || c === '\u00A0') {
          spaces++;
          idx++;
        } else break;
      }
      const indent = Math.min(8, tabs + Math.floor(spaces / 2));
      const content = line
        .substring(idx)
        .trimEnd()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/  /g, ' &nbsp;');
      if (indent > 0) {
        return `<p class="ql-indent-${indent}" style="padding-left: ${indent * 2}em;">${content}</p>`;
      }
      return `<p>${content}</p>`;
    })
    .join('');
};

/** Quill getText() luôn kết thúc bằng \\n — đếm ký tự hiển thị (vd. "tuấn" = 4). */
export const getQuillPlainLength = (quill: Quill) => Math.max(0, quill.getText().length - 1);

const normalizeOutgoingHtml = (html: string) => (html === EMPTY_HTML ? '' : html);

export type CriteriaQuillToolbarVariant = 'full' | 'compact';

export interface CriteriaQuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
  readOnly?: boolean;
  isRejected?: boolean;
  /** Chuẩn hoá value từ ngoài (plain text → HTML). Mặc định formatDetailHtml. */
  formatIncoming?: (val: string) => string;
  showCharCount?: boolean;
  charCountMax?: number;
  charCountError?: string | null;
  toolbarVariant?: CriteriaQuillToolbarVariant;
  minHeight?: number;
  fontSize?: number;
  borderRadius?: number;
}

/**
 * Quill tối ưu LOB (~100k ký tự):
 * - Debounce onChange → tránh re-render parent mỗi phím
 * - Không paste lại HTML khi đang focus (tránh dangerouslyPasteHTML trên document lớn)
 * - Đếm ký tự từ quill.getText() thay vì stripHtml regex trên HTML
 */
const CriteriaQuillEditor: React.FC<CriteriaQuillEditorProps> = ({
  value,
  onChange,
  placeholder,
  hasError,
  readOnly = false,
  isRejected = false,
  formatIncoming = formatDetailHtml,
  showCharCount = false,
  charCountMax,
  charCountError,
  toolbarVariant = 'full',
  minHeight = 120,
  fontSize = 15,
  borderRadius = 8,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const formatIncomingRef = useRef(formatIncoming);
  const focusedRef = useRef(false);
  const lastEmittedRef = useRef(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  onChangeRef.current = onChange;
  formatIncomingRef.current = formatIncoming;

  const clearDebounce = () => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const emitHtml = (html: string) => {
    const outgoing = normalizeOutgoingHtml(html);
    lastEmittedRef.current = outgoing;
    onChangeRef.current(outgoing);
  };

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;
    if (!readOnly && !toolbarRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung chi tiết...',
      modules: { toolbar: readOnly ? false : toolbarRef.current },
      readOnly,
    });
    quillRef.current = quill;

    const initial = formatIncomingRef.current(value || '');
    if (initial) {
      quill.clipboard.dangerouslyPasteHTML(initial);
      lastEmittedRef.current = normalizeOutgoingHtml(quill.root.innerHTML);
    }
    setLiveCount(getQuillPlainLength(quill));

    const root = quill.root;
    const onFocus = () => {
      focusedRef.current = true;
    };
    const onBlur = () => {
      focusedRef.current = false;
      clearDebounce();
      emitHtml(quill.root.innerHTML);
    };
    root.addEventListener('focus', onFocus);
    root.addEventListener('blur', onBlur);

    if (!readOnly) {
      quill.on('text-change', (_delta, _old, source) => {
        if (source !== 'user') return;
        // Chỉ đếm text (nhanh); serialize HTML khi debounce/blur để tránh lag LOB lớn
        setLiveCount(getQuillPlainLength(quill));
        clearDebounce();
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          emitHtml(quill.root.innerHTML);
        }, DEBOUNCE_MS);
      });
    }

    return () => {
      const hadPending = debounceTimerRef.current != null;
      clearDebounce();
      root.removeEventListener('focus', onFocus);
      root.removeEventListener('blur', onBlur);
      if (hadPending && quillRef.current) {
        lastEmittedRef.current = normalizeOutgoingHtml(quillRef.current.root.innerHTML);
        onChangeRef.current(lastEmittedRef.current);
      }
      quillRef.current = null;
    };
    // Chỉ init theo chế độ readOnly (toolbar mount khác nhau)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.enable(!readOnly);

    // Đang gõ: không paste lại (rất chậm với LOB lớn)
    if (focusedRef.current) return;

    const formatted = formatIncomingRef.current(value || '');
    const outgoing = normalizeOutgoingHtml(formatted);
    if (outgoing === lastEmittedRef.current) return;

    const cur = quill.root.innerHTML;
    if (formatted === cur || (outgoing === '' && cur === EMPTY_HTML)) {
      lastEmittedRef.current = outgoing;
      return;
    }

    quill.clipboard.dangerouslyPasteHTML(formatted || '');
    lastEmittedRef.current = normalizeOutgoingHtml(quill.root.innerHTML);
    setLiveCount(getQuillPlainLength(quill));
  }, [value, readOnly]);

  useEffect(() => () => clearDebounce(), []);

  const isDark = isRejected || readOnly;

  return (
    <div>
      <div
        style={{
          backgroundColor: isDark ? '#F9FAFB' : '#fff',
          borderRadius,
          border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB',
          boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          position: 'relative',
        }}
      >
        {!readOnly && (
          <div
            ref={toolbarRef}
            className="ql-toolbar ql-snow"
            style={{
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              padding: toolbarVariant === 'compact' ? '6px 10px' : '8px 12px',
              backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB',
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
            }}
          >
            <span className="ql-formats">
              <button type="button" className="ql-bold" title="In đậm (Bold)" />
              <button type="button" className="ql-italic" title="In nghiêng (Italic)" />
              <button type="button" className="ql-underline" title="Gạch chân (Underline)" />
              {toolbarVariant === 'full' && (
                <button type="button" className="ql-strike" title="Gạch ngang chữ (Strikethrough)" />
              )}
            </span>
            <span className="ql-formats">
              <button type="button" className="ql-list" value="ordered" title="Danh sách số (Numbered list)" />
              <button type="button" className="ql-list" value="bullet" title="Danh sách dấu chấm (Bullet list)" />
            </span>
            {toolbarVariant === 'full' && (
              <>
                <span className="ql-formats">
                  <button type="button" className="ql-script" value="sub" title="Chỉ số dưới (Subscript)" />
                  <button type="button" className="ql-script" value="super" title="Chỉ số trên (Superscript - m²)" />
                </span>
                <span className="ql-formats">
                  <button type="button" className="ql-indent" value="-1" title="Giảm thụt lề (Outdent)" />
                  <button type="button" className="ql-indent" value="+1" title="Tăng thụt lề (Indent)" />
                </span>
                <span className="ql-formats">
                  <select className="ql-color" title="Màu chữ" />
                  <select className="ql-background" title="Màu nền highlight" />
                </span>
                <span className="ql-formats">
                  <select className="ql-align" title="Căn lề văn bản" />
                </span>
                <span className="ql-formats">
                  <button type="button" className="ql-clean" title="Xóa toàn bộ định dạng" />
                </span>
              </>
            )}
          </div>
        )}
        <div
          ref={editorRef}
          style={{
            minHeight,
            fontSize,
            border: 'none',
            backgroundColor: isDark ? '#F9FAFB' : '#FFF',
            color: isDark ? '#374151' : '#1F2937',
            cursor: isDark ? 'not-allowed' : 'text',
            borderBottomLeftRadius: borderRadius,
            borderBottomRightRadius: borderRadius,
          }}
        />
      </div>
      {showCharCount && !readOnly && (
        <CharCountHint current={liveCount} max={charCountMax} error={charCountError} />
      )}
    </div>
  );
};

export default React.memo(CriteriaQuillEditor);
