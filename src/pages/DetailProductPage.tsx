import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailGroupPage.css';
import './DetailProductPage.css';
import toast from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig';
import { getUserMap, getFullName } from '../utils/userUtils'; 
import { getRandomAvatar } from '../utils/avatarUtils';
import { CASCADE_LOCK_MESSAGE, isCascadeHidden, getActionConfirmDesc, isSameActor } from '../utils/formatUtils'; 
import {
  displaySuccessMessage,
  notifyIfCannotShowChild,
  showDisplayStatusFromApi,
  showSuccessToast,
} from '../utils/appToast'; 
import ProductInfoCard from '../components/ui/ProductInfoCard';
import StatusBadge2 from '../components/ui/StatusBadge2';
import ProductImageCard2 from '../components/ui/ProductImageCard2';
import ActionConfirmModal from '../components/ui/ActionConfirmModal';
import DuplicateVersionModal, { type PriorVersionInfo } from '../components/ui/DuplicateVersionModal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useDragAutoScroll } from '../hooks/useDragAutoScroll';
import VersionDetailModal from '../components/ui/VersionDetailModal';
import type { VersionItem } from '../components/ui/ProductInfoCard';
import { getCriteriaMaxLength, getCriteriaValueError, getFirstCriteriaValueError, isProductNameCriteria, stripHtmlText } from '../utils/fieldValidation';
import CharCountHint from '../components/ui/CharCountHint';

interface Criterion {
  id: string;
  name: string;
  code?: string;
  isRequired: boolean;
  isSelected: boolean;
  value: string;
}

interface PixelCrop {
  x: number; y: number; width: number; height: number;
}

const normalizeHtmlForDiff = (html?: string | null) => {
  if (!html) return '';
  let s = html.trim();
  if (s === '<p><br></p>' || s === '<br>' || s === '<p></p>') return '';
  const singleP = /^<p>(.*?)<\/p>$/i.exec(s);
  if (singleP && !/<[a-z][\s\S]*>/i.test(singleP[1])) {
    s = singleP[1].trim();
  }
  return s;
};

const serializeCriteriaForDiff = (list: Criterion[]) =>
  JSON.stringify(
    list
      .filter(c => c.isSelected)
      .map(c => ({
        id: c.id,
        name: c.name.trim(),
        value: normalizeHtmlForDiff(c.value),
      }))
  );

const isHtmlEmpty = (html: string) => {
  if (!html) return true;
  return html.replace(/<[^>]*>?/gm, '').trim().length === 0 && !html.includes('<img');
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const checkIsRequired = (item: any) => {
  if (item.isRequired === true || item.isRequired === 'true') return true;
  if (item.required   === true || item.required   === 'true') return true;
  if (item.isRequire  === true || item.isRequire  === 'true') return true;
  if (item.batBuoc    === true || item.batBuoc    === 'true') return true;
  const t1 = String(item.tieuChi || item.name  || '');
  const t2 = String(item.noiDung || item.value || '');
  return t1.includes('(*)') || t2.includes('(*)');
};

export const formatDetailHtml = (val?: string): string => {
  if (!val || !val.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(val)) {
    return val;
  }
  const normalized = val.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  let end = lines.length - 1;
  while (end >= start && !lines[end].trim()) end--;
  if (start > end) return '';

  return lines.slice(start, end + 1).map(line => {
    if (!line.trim()) return '<p><br></p>';
    let spaces = 0;
    let tabs = 0;
    let idx = 0;
    while (idx < line.length) {
      const c = line.charAt(idx);
      if (c === '\t') { tabs++; idx++; }
      else if (c === ' ' || c === '\u00A0') { spaces++; idx++; }
      else break;
    }
    const indent = Math.min(8, tabs + Math.floor(spaces / 2));
    const content = line.substring(idx).trimEnd()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/  /g, ' &nbsp;');
    if (indent > 0) {
      return `<p class="ql-indent-${indent}" style="padding-left: ${indent * 2}em;">${content}</p>`;
    }
    return `<p>${content}</p>`;
  }).join('');
};

const buildMergedCriteria = (catalogItems: any[], savedDetails: any[] = []): Criterion[] => {
  const catalog: Criterion[] = (catalogItems || []).map((item: any) => {
    const name = (item.tieuChi || item.name || '').replace(/\s*\(\*\)/g, '').trim();
    return {
      id: String(item.id || item.criteriaId),
      name,
      code: item.code || item.maTieuChi || '',
      isRequired: checkIsRequired(item),
      isSelected: false,
      value: '',
    };
  });

  if (!savedDetails || savedDetails.length === 0) {
    return catalog.map(c => ({
      ...c,
      isSelected: c.isRequired,
      value: '',
    }));
  }

  const merged: Criterion[] = [];
  const usedCatalogIds = new Set<string>();
  const usedCatalogNames = new Set<string>();

  for (const s of savedDetails) {
    const sId = String(s.id || s.criteriaId || '');
    const sName = String(s.tieuChi || s.name || '').replace(/\s*\(\*\)/g, '').trim();
    const sVal = formatDetailHtml(String(s.noiDung ?? s.value ?? ''));
    const fromCatalog = catalog.find(c =>
      (sId && c.id === sId) || (sName && c.name.toLowerCase() === sName.toLowerCase())
    );
    const id = fromCatalog?.id || sId;
    const name = fromCatalog?.name || sName;
    merged.push({
      id,
      name,
      code: fromCatalog?.code || s.code || s.maTieuChi || '',
      isRequired: fromCatalog?.isRequired ?? checkIsRequired(s),
      isSelected: true,
      value: sVal,
    });
    if (fromCatalog) {
      usedCatalogIds.add(fromCatalog.id);
      usedCatalogNames.add(fromCatalog.name.toLowerCase());
    }
  }

  for (const c of catalog) {
    if (usedCatalogIds.has(c.id) || usedCatalogNames.has(c.name.toLowerCase())) continue;
    merged.push({
      ...c,
      isSelected: false,
      value: '',
    });
  }

  return merged;
};

const toDisplayUrl = (raw: string) => {
  if (!raw) return '';
  if (raw.startsWith('blob:')) return raw;
  const cleanBaseUrl = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';
  if (raw.startsWith('http')) {
    if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
      try {
        const urlObj = new URL(raw);
        return `${cleanBaseUrl}${urlObj.pathname}`;
      } catch (e) {
        return raw;
      }
    }
    return raw;
  }

  let cleanPath = raw;
  if (!raw.startsWith('/')) {
    cleanPath = raw.includes('files/') ? `/${raw}` : `/files/products/${raw}`;
  } else if (!raw.includes('/files/')) {
    cleanPath = `/files/products${raw}`;
  }

  return `${cleanBaseUrl}${cleanPath}`;
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = reject;
  });

const getCroppedBlob = async (src: string, px: PixelCrop): Promise<Blob> => {
  const img    = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width  = px.width;
  canvas.height = px.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92));
};

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, blobUrl: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'drop' | 'crop'>('drop');
  const [dataUrl, setDataUrl] = useState('');        
  const [fileName, setFileName] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  

  useEffect(() => {
    if (isOpen) {
      setStep('drop');
      setDataUrl('');
      setFileName('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (PNG, JPG, WEBP)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onCropComplete = useCallback((_: any, px: PixelCrop) => {
    setCroppedAreaPixels(px);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedBlob(dataUrl, croppedAreaPixels);
      const file = new File([blob], fileName || 'cropped.jpg', { type: 'image/jpeg' });
      onConfirm(file, URL.createObjectURL(blob));
    } catch (e) {
      console.error('Crop error:', e);
      toast.error('Cắt ảnh thất bại, vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            {step === 'crop' ? 'Căn chỉnh & Cắt ảnh (16:9)' : 'Thêm hình ảnh'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'drop' && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `1.5px dashed ${isDragging ? '#10B981' : '#E5E7EB'}`, borderRadius: '8px', padding: '40px 20px', textAlign: 'center', backgroundColor: isDragging ? '#F0FDF4' : 'transparent', transition: 'all 0.2s ease', cursor: 'pointer' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p style={{ margin: '12px 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
              <span style={{ color: '#10B981', fontWeight: 600, fontSize: '15px' }}>Chọn file</span>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
            </div>
          )}

          {step === 'crop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                <Cropper
                  image={dataUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                  style={{
                    containerStyle: { backgroundColor: '#1a1a1a' },
                    cropAreaStyle:  { border: '2px solid rgba(255,255,255,0.88)', color: 'rgba(0,0,0,0.55)' },
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                <span style={{ fontSize: '14px', color: '#4B5563', fontWeight: 500, minWidth: '70px' }}>Thu phóng:</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  onChange={e => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#AE1C3F', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStep('drop');
                    setDataUrl('');
                    setFileName('');
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}
                >
                  Chọn ảnh khác
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#E5E7EB', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={step === 'drop' || !dataUrl || isProcessing}
            style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#AE1C3F', color: 'white', fontWeight: 600, fontSize: '14px', cursor: (step === 'drop' || !dataUrl || isProcessing) ? 'not-allowed' : 'pointer', opacity: (step === 'drop' || !dataUrl || isProcessing) ? 0.5 : 1 }}
          >
            {isProcessing ? 'Đang xử lý...' : 'Cắt & Tải lên'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
};

interface BatchApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (requestId: string, status: string) => void;
  requestId: string;
  requestName: string;
}

const BatchApprovalModal: React.FC<BatchApprovalModalProps> = ({ isOpen, onClose, onSubmitBatch, requestId, requestName }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onSubmitBatch(requestId, 'PENDING_APPROVAL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '440px', maxWidth: '95vw', padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
        
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEFCE8', border: '8px solid #FEFDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 0 4px #FEF9C3' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 500, color: '#111827', textAlign: 'center', lineHeight: '1.5' }}>
          Bạn muốn gửi Phê duyệt <span style={{ color: '#AE1C3F', fontWeight: 600 }}>{requestName || 'Tên yêu cầu'}</span>
        </p>
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#AE1C3F', color: 'white', fontWeight: 600, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Đang xử lý...' : 'Phê duyệt'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
  readOnly?: boolean;
  isRejected?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError, readOnly, isRejected }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef  = useRef<HTMLDivElement>(null);
  const quillRef   = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;
    if (!readOnly && !toolbarRef.current) return;
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung chi tiết...',
      modules: { toolbar: readOnly ? false : toolbarRef.current },
      readOnly: readOnly,
    });
    quillRef.current = quill;
    if (value) quill.clipboard.dangerouslyPasteHTML(formatDetailHtml(value));
    
    if (!readOnly) {
      quill.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
        if (source !== 'user') return;
        const h = quill.root.innerHTML;
        onChange(h === '<p><br></p>' ? '' : h);
      });
    }
    return () => { quillRef.current = null; };
  }, [readOnly]);

  useEffect(() => {
    if (!quillRef.current) return;
    quillRef.current.enable(!readOnly);
    const cur = quillRef.current.root.innerHTML;
    const formatted = formatDetailHtml(value);
    if (formatted !== cur && !(formatted === '' && cur === '<p><br></p>'))
      quillRef.current.clipboard.dangerouslyPasteHTML(formatted || '');
  }, [value, readOnly]);

  const isDark = isRejected || readOnly;

  return (
    <div style={{ backgroundColor: isDark ? '#F9FAFB' : '#fff', borderRadius: 8, border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB', boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none', transition: 'all 0.2s ease', position: 'relative' }}>
      {!readOnly && (
        <div ref={toolbarRef} className="ql-toolbar ql-snow" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '8px 12px', backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <span className="ql-formats">
            <button className="ql-bold" title="In đậm (Bold)" />
            <button className="ql-italic" title="In nghiêng (Italic)" />
            <button className="ql-underline" title="Gạch chân (Underline)" />
            <button className="ql-strike" title="Gạch ngang chữ (Strikethrough)" />
          </span>
          <span className="ql-formats">
            <button className="ql-list" value="ordered" title="Danh sách số (Numbered list)" />
            <button className="ql-list" value="bullet" title="Danh sách dấu chấm (Bullet list)" />
          </span>
          <span className="ql-formats">
            <button className="ql-script" value="sub" title="Chỉ số dưới (Subscript)" />
            <button className="ql-script" value="super" title="Chỉ số trên (Superscript - m²)" />
          </span>
          <span className="ql-formats">
            <button className="ql-indent" value="-1" title="Giảm thụt lề (Outdent)" />
            <button className="ql-indent" value="+1" title="Tăng thụt lề (Indent)" />
          </span>
          <span className="ql-formats">
            <select className="ql-color" title="Màu chữ" />
            <select className="ql-background" title="Màu nền highlight" />
          </span>
          <span className="ql-formats">
            <select className="ql-align" title="Căn lề văn bản" />
          </span>
          <span className="ql-formats">
            <button className="ql-clean" title="Xóa toàn bộ định dạng" />
          </span>
        </div>
      )}
      <div ref={editorRef} style={{ minHeight: 120, fontSize: 15, border: 'none', backgroundColor: isDark ? '#F9FAFB' : '#FFF', color: isDark ? '#374151' : '#1F2937', cursor: isDark ? 'not-allowed' : 'text', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}/>
    </div>
  );
};

const CriteriaModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  criteria: Criterion[]; onToggle: (id: string) => void;
}> = ({ isOpen, onClose, criteria, onToggle }) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCriteria = criteria.filter(c => 
    (!c.isSelected || !c.isRequired) && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Thêm tiêu chí</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <input
            type="text"
            placeholder="Tìm tiêu chí..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
            autoFocus
          />
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: 250, padding: '8px 0' }}>
          {filteredCriteria.length > 0 ? (
            filteredCriteria.map(c => (
              <div key={c.id} onClick={() => onToggle(c.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', backgroundColor: c.isSelected ? '#FDF2F4' : 'transparent', transition: 'background-color 0.2s', borderBottom: '1px solid #F3F4F6' }}
                className="figma-option-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: c.isSelected ? 500 : 400, color: c.isSelected ? '#111827' : '#374151', userSelect: 'none' }}>{c.name}</span>
                  {c.isRequired && <span style={{ color: '#EF4444', fontSize: 13, fontWeight: 500 }}>(*) Bắt buộc</span>}
                </div>
                {c.isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1.33334 6.00001L5.33334 10L14.6667 1.33334" stroke="#AE1C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Không tìm thấy tiêu chí nào</div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const userMap = useMemo(() => getUserMap(), []);

  const groupRef     = useRef<HTMLDivElement>(null);
  const categoryRef  = useRef<HTMLDivElement>(null);
  const operationRef = useRef<HTMLDivElement>(null);
  const statusRef    = useRef<HTMLDivElement>(null);
  
  const lastLoadedProductIdRef = useRef<string | null>(null);

  const [isGroupOpen,       setIsGroupOpen]       = useState(false);
  const [isCategoryOpen,    setIsCategoryOpen]    = useState(false);
  const [isOperationOpen,   setIsOperationOpen]   = useState(false);
  const [isStatusOpen,      setIsStatusOpen]      = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [showImageModal,    setShowImageModal]    = useState(false);
  const [showBatchModal,    setShowBatchModal]    = useState(false);
  const [showDeleteModal,   setShowDeleteModal]   = useState(false);

  const [groupSearch, setGroupSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [operationSearch, setOperationSearch] = useState('');

  const [groupOptions,     setGroupOptions]     = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions,  setCategoryOptions]  = useState<{ label: string; value: string }[]>([]);
  const [operationOptions, setOperationOptions] = useState<{ label: string; value: string }[]>([]);

  const [loading,           setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [isActive,    setIsActive]    = useState(true);
  const [formData,    setFormData]    = useState({ productGroupId: '', productCategoryId: '', businessId: '' });

  const [criteria,         setCriteria]         = useState<Criterion[]>([]);
  const [originalCriteria, setOriginalCriteria] = useState<Criterion[]>([]);

  const [previewImage, setPreviewImage] = useState('');   
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null); 
  const [imageRemoved, setImageRemoved] = useState(false); 

  const getCurrentUsername = () => {
    const possibleKeys = ['currentUserUsername', 'username', 'userCode', 'userId', 'account', 'user', 'userInfo', 'currentUser'];
    for (const key of possibleKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (typeof parsed === 'object' && parsed !== null) {
            const u = parsed.username || parsed.userName || parsed.code || parsed.sub || parsed.userCode || parsed.id;
            if (u) return String(u).trim().toLowerCase();
          }
        } catch {
          return String(val).trim().toLowerCase();
        }
      }
    }
    return '';
  };
  
  const [confirmAction, setConfirmAction] = useState<'ARCHIVED' | 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL' | 'NEEDS_REVISION' | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [priorConflict, setPriorConflict] = useState<PriorVersionInfo | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string | null>(null);
  const [isDeletingPrior, setIsDeletingPrior] = useState(false);
  const [previewVersionItem, setPreviewVersionItem] = useState<VersionItem | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  const findPriorConflictVersion = () => {
    if (!productData?.versions || productData.versions.length <= 1) return null;
    return productData.versions.find(
      (v: any) => v.id !== id && (v.status === 'DRAFT' || v.status === 'PENDING_APPROVAL' || v.status === 'NEEDS_REVISION')
    ) || null;
  };

  const onSaveDraftClick = (status: 'DRAFT' | 'NEEDS_REVISION') => {
    if (isReadOnly || !id || submittingRef.current || isSubmitting) return;
    const criteriaErr = getFirstCriteriaValueError(criteria);
    if (criteriaErr) {
      toast.error(criteriaErr, { position: 'top-center' });
      return;
    }
    const conflict = findPriorConflictVersion();
    if (conflict) {
      setPriorConflict(conflict);
      setPendingTargetStatus(status);
      setShowDuplicateModal(true);
      return;
    }
    setConfirmAction(status);
  };

  const handleApproveClick = () => {
    if (isReadOnly || !id || submittingRef.current || isSubmitting || confirmAction) return;
    const gid = formData.productGroupId || productData?.productGroupId;
    if (!gid) {
      toast.error('Vui lòng chọn Nhóm sản phẩm', { position: 'top-center' });
      return;
    }
    const missingUnselectedRequired = criteria.filter(c => c.isRequired && !c.isSelected);
    if (missingUnselectedRequired.length > 0) {
      toast.error(`Phiên bản mới yêu cầu bổ sung tiêu chí bắt buộc: ${missingUnselectedRequired.map(c => c.name).join(', ')}`, { position: 'top-center' });
      return;
    }
    const missingRequiredCriterion = criteria.find(c => c.isRequired && c.isSelected && isHtmlEmpty(c.value));
    if (missingRequiredCriterion) {
      toast.error(`Vui lòng nhập nội dung cho tiêu chí bắt buộc mới: ${missingRequiredCriterion.name}`, { position: 'top-center' });
      return;
    }
    const criteriaErr = getFirstCriteriaValueError(criteria);
    if (criteriaErr) {
      toast.error(criteriaErr, { position: 'top-center' });
      return;
    }
    const productStatus = String(productData?.status || '').toUpperCase();
    const requestStatus = String(
      productData?.requestStatus || productData?.productRequest?.status || ''
    ).toUpperCase();
    const batchAlreadyApproved = requestStatus === 'ACTIVE' || requestStatus === 'COMPLETED';
    const isBatch = Boolean(productData?.requestId || productData?.batchRequestId);
    // Lô đã duyệt / sản phẩm đã duyệt: tạo phiên bản mới như sản phẩm lẻ, không gửi lại cả lô
    if (isBatch && productStatus !== 'ACTIVE' && productStatus !== 'ARCHIVED' && !batchAlreadyApproved) {
      setShowBatchModal(true);
      return;
    }
    const conflict = findPriorConflictVersion();
    if (conflict) {
      setPriorConflict(conflict);
      setPendingTargetStatus('PENDING_APPROVAL');
      setShowDuplicateModal(true);
      return;
    }
    setConfirmAction('PENDING_APPROVAL');
  };

  let rawCurrentUsername = getCurrentUsername();
  const currentUsername = rawCurrentUsername ? rawCurrentUsername.split('_')[0].toLowerCase() : '';
  const isLoggedIn = Boolean(currentUsername);

  const creatorField = productData?.createdBy || productData?.created_by || productData?.creator || productData?.user || productData?.userId;
  let rawCreatorUsername = '';
  if (typeof creatorField === 'object' && creatorField !== null) {
    rawCreatorUsername = (creatorField.username || creatorField.userName || creatorField.name || creatorField.code || creatorField.id || '').trim().toLowerCase();
  } else if (creatorField !== undefined && creatorField !== null) {
    rawCreatorUsername = String(creatorField).trim().toLowerCase();
  }
  const creatorUsername = rawCreatorUsername ? rawCreatorUsername.split('_')[0] : '';

  const isOwner = Boolean(isLoggedIn && currentUsername && creatorUsername && currentUsername === creatorUsername);
  const normalizedStatus = String(productData?.status || '').toUpperCase();
  const isPendingApproval = normalizedStatus === 'PENDING_APPROVAL' || normalizedStatus === 'PENDING';
  const isRejected = normalizedStatus === 'REJECTED';
  const isProductActive = normalizedStatus === 'ACTIVE' || normalizedStatus === 'APPROVED' || normalizedStatus === 'COMPLETED';
  const isDraft = normalizedStatus === 'DRAFT';
  const isNeedsRevision = normalizedStatus === 'NEEDS_REVISION' || normalizedStatus === 'REVISION';

  // Chỉ hiển thị thông báo tiêu chí mới ở các trạng thái: Đã duyệt, Lưu nháp, Yêu cầu chỉnh sửa (trạng thái Chờ duyệt không hiển thị)
  const canShowNewCriteriaNotice = (isProductActive || isDraft || isNeedsRevision) && !isPendingApproval;
  
  // Khi sản phẩm có trạng thái = ACTIVE (đã duyệt) thì không còn phân biệt ai là người tạo, người xem
  const hasEditPermission = isOwner || isProductActive;
  
  const isCascadeLocked = isCascadeHidden(productData);
  const isReadOnly = !isLoggedIn || !hasEditPermission || isPendingApproval || isRejected || isCascadeLocked;
  
  const showPermissionBanner = isCascadeLocked || (!isLoggedIn) || (!hasEditPermission && !isPendingApproval && !isRejected);

  const getCreatorDisplayName = () => {
    if (productData?.createdByFullName) return productData.createdByFullName;
    const username = productData?.createdBy || productData?.createdByUsername || creatorUsername;
    if (username) {
      const baseId = username.split('_')[0];
      const mapped = getFullName(baseId, userMap) || getFullName(username, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) {
        return mapped; 
      }
      return baseId.toUpperCase();
    }
    
    return '---';
  };

  const getApproverDisplayName = () => {
    if (productData?.approvedByFullName) return productData.approvedByFullName;
    if (productData?.approvedBy && productData?.approvedBy === productData?.createdBy && productData?.createdByFullName) {
      return productData.createdByFullName;
    }
    const approverVal = productData?.approvedBy || productData?.reviewer;
    if (approverVal) {
      const baseId = String(approverVal).split('_')[0];
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) return mapped;
      return baseId.toUpperCase();
    }
    return '---';
  };

  useEffect(() => {
    if (productData?.imageUrl) setPreviewImage(toDisplayUrl(productData.imageUrl));
  }, [productData?.imageUrl]);

  useEffect(() => {
    if (productData?.imageUrl) {
      setPreviewImage(productData.imageUrl);
    }
  }, [productData?.imageUrl]);

  useEffect(() => {
    return () => { if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage); };
  }, [previewImage, avatarFile]);

  const handleImageConfirm = (file: File, blobUrl: string) => {
    if (isReadOnly) return;

    setAvatarFile(file);
    setPreviewImage(blobUrl);
    setImageRemoved(false);
    setShowImageModal(false);
  };

  const handleRemoveImage = () => {
    if (isReadOnly) return;
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(null);
    setPreviewImage('');
    setImageRemoved(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(API_ENDPOINTS.FILES.UPLOAD, fd);
      return response.data.url; 
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      throw new Error('Upload ảnh lên hệ thống thất bại');
    }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (groupRef.current     && !groupRef.current.contains(e.target as Node))     setIsGroupOpen(false);
      if (categoryRef.current  && !categoryRef.current.contains(e.target as Node))  setIsCategoryOpen(false);
      if (operationRef.current && !operationRef.current.contains(e.target as Node)) setIsOperationOpen(false);
      if (statusRef.current    && !statusRef.current.contains(e.target as Node))    setIsStatusOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!id) return;
      lastLoadedProductIdRef.current = null;
      try {
        setLoading(true);
        const [pRes, gRes] = await Promise.all([
          axios.get(API_ENDPOINTS.PRODUCT.DETAIL(id)),
          axios.get(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`),
        ]);
        const pData = pRes.data;
        setProductData(pData);
        setIsActive(pData.active ?? true);
        setFormData({
          productGroupId:    pData.productGroupId    || '',
          productCategoryId: pData.productCategoryId || '',
          businessId:        pData.businessId        || '',
        });
        if (gRes.data) {
          const rawGroups = Array.isArray(gRes.data) ? gRes.data : (gRes.data?.content || gRes.data?.data || []);
          setGroupOptions(rawGroups.map((g: any) => ({ label: g.name, value: g.id })));
        }

        // Tải tiêu chí catalog của nhóm sản phẩm ngay tại init để đồng bộ tức thì, tránh race condition
        let catalogData: any[] = [];
        if (pData.productGroupId) {
          try {
            const critRes = await axios.get(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
              params: { types: pData.productGroupId, status: 'ACTIVE', active: true }
            });
            const critBody = critRes.data;
            catalogData = Array.isArray(critBody) ? critBody : (critBody?.content || critBody?.data || []);
          } catch (e) {
            console.error('Lỗi tải danh mục tiêu chí khi khởi tạo:', e);
          }
        }

        const merged = buildMergedCriteria(catalogData, pData.details || []);
        const selectedBaseline = merged.filter(c => c.isSelected);
        setOriginalCriteria(JSON.parse(JSON.stringify(selectedBaseline)));
        setCriteria(merged);
        lastLoadedProductIdRef.current = id;
      } catch (e) {
        console.error(e);
        toast.error('Không tìm thấy sản phẩm hoặc cấu trúc dữ liệu không khớp');
      } finally { 
        setLoading(false); 
      }
    };
    init();
  }, [id]);

  const isFormDirty     = formData.productGroupId !== (productData?.productGroupId || '') || formData.productCategoryId !== (productData?.productCategoryId || '') || formData.businessId !== (productData?.businessId || '');
  const isCriteriaDirty = serializeCriteriaForDiff(criteria) !== serializeCriteriaForDiff(originalCriteria);
  const isDirty         = isFormDirty || isCriteriaDirty || avatarFile !== null || imageRemoved || Boolean(isActive) !== Boolean(productData?.active ?? true);
  const { allowLeave, dialog } = useUnsavedChangesGuard(Boolean(!isReadOnly && isDirty));

  // Tự động cập nhật dữ liệu sản phẩm khi DB thay đổi nếu không đang chỉnh sửa dở dang
  useEffect(() => {
    if (!id) return;
    const refetchStatus = async () => {
      if (isDirty || isSubmitting) return;
      try {
        const pRes = await axios.get(API_ENDPOINTS.PRODUCT.DETAIL(id));
        if (pRes.data) {
          setProductData(pRes.data);
          setIsActive(pRes.data.active ?? true);
        }
      } catch (e) {}
    };

    const interval = setInterval(refetchStatus, 15000);
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetchStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [id, isDirty, isSubmitting]);

  useEffect(() => {
    if (!formData.productGroupId) { 
      setCategoryOptions([]); 
      setOperationOptions([]); 
      setCriteria([]);
      return; 
    }
    (async () => {
      try {
        setLoadingCategories(true);
        const res = await axios.get(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        const d = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.data || []);
        setCategoryOptions(d.map((c: any) => ({ label: c.name, value: c.id }))); 
      } catch (e) { console.error(e); } finally { setLoadingCategories(false); }
    })();
    (async () => {
      try {
        setLoadingOperations(true);
        const ep = API_ENDPOINTS.PRODUCT_BUSINESS?.LIST || API_ENDPOINTS.PRODUCT_GROUPS.LIST.replace('product-groups', 'business');
        const res = await axios.get(`${ep}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        const d = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.data || []);
        setOperationOptions(d.map((b: any) => ({ label: b.name, value: b.id }))); 
      } catch (e) { console.error(e); } finally { setLoadingOperations(false); }
    })();
    (async () => {
      // Nếu nhóm sản phẩm trùng nhóm ban đầu của sản phẩm vừa load, init() đã xử lý hoàn chỉnh
      if (productData?.productGroupId && formData.productGroupId === productData.productGroupId && lastLoadedProductIdRef.current === id) {
        return;
      }
      try {
        const res = await axios.get(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
          params: { types: formData.productGroupId, status: 'ACTIVE', active: true }
        });
        const resData = res.data;
        const data = Array.isArray(resData) ? resData : (resData?.content || resData?.data || []);

        const isSameGroup = Boolean(productData?.productGroupId && formData.productGroupId === productData.productGroupId);
        const savedDetails: any[] = isSameGroup
          ? (productData?.details && productData.details.length > 0 ? productData.details : originalCriteria)
          : [];

        const merged = buildMergedCriteria(data, savedDetails);
        setCriteria(merged);

        if (lastLoadedProductIdRef.current !== id && isSameGroup) {
          const selectedBaseline = merged.filter(c => c.isSelected);
          setOriginalCriteria(JSON.parse(JSON.stringify(selectedBaseline)));
          lastLoadedProductIdRef.current = id || null;
        }
      } catch (e) { 
        console.error('Lỗi tải danh sách tiêu chí:', e); 
      }
    })();
  }, [formData.productGroupId, productData?.productGroupId, id]);

  const missingRequiredCriteria = useMemo(() => {
    return criteria.filter(c => c.isRequired && !c.isSelected);
  }, [criteria]);

  const handleAddMissingRequiredCriteria = (criterionIds: string[]) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => criterionIds.includes(c.id) ? { ...c, isSelected: true } : c));
    toast.success('Đã bổ sung tiêu chí bắt buộc vào phiên bản này. Vui lòng nhập nội dung.', { position: 'top-center' });
    setTimeout(() => {
      const el = document.getElementById(`criterion-${criterionIds[0]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleCriterionValueChange = (id: string, v: string) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, value: v } : c));
  };

  const toggleCriterionSelection = (id: string) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.isRequired && c.isSelected) return c;
      return { ...c, isSelected: !c.isSelected };
    }));
  };

  const [draggedCriterionId, setDraggedCriterionId] = useState<string | null>(null);
  const [dragOverCriterionId, setDragOverCriterionId] = useState<string | null>(null);
  useDragAutoScroll(Boolean(draggedCriterionId));

  const moveCriterion = (draggedId: string, targetId: string) => {
    if (isReadOnly || draggedId === targetId) return;
    setCriteria(prev => {
      const selected = prev.filter(c => c.isSelected);
      const unselected = prev.filter(c => !c.isSelected);

      const dragIdx = selected.findIndex(c => c.id === draggedId);
      const targetIdx = selected.findIndex(c => c.id === targetId);
      if (dragIdx === -1 || targetIdx === -1) return prev;

      const reorderedSelected = [...selected];
      const [movedItem] = reorderedSelected.splice(dragIdx, 1);
      reorderedSelected.splice(targetIdx, 0, movedItem);

      return [...reorderedSelected, ...unselected];
    });
  };

  const handleUpdateProduct = async (status: 'ARCHIVED' | 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL' | 'NEEDS_REVISION') => {
    if (submittingRef.current || isReadOnly || !id) return;
    const criteriaErr = getFirstCriteriaValueError(criteria);
    if (criteriaErr) {
      toast.error(criteriaErr, { position: 'top-center' });
      return;
    }
    if (status !== 'ARCHIVED' && status !== 'ACTIVE' && status !== 'DRAFT') {
      if (!formData.productGroupId && !productData?.productGroupId) { toast.error('Vui lòng chọn Nhóm sản phẩm', { position: 'top-center' }); return; }
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    let succeeded = false;
    try {
      let finalImageUrl: string | null;
      if      (imageRemoved) { finalImageUrl = null; }
      else if (avatarFile)   { try { finalImageUrl = await uploadImage(avatarFile); } catch (e: any) { toast.error(e.message || 'Lỗi upload ảnh', { position: 'top-center' }); return; } }
      else                   { finalImageUrl = productData.imageUrl || null; }

      const payload = {
        name:              productData.name,
        productGroupId:    formData.productGroupId    || productData.productGroupId,
        productCategoryId: formData.productCategoryId || null,
        businessId:        formData.businessId        || null,
        active:            isActive,
        imageUrl:          finalImageUrl,
        status,
        criteria: criteria.filter(c => c.isSelected).map(c => ({ criteriaId: c.id, value: c.value.trim() })),
      };
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.PRODUCT.UPDATE(id), { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }, 
        body: JSON.stringify(payload) 
      });
      if (res.ok) {
        succeeded = true;
        const msgs: Record<string, string> = {
          DRAFT: 'Lưu nháp thành công', 
          ARCHIVED: 'Lưu trữ thành công',
          ACTIVE: 'Kích hoạt thành công',
          PENDING_APPROVAL: 'Gửi phê duyệt thành công',
          NEEDS_REVISION: 'Lưu nháp thành công',
        };
        renderCustomToast(msgs[status] || 'Cập nhật thành công');
        allowLeave();
        setConfirmAction(null);
        setTimeout(() => navigate('/products/processing'), 400);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Có lỗi xảy ra khi cập nhật sản phẩm', { position: 'top-center' });
      }
    } catch (e) { console.error(e); toast.error('Lỗi kết nối máy chủ', { position: 'top-center' }); }
    finally {
      if (!succeeded) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActive = async (newActiveStatus: boolean) => {
    if (newActiveStatus && await notifyIfCannotShowChild('Sản phẩm', productData?.name, productData)) {
      setIsStatusOpen(false);
      return;
    }
    if (!isLoggedIn || !hasEditPermission || isPendingApproval || isRejected || !id) return;
    setIsActive(newActiveStatus);
    setIsStatusOpen(false);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/products/${id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        showSuccessToast(displaySuccessMessage(newActiveStatus, 'Sản phẩm', productData?.name));
      } else {
        const err = await res.json();
        showDisplayStatusFromApi(err, 'Lỗi khi thay đổi trạng thái hiển thị');
        setIsActive(!newActiveStatus);
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối máy chủ khi đổi trạng thái hiển thị', { position: 'top-center' });
      setIsActive(!newActiveStatus);
    }
  };

  const handleBatchStatusSubmit = async (requestId: string, status: string) => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const targetRequestId = requestId || productData?.requestId || productData?.batchRequestId;
      
      if (!targetRequestId) {
          toast.error('Không tìm thấy thông tin lô!', { position: 'top-center' });
          return;
      }
      const targetRequestName = productData?.requestName || 'Tên yêu cầu'; 

      const response = await axios.post(
        `${BASE_URL}/product-requests/status/${targetRequestId}`,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );

      if (response.status === 200 || response.status === 204) {
        toast.success(`Gửi phê duyệt lô ${targetRequestName} thành công!`, { position: 'top-center' });
        setShowBatchModal(false);
        allowLeave();
        setTimeout(() => navigate('/products/processing'), 500);
      }
    } catch (error: any) {
      console.error('Lỗi gửi phê duyệt theo lô:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi phê duyệt theo lô', { position: 'top-center' });
    }
  };

  const handleDeleteProduct = () => {
    if (isReadOnly || !id) return;
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (submittingRef.current || isReadOnly || !id) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    let succeeded = false;
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.PRODUCT.DELETE(id), { 
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        succeeded = true;
        setShowDeleteModal(false);
        renderCustomToast('Xóa thành công'); 
        allowLeave();
        setTimeout(() => navigate('/products/processing'), 400); 
      } else {
        const e = await res.json();
        toast.error(e.message || 'Có lỗi xảy ra khi xóa', { position: 'top-center' });
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      if (!succeeded) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const renderCustomToast = (message: string) => {
    toast.custom(t => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-pill-container`}>
        <div className="toast-pill-content">
          <div className="toast-pill-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="toast-pill-text">{message}</span>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="toast-pill-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    ), { position: 'top-center' });
  };

  const getCleanProductName = (html: string) =>
    !html ? 'Chi tiết sản phẩm' :
    html.replace(/<\/?[^>]+(>|$)/g, '').replace(/^-\s*/, '').replace(/\(\*\)/g, '').trim() || 'Chi tiết sản phẩm';

  if (loading)      return <div className="loading">Đang tải dữ liệu sản phẩm...</div>;
  if (!productData) return <div className="error">Không tìm thấy dữ liệu sản phẩm phù hợp.</div>;

  const productNameBreadcrumb = getCleanProductName(productData.name);
  const activeRequestId = productData?.requestId || productData?.batchRequestId || 'Lô ABC';
  const requestName = productData?.requestName || 'Tên yêu cầu';
  const isStatusDisabled = !isLoggedIn || !hasEditPermission || isPendingApproval || isRejected || !isProductActive;

  return (
    <div className="pageWrapper">
      <style>{`.ql-editor{word-break:break-word!important;overflow-wrap:break-word!important;white-space:pre-wrap!important;}`}</style>

      <div className="mainContainer">
        {showPermissionBanner && (
          <div className="permissionBanner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="permissionBannerText">
              {isCascadeLocked
                ? CASCADE_LOCK_MESSAGE
                : !isLoggedIn
                  ? 'Vui lòng đăng nhập để thao tác.'
                  : 'Bạn đang xem ở chế độ chỉ đọc (Read-only) vì bạn không phải là người tạo sản phẩm này.'}
            </span>
          </div>
        )}

        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={() => navigate(-1)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.6667 6.83333H1M6.83333 1L1 6.83333L6.83333 12.6667" stroke="#3C393F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="breadcrumbText">Danh sách sản phẩm</span>
            </button>
            <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="breadcrumbActive breadcrumb-truncate" title={productNameBreadcrumb}>{productNameBreadcrumb}</span>
              <StatusBadge2 status={productData.status} />

              {/* Tag thông tin tiêu chí mới: Chỉ hiển thị ở trạng thái Đã duyệt, Lưu nháp, Yêu cầu chỉnh sửa */}
              {canShowNewCriteriaNotice && missingRequiredCriteria.length > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px 4px 14px',
                    borderRadius: 9999,
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: 13,
                    fontWeight: 500,
                    minHeight: 32,
                    boxSizing: 'border-box',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  title={`Nhóm sản phẩm đã bổ sung tiêu chí bắt buộc mới: ${missingRequiredCriteria.map(c => c.name).join(', ')}.`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#0284C7' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <span>Có tiêu chí mới (+{missingRequiredCriteria.length})</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddMissingRequiredCriteria(missingRequiredCriteria.map(c => c.id))}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 9999,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: 4,
                        transition: 'background-color 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#0369A1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#0284C7';
                      }}
                      title="Bổ sung tiêu chí mới vào sản phẩm này"
                    >
                      Bổ sung ngay
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRejected && (
              <>
                <button 
                  className="btnDraft" 
                  disabled 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button 
                  className="btnSubmit" 
                  disabled 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}
            {!isReadOnly && (
              <>
                {productData.status === 'DRAFT' && (<>
                  <button className="btnDraft" onClick={handleDeleteProduct} style={{ display: 'flex', padding: '8px 14px', alignItems: 'center', gap: 6, borderRadius: 8, background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontSize: 14, fontWeight: 600 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="17" viewBox="0 0 17 19" fill="none">
                      <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Xóa
                  </button>
                  <button className="btnDraft active" onClick={() => onSaveDraftClick('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Lưu nháp
                  </button>
                  <button className="btnSubmit active" onClick={handleApproveClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Gửi phê duyệt
                  </button>
                </>)}
                {isProductActive && (
                  <>
                    <button 
                      className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} 
                      disabled={!isDirty} 
                      onClick={() => onSaveDraftClick('DRAFT')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button 
                      className={`btnSubmit ${isDirty ? 'active' : 'disabled'}`} 
                      disabled={!isDirty} 
                      onClick={handleApproveClick}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}
                {productData.status === 'NEEDS_REVISION' && (<>
                  <button className="btnDraft active" onClick={() => onSaveDraftClick('NEEDS_REVISION')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Lưu nháp
                  </button>
                  <button className="btnSubmit active" onClick={handleApproveClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Gửi phê duyệt
                  </button>
                </>)}
                {productData.status === 'ARCHIVED' && (
                  <button className="btnRestore active" onClick={() => handleUpdateProduct('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Hoạt động trở lại
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="contentGrid">

          <div className="leftCol">
            {isRejected && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#991B1B',
                fontSize: '14px',
                fontWeight: 500
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Sản phẩm này đã bị <strong>Từ chối</strong> và ở chế độ chỉ xem, không thể chỉnh sửa.</span>
              </div>
            )}
            <div className="formCard">

              <div className="formGroup" style={{ marginBottom: 16 }}>
                <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                  Nhóm sản phẩm <span style={{ color: '#EF4444' }}>(*)</span>
                </label>
                <div className="custom-select-container" ref={groupRef}>
                  <div 
                    className={`select-custom ${isGroupOpen ? 'open' : ''} ${isReadOnly ? 'is-disabled' : ''}`} 
                    onClick={() => {
                      if (!isReadOnly) {
                        setIsGroupOpen(v => !v);
                        if (!isGroupOpen) setGroupSearch('');
                      }
                    }}
                    style={isReadOnly ? { cursor: 'not-allowed' } : undefined}
                  >
                    <span>{groupOptions.find(o => o.value === formData.productGroupId)?.label || 'Chọn nhóm'}</span>
                  </div>
                  {!isReadOnly && isGroupOpen && (
                    <div className="custom-options-list" style={{ padding: 0 }}>
                      <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                        <input
                          type="text"
                          placeholder="Tìm nhóm sản phẩm..."
                          value={groupSearch}
                          onChange={e => setGroupSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                          autoFocus
                        />
                      </div>
                      <div style={{ minHeight: '250px'}}>
                        {groupOptions.filter(o => o.label.toLowerCase().includes(groupSearch.toLowerCase())).map(o => (
                          <div key={o.value} className={`custom-option ${formData.productGroupId === o.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({ productGroupId: o.value, productCategoryId: '', businessId: '' }); setIsGroupOpen(false); setGroupSearch(''); }}>
                            {o.label}
                          </div>
                        ))}
                        {groupOptions.filter(o => o.label.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '8px 12px', color: '#6B7280', fontSize: '14px', textAlign: 'center' }}>Không tìm thấy kết quả</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Danh mục sản phẩm</label>
                  <div className="custom-select-container" ref={categoryRef}>
                    <div 
                      className={`select-custom ${isCategoryOpen ? 'open' : ''} ${(isReadOnly || !formData.productGroupId) ? 'is-disabled' : ''}`} 
                      onClick={() => {
                        if (!isReadOnly && formData.productGroupId) {
                          setIsCategoryOpen(v => !v);
                          if (!isCategoryOpen) setCategorySearch('');
                        }
                      }}
                      style={(isReadOnly || !formData.productGroupId) ? { cursor: 'not-allowed' } : undefined}
                    >
                      <span>{loadingCategories ? 'Đang tải...' : (categoryOptions.find(o => o.value === formData.productCategoryId)?.label || 'Chọn danh mục')}</span>
                    </div>
                    {!isReadOnly && isCategoryOpen && (
                      <div className="custom-options-list" style={{ padding: 0 }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                          <input
                            type="text"
                            placeholder="Tìm danh mục sản phẩm..."
                            value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                            autoFocus
                          />
                        </div>
                        <div style={{ minHeight: '250px'}}>
                          <div className="custom-option" onClick={() => { setFormData({ ...formData, productCategoryId: '', businessId: '' }); setIsCategoryOpen(false); setCategorySearch(''); }}><i>-- Bỏ chọn --</i></div>
                          {categoryOptions.filter(o => o.label.toLowerCase().includes(categorySearch.toLowerCase())).map(o => (
                            <div key={o.value} className={`custom-option ${formData.productCategoryId === o.value ? 'selected' : ''}`}
                              onClick={() => { setFormData({ ...formData, productCategoryId: o.value, businessId: '' }); setIsCategoryOpen(false); setCategorySearch(''); }}>{o.label}</div>
                          ))}
                          {categoryOptions.filter(o => o.label.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: '8px 12px', color: '#6B7280', fontSize: '14px', textAlign: 'center' }}>Không tìm thấy kết quả</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Nghiệp vụ</label>
                  <div className="custom-select-container" ref={operationRef}>
                    <div 
                      className={`select-custom ${isOperationOpen ? 'open' : ''} ${(isReadOnly || !formData.productCategoryId) ? 'is-disabled' : ''}`} 
                      onClick={() => {
                        if (!isReadOnly && formData.productCategoryId) {
                          setIsOperationOpen(v => !v);
                          if (!isOperationOpen) setOperationSearch('');
                        }
                      }}
                      style={(isReadOnly || !formData.productCategoryId) ? { cursor: 'not-allowed' } : undefined}
                    >
                      <span>{loadingOperations ? 'Đang tải...' : (operationOptions.find(o => o.value === formData.businessId)?.label || 'Chọn nghiệp vụ')}</span>
                    </div>
                    {!isReadOnly && isOperationOpen && (
                      <div className="custom-options-list" style={{ padding: 0 }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                          <input
                            type="text"
                            placeholder="Tìm nghiệp vụ..."
                            value={operationSearch}
                            onChange={e => setOperationSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                            autoFocus
                          />
                        </div>
                        <div style={{ minHeight: '250px'}}>
                          <div className="custom-option" onClick={() => { setFormData({ ...formData, businessId: '' }); setIsOperationOpen(false); setOperationSearch(''); }}><i>-- Bỏ chọn --</i></div>
                          {operationOptions.filter(o => o.label.toLowerCase().includes(operationSearch.toLowerCase())).map(o => (
                            <div key={o.value} className={`custom-option ${formData.businessId === o.value ? 'selected' : ''}`}
                              onClick={() => { setFormData({ ...formData, businessId: o.value }); setIsOperationOpen(false); setOperationSearch(''); }}>{o.label}</div>
                          ))}
                          {operationOptions.filter(o => o.label.toLowerCase().includes(operationSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: '8px 12px', color: '#6B7280', fontSize: '14px', textAlign: 'center' }}>Không tìm thấy kết quả</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CRITERIA LIST - HỖ TRỢ ĐỔI THỨ TỰ (CHỈ KÉO THẢ BẰNG ⠿) */}
              {criteria.filter(c => c.isSelected).map((criterion) => {
                const lengthErr = getCriteriaValueError(criterion.value, criterion.name, isProductNameCriteria(criterion.name, criterion.code));
                const hasErr = (!isReadOnly && criterion.isRequired && isHtmlEmpty(criterion.value)) || Boolean(lengthErr);
                const isDraggingThis = draggedCriterionId === criterion.id;
                const isDragOverThis = dragOverCriterionId === criterion.id && draggedCriterionId !== criterion.id;
                const isNewInThisVersion = criterion.isRequired && !originalCriteria.some(o => o.id === criterion.id);

                return (
                  <div
                    key={criterion.id}
                    id={`criterion-${criterion.id}`}
                    className="formGroup criterion-card"
                    onDragOver={(e) => {
                      if (isReadOnly) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverCriterionId !== criterion.id) {
                        setDragOverCriterionId(criterion.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverCriterionId === criterion.id) {
                        setDragOverCriterionId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (isReadOnly) return;
                      e.preventDefault();
                      if (draggedCriterionId && draggedCriterionId !== criterion.id) {
                        moveCriterion(draggedCriterionId, criterion.id);
                      }
                      setDraggedCriterionId(null);
                      setDragOverCriterionId(null);
                    }}
                    style={{
                      marginTop: 16,
                      marginBottom: 20,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 10,
                      border: isDragOverThis
                        ? '2px dashed #B01E3E'
                        : isNewInThisVersion
                        ? '1px solid #BAE6FD'
                        : '1px solid #E5E7EB',
                      borderLeft: isNewInThisVersion
                        ? '4px solid #0284C7'
                        : isDragOverThis
                        ? '2px dashed #B01E3E'
                        : '1px solid #E5E7EB',
                      padding: 16,
                      opacity: isDraggingThis ? 0.45 : 1,
                      transform: isDraggingThis ? 'scale(0.99)' : 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: isDragOverThis
                        ? '0 4px 12px rgba(176, 30, 62, 0.15)'
                        : isNewInThisVersion
                        ? '0 2px 10px rgba(2, 132, 199, 0.08)'
                        : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Drag handle - CHỈ CHO PHÉP KÉO KHI NHẤN GIỮ NÚT NÀY */}
                        {!isReadOnly && (
                          <div
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData('text/plain', criterion.id);
                              e.dataTransfer.effectAllowed = 'move';
                              const card = (e.currentTarget as HTMLElement).closest('.criterion-card') as HTMLElement;
                              if (card && e.dataTransfer.setDragImage) {
                                e.dataTransfer.setDragImage(card, 20, 20);
                              }
                              setDraggedCriterionId(criterion.id);
                            }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              setDraggedCriterionId(null);
                              setDragOverCriterionId(null);
                            }}
                            title="Nhấn giữ để kéo di chuyển tiêu chí"
                            style={{
                              cursor: 'grab',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6B7280',
                              padding: '4px',
                              borderRadius: 4,
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                              e.currentTarget.style.color = '#111827';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#6B7280';
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.cursor = 'grabbing';
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.cursor = 'grab';
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="5" r="2" />
                              <circle cx="9" cy="12" r="2" />
                              <circle cx="9" cy="19" r="2" />
                              <circle cx="15" cy="5" r="2" />
                              <circle cx="15" cy="12" r="2" />
                              <circle cx="15" cy="19" r="2" />
                            </svg>
                          </div>
                        )}

                        <label className="label" style={{ fontWeight: 600, margin: 0, fontSize: 14, color: '#1F2937' }}>
                          {criterion.name} {criterion.isRequired && <span style={{ color: '#EF4444' }}>(*)</span>}
                        </label>
                        {isNewInThisVersion && (
                          <span
                            style={{
                              backgroundColor: '#F0F9FF',
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                              fontSize: 11,
                              padding: '2px 9px',
                              borderRadius: 20,
                              fontWeight: 600,
                              userSelect: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Tiêu chí bắt buộc mới được bổ sung cho phiên bản này"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                            </svg>
                            Mới ở phiên bản này
                          </span>
                        )}
                      </div>

                      {!isReadOnly && !criterion.isRequired && (
                        <button
                          type="button"
                          onClick={() => toggleCriterionSelection(criterion.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                            marginLeft: 4,
                            transition: 'color 0.2s',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                          title="Bỏ tiêu chí này"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div draggable={false} onDragStart={(e) => e.stopPropagation()}>
                      <QuillEditor
                        value={criterion.value}
                        placeholder={criterion.isRequired ? 'Tiêu chí này bắt buộc phải nhập...' : 'Nhập nội dung chi tiết...'}
                        hasError={hasErr}
                        readOnly={isReadOnly}
                        isRejected={isRejected}
                        onChange={(v) => handleCriterionValueChange(criterion.id, v)}
                      />
                      <CharCountHint
                        current={stripHtmlText(criterion.value).length}
                        max={getCriteriaMaxLength(criterion.name, criterion.code)}
                        error={lengthErr}
                      />
                    </div>
                  </div>
                );
              })}

              {!isReadOnly && formData.productGroupId && (
                <div style={{ textAlign: 'left', marginTop: 16 }}>
                  <button onClick={() => setShowCriteriaModal(true)} style={{ color: '#10B981', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    + Thêm tiêu chí
                  </button>
                </div>
              )}
            </div>

            {/* ------- PHẦN CẬP NHẬT ẢNH MÔ TẢ ĐÚNG YÊU CẦU CỦA BẠN ------- */}
            <div
              className="product-image-card-container formGroup"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #F3F4F6',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: '20px 24px',
                boxSizing: 'border-box',
                width: '100%',
                marginBottom: '20px',
                marginTop: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Ảnh mô tả <span style={{ color: '#EF4444' }}>(*)</span>
                </h3>
              </div>

              {previewImage ? (
                <div 
                  className="product-image-wrapper" 
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    border: '1px solid #F3F4F6', 
                    borderRadius: '12px', 
                    backgroundColor: '#FAFAFA', 
                    padding: '32px 16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '160px', 
                    boxSizing: 'border-box'
                  }}
                >
                  <ProductImageCard2 imageUrl={previewImage} />
                  
                  {!isReadOnly && (
                    <div className="image-overlay">
                      <button 
                        type="button" 
                        className="overlay-btn" 
                        onClick={() => setShowImageModal(true)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      
                      <button 
                        type="button" 
                        className="overlay-btn" 
                        onClick={handleRemoveImage}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                !isReadOnly ? (
                  <button 
                    type="button" 
                    onClick={() => setShowImageModal(true)}
                    className="upload-placeholder"
                    style={{
                      width:'100%',
                      minHeight: '160px',
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'center',
                      justifyContent:'center',
                      border:'2px dashed #D1D5DB',
                      borderRadius:12,
                      background:'#F9FAFB',
                      cursor:'pointer',
                      color:'#6B7280',
                      transition:'all 0.2s',
                      padding: '32px 16px',
                      boxSizing: 'border-box'
                    }}
                    onMouseOver={e => {e.currentTarget.style.borderColor='#AE1C3F'; e.currentTarget.style.background='#FDF2F4';}}
                    onMouseOut={e => {e.currentTarget.style.borderColor='#D1D5DB'; e.currentTarget.style.background='#F9FAFB';}}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
                    <span style={{ color: '#10B981', fontWeight: 600, fontSize: '15px' }}>Chọn file</span>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
                  </button>
                ) : (
                  <div 
                    className="upload-placeholder-readonly"
                    style={{
                      width:'100%',
                      minHeight: '160px',
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'center',
                      justifyContent:'center',
                      border:'1px solid #F3F4F6',
                      borderRadius:12,
                      background:'#FAFAFA',
                      color:'#6B7280',
                      padding: '32px 16px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Chưa có ảnh</span>
                  </div>
                )
              )}
            </div>

          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'static' }}>
              
              <div className="formCard" style={{ borderRadius: 12, background: 'var(--Mauve-3, #F2EFF3)', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hoạt động</span>
                </div>
                <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                  <div 
                    className={`select-custom ${isStatusOpen ? 'open' : ''} ${isStatusDisabled ? 'is-disabled' : ''}`} 
                    onClick={() => !isStatusDisabled && setIsStatusOpen(v => !v)}
                    style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', cursor: isStatusDisabled ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box' }}
                  >
                    <span style={{ color: isStatusDisabled ? '#6B7280' : '#1A191B', fontWeight: 500 }}>{isActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                    {!isStatusDisabled && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M5 7.5L10 12.5L15 7.5"/>
                      </svg>
                    )}
                  </div>
                  {!isStatusDisabled && isStatusOpen && (
                    <div className="custom-options-list">
                      <div className={`custom-option ${isActive === false ? 'selected' : ''}`} onClick={() => handleToggleActive(false)}>Ẩn</div>
                      <div className={`custom-option ${isActive === true  ? 'selected' : ''}`} onClick={() => handleToggleActive(true)}>Hiển thị</div>
                    </div>
                  )}
                </div>
              </div>

              <ProductInfoCard
                creatorName={getCreatorDisplayName()}
                approverName={getApproverDisplayName()}
                createdAt={formatDateTime(productData?.createdAt)}
                version={productData?.version || 1}
                versions={productData?.versions || []}
                currentId={id}
                onSelectVersion={(v) => {
                  setPreviewVersionItem(v);
                  setShowVersionModal(true);
                }}
                showEngagementStats={normalizedStatus === 'ACTIVE'}
                viewCount={productData?.viewCount}
                savedCount={productData?.savedCount}
              />

              <div className="commentCard emptyComment">
                <div className="commentHeader">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="commentTitle">Bình luận phản hồi</span>
                </div>
                <div className="commentList">
                  {productData?.comments?.length > 0 ? (
                    productData.comments.map((c: any, i: number) => (
                      <React.Fragment key={c.id || i}>
                        <div className="commentItem">
                          <div className="userInfo">
                            <img src={c.avatarUrl || getRandomAvatar(c.createdBy || i)} className="avatar" alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div className="userHeader">
                                <span className="userName">{getFullName(c.createdBy, userMap) || 'Người kiểm duyệt'}</span>
                                <span className="commentDate">{formatDateTime(c.createdAt)}</span>
                              </div>
                              <p className="commentText">{c.comment}</p>
                            </div>
                          </div>
                        </div>
                        {i < productData.comments.length - 1 && <hr className="commentDivider"/>}
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="no-comments">Chưa có bình luận hay phản hồi nào cho sản phẩm này.</div>
                  )}
                </div>
              </div>
          </div>

        </div>
      </div>

      <CriteriaModal
        isOpen={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        criteria={criteria}
        onToggle={toggleCriterionSelection}
      />

      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onConfirm={handleImageConfirm}
      />

      <BatchApprovalModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSubmitBatch={handleBatchStatusSubmit}
        requestId={activeRequestId}
        requestName={requestName}
      />

      <ActionConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isSubmitting) setShowDeleteModal(false); }}
        onConfirm={executeDelete}
        variant="delete"
        title="Xác nhận xóa"
        desc="Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        loading={isSubmitting}
      />

      <ActionConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => { if (!isSubmitting) setConfirmAction(null); }}
        onConfirm={() => {
          if (confirmAction) return handleUpdateProduct(confirmAction);
        }}
        variant={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'draft' : 'submit'}
        title={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Xác nhận lưu nháp' : 'Xác nhận gửi phê duyệt'}
        desc={getActionConfirmDesc(productData, id, confirmAction, 'sản phẩm', isProductActive)}
        confirmText={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Lưu nháp' : 'Gửi phê duyệt'}
        cancelText="Hủy"
        loading={isSubmitting}
      />

      <DuplicateVersionModal
        isOpen={showDuplicateModal}
        itemName={productData.name}
        priorVersion={priorConflict}
        canReplace={isSameActor(currentUsername, priorConflict?.createdBy)}
        isProcessing={isDeletingPrior}
        onCancel={() => {
          setShowDuplicateModal(false);
          setPriorConflict(null);
          setPendingTargetStatus(null);
        }}
        onViewPrior={() => {
          if (priorConflict) {
            setShowDuplicateModal(false);
            setPreviewVersionItem(priorConflict as any);
            setShowVersionModal(true);
          }
        }}
        onConfirm={async () => {
          if (!priorConflict || !isSameActor(currentUsername, priorConflict.createdBy)) return;
          try {
            setIsDeletingPrior(true);
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
            const delRes = await fetch(API_ENDPOINTS.PRODUCT.DELETE(priorConflict.id), {
              method: 'POST',
              headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });
            if (delRes.ok) {
              toast.success('Đã xóa phiên bản trùng lặp trước đó');
              setShowDuplicateModal(false);
              const target = pendingTargetStatus;
              setPriorConflict(null);
              setPendingTargetStatus(null);
              if (target) {
                handleUpdateProduct(target as any);
              }
            } else {
              const err = await delRes.json().catch(() => ({}));
              toast.error(err.message || 'Không thể xóa phiên bản cũ', { position: 'top-center' });
            }
          } catch (e) {
            toast.error('Lỗi khi xóa phiên bản cũ', { position: 'top-center' });
          } finally {
            setIsDeletingPrior(false);
          }
        }}
      />

      <VersionDetailModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        itemType="product"
        versionItem={previewVersionItem}
      />

      {dialog}
    </div>
  );
};

export default DetailProductPage;