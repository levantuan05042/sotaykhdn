import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailProductsPage.css';
import toast from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig';

// ─────────────────────────────────────────────
// Constants & Status Mapping
// ─────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  ACTIVE:           { label: 'Đang hoạt động',    className: 'status-active'   },
  DRAFT:            { label: 'Lưu nháp',           className: 'status-draft'    },
  NEEDS_REVISION:   { label: 'Yêu cầu chỉnh sửa', className: 'status-revision' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',          className: 'status-pending'  },
  REJECTED:         { label: 'Từ chối',             className: 'status-rejected' },
  ARCHIVED:         { label: 'Lưu trữ',             className: 'status-archived' },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Criterion {
  id: string;
  name: string;
  isRequired: boolean;
  isSelected: boolean;
  value: string;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const serializeCriteriaForDiff = (list: Criterion[]) =>
  JSON.stringify(list.map(c => ({ name: c.name, value: c.value, isSelected: c.isSelected })));

const isHtmlEmpty = (html: string) => {
  if (!html) return true;
  return html.replace(/<[^>]*>?/gm, '').trim().length === 0 && !html.includes('<img');
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '---';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateString;
  }
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

const toDisplayUrl = (raw: string) => {
  if (!raw) return '';
  if (raw.startsWith('http')) {
    if (raw.includes('localhost:8082') || (BASE_URL && raw.includes(BASE_URL))) {
      return raw.replace(/^(https?:\/\/[^\/]+)/, '');
    }
    return raw;
  }
  const cleanPath = raw.includes('/files/') 
    ? raw.substring(raw.indexOf('/files/')) 
    : `/files/products/${raw}`;
  return cleanPath; 
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
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

// ─────────────────────────────────────────────
// ImageModal Component
// ─────────────────────────────────────────────
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, blobUrl: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [step, setStep]                 = useState<'drop' | 'crop'>('drop');
  const [dataUrl, setDataUrl]           = useState('');        
  const [fileName, setFileName]         = useState('');
  const [crop, setCrop]                 = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(1);
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

// ─────────────────────────────────────────────
// QuillEditor Component
// ─────────────────────────────────────────────
interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef  = useRef<HTMLDivElement>(null);
  const quillRef   = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || !toolbarRef.current || quillRef.current) return;
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung chi tiết...',
      modules: { toolbar: toolbarRef.current },
    });
    quillRef.current = quill;
    if (value) quill.clipboard.dangerouslyPasteHTML(value);
    quill.on('text-change', () => {
      const h = quill.root.innerHTML;
      onChange(h === '<p><br></p>' ? '' : h);
    });
    return () => { quillRef.current = null; };
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const cur = quillRef.current.root.innerHTML;
    if (value !== cur && !(value === '' && cur === '<p><br></p>'))
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
  }, [value]);

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB', boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none', transition: 'all 0.2s ease' }}>
      <div ref={toolbarRef} className="ql-toolbar ql-snow" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '8px 12px', backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB' }}>
        <span className="ql-formats">
          <button className="ql-bold"/><button className="ql-italic"/>
          <button className="ql-underline"/><button className="ql-strike"/>
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered"/>
          <button className="ql-list" value="bullet"/>
        </span>
        <span className="ql-formats">
          <button className="ql-script" value="sub"/>
          <button className="ql-script" value="super"/>
        </span>
        <span className="ql-formats">
          <button className="ql-indent" value="-1"/>
          <button className="ql-indent" value="+1"/>
        </span>
        <span className="ql-formats"><select className="ql-color"/><select className="ql-background"/></span>
        <span className="ql-formats"><select className="ql-align"/></span>
        <span className="ql-formats"><button className="ql-clean"/></span>
      </div>
      <div ref={editorRef} style={{ minHeight: 120, fontSize: 15, border: 'none' }}/>
    </div>
  );
};

// ─────────────────────────────────────────────
// CriteriaModal Component
// ─────────────────────────────────────────────
const CriteriaModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  criteria: Criterion[]; onToggle: (id: string) => void;
}> = ({ isOpen, onClose, criteria, onToggle }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Thêm tiêu chí</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: 400, padding: '8px 0' }}>
          {criteria.filter(c => !c.isRequired).map(c => (
            <div key={c.id} onClick={() => onToggle(c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', backgroundColor: c.isSelected ? '#FDF2F4' : 'transparent', transition: 'background-color 0.2s', borderBottom: '1px solid #F3F4F6' }}
              className="figma-option-row">
              <span style={{ fontSize: 15, fontWeight: c.isSelected ? 500 : 400, color: c.isSelected ? '#111827' : '#374151', userSelect: 'none' }}>{c.name}</span>
              {c.isSelected && (
                <svg width="16" height="16" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.33334 6.00001L5.33334 10L14.6667 1.33334" stroke="#AE1C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
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

// ─────────────────────────────────────────────
// Main Component: DetailProductPage
// ─────────────────────────────────────────────
const DetailProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const groupRef     = useRef<HTMLDivElement>(null);
  const categoryRef  = useRef<HTMLDivElement>(null);
  const operationRef = useRef<HTMLDivElement>(null);
  const statusRef    = useRef<HTMLDivElement>(null);

  const [isGroupOpen,       setIsGroupOpen]       = useState(false);
  const [isCategoryOpen,    setIsCategoryOpen]    = useState(false);
  const [isOperationOpen,   setIsOperationOpen]   = useState(false);
  const [isStatusOpen,      setIsStatusOpen]      = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [showImageModal,    setShowImageModal]    = useState(false);

  const [groupOptions,     setGroupOptions]     = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions,  setCategoryOptions]  = useState<{ label: string; value: string }[]>([]);
  const [operationOptions, setOperationOptions] = useState<{ label: string; value: string }[]>([]);

  const [loading,           setLoading]           = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [isActive,    setIsActive]    = useState(true);
  const [productName, setProductName] = useState('');
  const [formData,    setFormData]    = useState({ productGroupId: '', productCategoryId: '', businessId: '' });

  const [criteria,         setCriteria]         = useState<Criterion[]>([]);
  const [originalCriteria, setOriginalCriteria] = useState<Criterion[]>([]);

  const [previewImage, setPreviewImage] = useState('');   
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null); 
  const [imageRemoved, setImageRemoved] = useState(false); 

  useEffect(() => {
    if (productData?.imageUrl) setPreviewImage(toDisplayUrl(productData.imageUrl));
  }, [productData?.imageUrl]);

  useEffect(() => {
    return () => { if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage); };
  }, [previewImage, avatarFile]);

  const handleImageConfirm = (file: File, blobUrl: string) => {
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(file);
    setPreviewImage(blobUrl);
    setImageRemoved(false);
    setShowImageModal(false);
  };

  const handleRemoveImage = () => {
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
      const data = response.data;
      if (!data.url) throw new Error('Backend không trả về đường dẫn ảnh');
      return data.url; 
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      throw new Error('Upload ảnh lên hệ thống thất bại');
    }
  };

  // Click outside listener for dropdowns
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

  // Fetch product detail & group options
  useEffect(() => {
    const init = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [pRes, gRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`),
        ]);
        if (!pRes.ok) throw new Error('Không thể tải thông tin sản phẩm');
        const pData = await pRes.json();
        setProductData(pData);
        setIsActive(pData.active ?? true);
        setProductName(pData.name || '');
        setFormData({
          productGroupId:    pData.productGroupId    || '',
          productCategoryId: pData.productCategoryId || '',
          businessId:        pData.businessId        || '',
        });
        if (gRes.ok) {
          const gd = await gRes.json();
          setGroupOptions(gd.map((g: any) => ({ label: g.name, value: g.id })));
        }

        const rawDetails = pData.details || [];

        if (rawDetails.length > 0) {
          const mapped: Criterion[] = rawDetails.map((item: any, i: number) => ({
            id:         String(item.id || item.criteriaId || item.stt || i),
            name:       (item.tieuChi || item.name || '').replace(/\s*\(\*\)/g, ''),
            isRequired: checkIsRequired(item),
            isSelected: true,
            value:      item.noiDung || item.value || '',
          }));
          setOriginalCriteria(JSON.parse(JSON.stringify(mapped)));
        }
      } catch (e) {
        console.error(e);
        toast.error('Không tìm thấy sản phẩm hoặc cấu trúc dữ liệu không khớp');
      } finally { setLoading(false); }
    };
    init();
  }, [id]);

  // Dynamic dropdowns & dynamic criteria update
  useEffect(() => {
    if (!formData.productGroupId) { setCategoryOptions([]); setOperationOptions([]); return; }

    (async () => {
      try {
        setLoadingCategories(true);
        const r = await fetch(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (r.ok) { const d = await r.json(); setCategoryOptions(d.map((c: any) => ({ label: c.name, value: c.id }))); }
      } catch (e) { console.error(e); } finally { setLoadingCategories(false); }
    })();

    (async () => {
      try {
        setLoadingOperations(true);
        const ep = API_ENDPOINTS.PRODUCT_BUSINESS?.LIST || API_ENDPOINTS.PRODUCT_GROUPS.LIST.replace('product-groups', 'business');
        const r  = await fetch(`${ep}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (r.ok) { const d = await r.json(); setOperationOptions(d.map((b: any) => ({ label: b.name, value: b.id }))); }
      } catch (e) { console.error(e); } finally { setLoadingOperations(false); }
    })();

    (async () => {
      try {
        const r = await fetch(`${API_ENDPOINTS.PRODUCT_CRITERIA.LIST}?types=${formData.productGroupId}&status=ACTIVE&active=true`);
        if (!r.ok) return;
        const data = await r.json();
        const isOrig = productData && formData.productGroupId === productData.productGroupId;

        setCriteria(
          data.map((item: any) => {
            const name  = (item.tieuChi || item.name || '').replace(/\s*\(\*\)/g, '');
            const isReq = checkIsRequired(item);
            let isSelected = isReq, finalValue = '';
            if (isOrig) {
              const m = originalCriteria.find(o => o.name === name);
              if (m) { isSelected = true; finalValue = m.value; }
            }
            return { id: String(item.id || item.criteriaId), name, isRequired: isReq, isSelected: isReq ? true : isSelected, value: finalValue };
          }).sort((a: Criterion, b: Criterion) => Number(b.isRequired) - Number(a.isRequired))
        );
      } catch (e) { console.error(e); }
    })();
  }, [formData.productGroupId, productData, originalCriteria]);

  const handleCriterionValueChange = (id: string, v: string) =>
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, value: v } : c));

  const toggleCriterionSelection = (id: string) =>
    setCriteria(prev => prev.map(c => c.id !== id ? c : (c.isRequired ? c : { ...c, isSelected: !c.isSelected })));

  // Form dirty states
  const isFormDirty     = productName !== (productData?.name || '') || formData.productGroupId !== (productData?.productGroupId || '') || formData.productCategoryId !== (productData?.productCategoryId || '') || formData.businessId !== (productData?.businessId || '');
  const isCriteriaDirty = serializeCriteriaForDiff(criteria) !== serializeCriteriaForDiff(originalCriteria);
  const isDirty         = isFormDirty || isCriteriaDirty || avatarFile !== null || imageRemoved || isActive !== (productData?.active ?? true);

  const handleUpdateProduct = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE') => {
    if (!id) return;
    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.productGroupId) { toast.error('Vui lòng chọn Nhóm sản phẩm', { position: 'top-center' }); return; }
      if (!productName.trim()) { toast.error('Vui lòng nhập Tên sản phẩm dịch vụ', { position: 'top-center' }); return; }
      if (status !== 'DRAFT') {
        const miss = criteria.find(c => c.isRequired && isHtmlEmpty(c.value));
        if (miss) { toast.error(`Vui lòng nhập nội dung cho tiêu chí bắt buộc: ${miss.name}`, { position: 'top-center' }); return; }
      }
    }
    try {
      setLoading(true);
      let finalImageUrl: string | null;
      if      (imageRemoved) { finalImageUrl = null; }
      else if (avatarFile)   { try { finalImageUrl = await uploadImage(avatarFile); } catch (e: any) { toast.error(e.message || 'Lỗi upload ảnh', { position: 'top-center' }); setLoading(false); return; } }
      else                   { finalImageUrl = productData.imageUrl || null; }

      const payload = {
        name:              productName.trim(),
        productGroupId:    formData.productGroupId    || productData.productGroupId,
        productCategoryId: formData.productCategoryId || null,
        businessId:        formData.businessId        || null,
        active:            isActive,
        imageUrl:          finalImageUrl,
        status,
        criteria: criteria.filter(c => c.isSelected).map(c => ({ criteriaId: c.id, value: c.value.trim() })),
      };
      const res = await fetch(API_ENDPOINTS.PRODUCT.UPDATE(id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const msgs: Record<string, string> = {
          DRAFT: 'Lưu nháp sản phẩm thành công', ARCHIVED: 'Lưu trữ sản phẩm thành công',
          ACTIVE: 'Kích hoạt sản phẩm hoạt động trở lại thành công', PENDING_APPROVAL: 'Gửi phê duyệt sản phẩm thành công',
        };
        renderCustomToast(msgs[status] || 'Cập nhật sản phẩm thành công');
        setTimeout(() => navigate(-1), 1000);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Có lỗi xảy ra khi cập nhật sản phẩm', { position: 'top-center' });
        setLoading(false);
      }
    } catch (e) { console.error(e); toast.error('Lỗi kết nối máy chủ', { position: 'top-center' }); setLoading(false); }
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

  if (loading)      return <div className="loading" style={{ padding: 40, textAlign: 'center' }}>Đang tải dữ liệu sản phẩm...</div>;
  if (!productData) return <div className="error" style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu sản phẩm phù hợp.</div>;

  const currentStatus       = STATUS_MAP[productData.status] || { label: productData.status, className: '' };

  const renderCriterionField = (criterion: Criterion) => {
    const hasErr = criterion.isRequired && isHtmlEmpty(criterion.value);
    return (
      <div key={criterion.id} className="formGroup" style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {!criterion.isRequired && (
            <button type="button" onClick={() => toggleCriterionSelection(criterion.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#9CA3AF', transition: 'color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
              onMouseOut={e => e.currentTarget.style.color = '#9CA3AF'}
              title="Bỏ tiêu chí này">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          )}
          <label className="label" style={{ fontWeight: 600, margin: 0 }}>
            {criterion.name} {criterion.isRequired && <span style={{ color: '#EF4444' }}>(*)</span>}
          </label>
        </div>
        <QuillEditor
          value={criterion.value}
          placeholder={criterion.isRequired ? 'Tiêu chí này bắt buộc phải nhập...' : 'Nhập nội dung chi tiết...'}
          hasError={hasErr}
          onChange={v => handleCriterionValueChange(criterion.id, v)}
        />
        {hasErr && <span style={{ color: '#EF4444', fontSize: 13, marginTop: 6, display: 'block', fontWeight: 500 }}>⚠️ Trường bắt buộc, vui lòng nhập nội dung.</span>}
      </div>
    );
  };
  const requiredCriteria = criteria.filter(c => c.isSelected && c.isRequired);
  const optionalCriteria = criteria.filter(c => c.isSelected && !c.isRequired);

  return (
    <div className="pageWrapper">
      <style>{`.ql-editor{word-break:break-word!important;overflow-wrap:break-word!important;white-space:pre-wrap!important;}`}</style>

      <div className="mainContainer">

        {/* ══ Header ══ */}
        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="breadcrumbText">Quay lại</span>
            </button>
            <div className="breadcrumb">
              {(() => {
                const groupLabel = groupOptions.find(o => o.value === formData.productGroupId)?.label || productData?.productGroupName;
                const categoryLabel = categoryOptions.find(o => o.value === formData.productCategoryId)?.label || productData?.productCategoryName;
                const operationLabel = operationOptions.find(o => o.value === formData.businessId)?.label || productData?.businessName;
                const currentProductName = productName.trim() || productData?.name;

                const breadcrumbItems = [
                  groupLabel,
                  categoryLabel,
                  operationLabel,
                  currentProductName
                ].filter(Boolean); // Lọc bỏ các giá trị null, undefined hoặc chuỗi rỗng

                return breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <React.Fragment key={index}>
                      {index > 0 && (
                        <div className="separatorWrapper">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      )}
                      <span 
                        className={isLast ? "breadcrumbActive breadcrumb-truncate" : "breadcrumbGroup breadcrumb-truncate"}
                        title={String(item)}
                      >
                        {item}
                      </span>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#65636D', fontSize: '14px', fontWeight: 400, whiteSpace: 'nowrap' }}>Ghi chú:</span>
              <span style={{ color: '#111827', fontSize: '14px', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {productData?.notes || "—"}
              </span>
            </div>

            <button 
              className="btnSubmit" 
              disabled={!isDirty || productData?.status === 'PENDING_APPROVAL'} 
              onClick={() => handleUpdateProduct(productData?.status || 'ACTIVE')}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                backgroundColor: (isDirty && productData?.status !== 'PENDING_APPROVAL') ? '#AE1C3F' : '#E3DFE6',
                color: (isDirty && productData?.status !== 'PENDING_APPROVAL') ? '#FFF' : '#9CA3AF',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: (isDirty && productData?.status !== 'PENDING_APPROVAL') ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              Lưu
            </button>
          </div>
        </div>

        {/* ══ Content Grid ══ */}
        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard">
              <div className="formGroup" style={{ marginBottom: 16 }}>
                <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Nhóm sản phẩm (*)</label>
                <div className="custom-select-container" ref={groupRef}>
                  <div className={`select-custom ${isGroupOpen ? 'open' : ''}`} onClick={() => setIsGroupOpen(v => !v)} style={{ backgroundColor: 'white' }}>
                    <span>{groupOptions.find(o => o.value === formData.productGroupId)?.label || productData?.productGroupName || 'Chọn nhóm'}</span>
                  </div>
                  {isGroupOpen && (
                    <div className="custom-options-list">
                      {groupOptions.map(o => (
                        <div 
                          key={o.value} 
                          className={`custom-option ${formData.productGroupId === o.value ? 'selected' : ''}`}
                          onClick={() => { 
                            setFormData({ 
                              productGroupId: o.value, 
                              productCategoryId: '', 
                              businessId: '' 
                            }); 
                            setIsGroupOpen(false); 
                          }}
                        >
                          {o.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Danh mục sản phẩm</label>
                  <div className="custom-select-container" ref={categoryRef}>
                    <div className={`select-custom ${isCategoryOpen ? 'open' : ''}`} onClick={() => setIsCategoryOpen(v => !v)} style={{ backgroundColor: 'white' }}>
                      <span>{loadingCategories ? 'Đang tải...' : (categoryOptions.find(o => o.value === formData.productCategoryId)?.label || productData?.productCategoryName || 'Chọn danh mục')}</span>
                    </div>
                    {isCategoryOpen && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { setFormData({ ...formData, productCategoryId: '', businessId: '' }); setIsCategoryOpen(false); }}><i>-- Bỏ chọn --</i></div>
                        {categoryOptions.map(o => (
                          <div key={o.value} className={`custom-option ${formData.productCategoryId === o.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({ ...formData, productCategoryId: o.value }); setIsCategoryOpen(false); }}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Nghiệp vụ</label>
                  <div className="custom-select-container" ref={operationRef}>
                    <div className={`select-custom ${isOperationOpen ? 'open' : ''}`} onClick={() => setIsOperationOpen(v => !v)} style={{ backgroundColor: 'white' }}>
                      <span>{loadingOperations ? 'Đang tải...' : (operationOptions.find(o => o.value === formData.businessId)?.label || productData?.businessName || 'Chọn nghiệp vụ')}</span>
                    </div>
                    {isOperationOpen && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { setFormData({ ...formData, businessId: '' }); setIsOperationOpen(false); }}><i>-- Bỏ chọn --</i></div>
                        {operationOptions.map(o => (
                          <div key={o.value} className={`custom-option ${formData.businessId === o.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({ ...formData, businessId: o.value }); setIsOperationOpen(false); }}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {requiredCriteria.map(renderCriterionField)}
            </div>

            {formData.productGroupId && (
              <div className="formCard" style={{ background: '#FFFFFF' }}>
                {optionalCriteria.map(renderCriterionField)}
                <div style={{ textAlign: 'left', marginTop: optionalCriteria.length ? 8 : 0 }}>
                  <button type="button" onClick={() => setShowCriteriaModal(true)} className="btnAddCriteria">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Thêm tiêu chí
                  </button>
                </div>
              </div>
            )}

            <div className="formGroup" style={{ marginBottom: 20, marginTop: 16 }}>
              <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Ảnh mô tả</label>

              {previewImage ? (
                <div className="product-image-wrapper" style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
                  <img
                    src={previewImage}
                    alt="Product"
                    className="product-image"
                    style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, border: '1px solid #E5E7EB', display: 'block' }}
                  />
                  <div className="image-overlay" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                    <button type="button" className="overlay-btn" onClick={() => setShowImageModal(true)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button type="button" className="overlay-btn" onClick={handleRemoveImage}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowImageModal(true)}
                  className="upload-placeholder"
                  style={{ width: '100%', maxWidth: 420, aspectRatio: '16 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #E5E7EB', borderRadius: 12, background: 'transparent', cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#F0FDF4'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <span style={{ marginTop: 10, fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</span>
                  <span style={{ color: '#10B981', fontWeight: 600, fontSize: 14 }}>Chọn file</span>
                  <span style={{ marginTop: 4, fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tỉ lệ 16:9</span>
                </button>
              )}
            </div>
          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ borderRadius: 12, background: '#F2EFF3', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 16, border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái sản phẩm</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div className={`statusBadge ${currentStatus.className}`}>
                  <span className="dot"/><span className="statusText">{currentStatus.label}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                  <div className={`select-custom ${isStatusOpen ? 'open' : ''}`} onClick={() => setIsStatusOpen(v => !v)}
                    style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', background: '#FFF', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ color: '#1A191B', fontWeight: 500 }}>{isActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M5 7.5L10 12.5L15 7.5"/>
                    </svg>
                  </div>
                  {isStatusOpen && (
                    <div className="custom-options-list" style={{ zIndex: 50 }}>
                      <div className={`custom-option ${isActive === false ? 'selected' : ''}`} onClick={() => { setIsActive(false); setIsStatusOpen(false); }}>Ẩn</div>
                      <div className={`custom-option ${isActive === true  ? 'selected' : ''}`} onClick={() => { setIsActive(true);  setIsStatusOpen(false); }}>Hiển thị</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: 340 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Thông tin sản phẩm</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div className="formCard" style={{ borderRadius: 12, background: '#FFFFFF', display: 'flex', width: '100%', padding: 20, flexDirection: 'column', gap: 16, border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Người tạo</div>
                    <div style={{ color: '#1A191B', fontSize: '14px', fontWeight: 500 }}>{productData?.createdBy || '—'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Người kiểm duyệt</div>
                    <div style={{ color: '#1A191B', fontSize: '14px', fontWeight: 500 }}>{productData?.approvedBy || productData?.reviewer || '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Thời gian tạo</div>
                    <div style={{ color: '#1A191B', fontSize: '14px', fontWeight: 500 }}>{formatDateTime(productData?.createdAt)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Phiên bản</div>
                    <div>
                      <span style={{ display: 'inline-block', padding: '2px 10px', background: '#E6F4EA', color: '#137333', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                        {productData?.version !== undefined ? `Phiên bản ${productData.version}` : 'Phiên bản 1'}
                      </span>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '0' }} />

                <div>
                  <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Thuộc yêu cầu</div>
                  <a href="#request" onClick={(e) => e.preventDefault()} style={{ color: '#137333', fontSize: '14px', fontWeight: 500, textDecoration: 'underline' }}>
                    {productData?.requestName || productData?.requestCode || '—'}
                  </a>
                </div>

                <div>
                  <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Thời gian tạo yêu cầu</div>
                  <div style={{ color: '#1A191B', fontSize: '14px', fontWeight: 500 }}>{formatDateTime(productData?.createdAt)}</div>
                </div>

                <div>
                  <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '4px' }}>Ghi chú</div>
                  <div style={{ color: '#1A191B', fontSize: '14px' }}>{productData?.notes || productData?.note || '—'}</div>
                </div>
              </div>
            </div>

            <div className="commentCard emptyComment" style={{ width: 340, boxSizing: 'border-box', position: 'relative' }}>
              {productData?.comments && productData.comments.length > 0 && (
                <div className="commentAvatarFloating" title={productData.comments[productData.comments.length - 1]?.createdBy || ''}>
                  {(productData.comments[productData.comments.length - 1]?.createdBy || '?').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="commentHeader">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="commentTitle">Bình luận</span>
              </div>
              <div className="commentList">
                {productData?.comments && productData.comments.length > 0 ? (
                  productData.comments.map((c: any, i: number) => {
                    const isLatest = i === productData.comments.length - 1;
                    return (
                      <React.Fragment key={c.id || i}>
                        <div className="commentItem">
                          <div className="userInfo">
                            <img src={c.avatarUrl || 'https://images.squarespace-cdn.com/content/v1/61da6bc18e4e00423cffe684/1765779011140-U85TJYNQM9M24A5RQOZW/Leo+nui.png'} className="avatar" alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div className="userHeader">
                                <span className="userName" style={isLatest ? { fontWeight: 700, color: '#111827' } : undefined}>{c.createdBy || 'Người kiểm duyệt'}</span>
                                <span className="commentDate" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  {formatDateTime(c.createdAt)}
                                  {isLatest && <span className="unreadDot" title="Bình luận mới nhất" />}
                                </span>
                              </div>
                              <p className="commentText" style={isLatest ? { color: '#1F2937', fontWeight: 500 } : undefined}>{c.comment}</p>
                            </div>
                          </div>
                        </div>
                        {i < productData.comments.length - 1 && <hr className="commentDivider"/>}
                      </React.Fragment>
                    );
                  })
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
    </div>
  );
};

export default DetailProductPage;