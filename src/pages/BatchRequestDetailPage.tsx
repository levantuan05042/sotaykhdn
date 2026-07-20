import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { API_ENDPOINTS } from '../config/apiConfig';
import './ProductPage.css';

const stripHtml = (htmlString: string) => {
  if (!htmlString) return '';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, '');
};

// Kiểm tra nội dung Quill (HTML) có thực sự trống hay không (giống DetailProductPage)
const isHtmlEmpty = (html: string) => {
  if (!html) return true;
  return html.replace(/<[^>]*>?/gm, '').trim().length === 0 && !html.includes('<img');
};

interface OptionItem {
  id: string;
  name: string;
}

const FALLBACK_GROUP_OPTIONS: OptionItem[] = [
  { id: 'Sản phẩm Bảo hiểm', name: 'Sản phẩm Bảo hiểm' },
  { id: 'Sản phẩm Cho vay', name: 'Sản phẩm Cho vay' },
  { id: 'Sản phẩm Huy động', name: 'Sản phẩm Huy động' },
];

// CSS chung cho thông báo (toast)
const toastStyle = {
  borderRadius: '8px',
  background: '#ffffff',
  color: '#111827',
  fontSize: '14px',
  fontWeight: 500,
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid #E5E7EB',
  padding: '12px 16px',
};

interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || !toolbarRef.current || quillRef.current) return;
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập đặc tính sản phẩm dịch vụ...',
      modules: { toolbar: toolbarRef.current },
    });
    quillRef.current = quill;
    if (value) quill.clipboard.dangerouslyPasteHTML(value);
    quill.on('text-change', () => {
      const h = quill.root.innerHTML;
      onChange(h === '<p><br></p>' ? '' : h);
    });
    return () => {
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const cur = quillRef.current.root.innerHTML;
    if (value !== cur && !(value === '' && cur === '<p><br></p>'))
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
  }, [value]);

  return (
    <div
      style={{
        backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden',
        border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB',
        boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div ref={toolbarRef} className="ql-toolbar ql-snow" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '6px 10px', backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB' }}>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-strike" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
        </span>
        <span className="ql-formats">
          <button className="ql-script" value="sub" />
          <button className="ql-script" value="super" />
        </span>
        <span className="ql-formats">
          <button className="ql-indent" value="-1" />
          <button className="ql-indent" value="+1" />
        </span>
        <span className="ql-formats">
          <select className="ql-color" />
          <select className="ql-background" />
        </span>
        <span className="ql-formats">
          <select className="ql-align" />
        </span>
        <span className="ql-formats">
          <button className="ql-clean" />
        </span>
      </div>
      <div ref={editorRef} style={{ minHeight: '160px', fontSize: '14px', border: 'none' }} />
    </div>
  );
};

const BatchRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [batchName, setBatchName] = useState<string>('Sản phẩm cho vay');

  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    productGroupId: '',
    productCategoryId: '',
    businessId: '',
    detail: '',
    feedback: '',
  });
  const [criteria, setCriteria] = useState<any[]>([]);
  const [groupOptions, setGroupOptions] = useState<OptionItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<OptionItem[]>([]);
  const [operationOptions, setOperationOptions] = useState<OptionItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false); // Trạng thái loading khi lưu từng sản phẩm

  const formattedDate = useMemo(() => {
    if (products.length > 0 && products[0].createdAt) {
      return new Date(products[0].createdAt).toLocaleDateString('vi-VN');
    }
    return '12/04/2024'; 
  }, [products]);

  const batchStatus = useMemo(() => {
    if (products.length > 0) return products[0].status;
    return 'DRAFT';
  }, [products]);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!requestId) return;
      setLoading(true);
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT.LIST2}/${encodeURIComponent(requestId)}/products`);
        const data = response.data || [];
        setProducts(data);
        setCurrentPage(1); 
        if (data.length > 0 && data[0].requestName) {
          setBatchName(data[0].requestName);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách sản phẩm theo lô:', error);
        toast.error('Không thể tải dữ liệu danh sách sản phẩm!', { style: toastStyle, iconTheme: { primary: '#DC2626', secondary: '#fff' } });
      } finally {
        setLoading(false);
      }
    };
    fetchBatchDetails();
  }, [requestId]);

  useEffect(() => {
    const fetchGroupOptions = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`);
        const raw = (response.data || []).filter((g: any) => g?.name);
        const options: OptionItem[] = raw.map((g: any) => ({ id: String(g.id ?? g.name), name: g.name }));
        const unique = Array.from(new Map(options.map(o => [o.id, o])).values());
        if (unique.length > 0) setGroupOptions(unique);
      } catch (error) {
        console.error('Lỗi khi tải nhóm sản phẩm:', error);
      }
    };
    fetchGroupOptions();
  }, []);

  // Tải Danh mục sản phẩm & Nghiệp vụ theo Nhóm sản phẩm đang chọn trong khung Xem nhanh
  // (cùng cơ chế cascading như DetailProductPage)
  useEffect(() => {
    if (!quickViewProduct || !formData.productGroupId) {
      setCategoryOptions([]);
      setOperationOptions([]);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        setLoadingCategories(true);
        const res = await axios.get(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (!cancelled) {
          setCategoryOptions((res.data || []).map((c: any) => ({ id: String(c.id), name: c.name })));
        }
      } catch (error) {
        console.error('Lỗi khi tải danh mục sản phẩm:', error);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();

    (async () => {
      try {
        setLoadingOperations(true);
        const endpoint = API_ENDPOINTS.PRODUCT_BUSINESS?.LIST || API_ENDPOINTS.PRODUCT_GROUPS.LIST.replace('product-groups', 'business');
        const res = await axios.get(`${endpoint}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (!cancelled) {
          setOperationOptions((res.data || []).map((b: any) => ({ id: String(b.id), name: b.name })));
        }
      } catch (error) {
        console.error('Lỗi khi tải nghiệp vụ:', error);
      } finally {
        if (!cancelled) setLoadingOperations(false);
      }
    })();

    return () => { cancelled = true; };
  }, [formData.productGroupId, quickViewProduct]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  const displayGroupOptions = groupOptions.length > 0 ? groupOptions : FALLBACK_GROUP_OPTIONS;

  const handleOpenQuickView = (product: any) => {
    setQuickViewProduct(product);
  setCriteria(
    (product.criteria || []).map((c: any, index: number) => ({
      id: c.criteriaId || c.id || index,
      name: c.name || c.tieuChi,
      value: c.value || c.noiDung || '',
      isRequired: c.isRequired || false,
    }))
  );
    let resolvedGroupId = product.productGroupId ? String(product.productGroupId) : '';
    if (!resolvedGroupId && product.productGroupName) {
      const matched = displayGroupOptions.find(g => g.name === product.productGroupName);
      if (matched) resolvedGroupId = matched.id;
    }

    setFormData({
      name: product.name || '',
      productGroupId: resolvedGroupId,
      productCategoryId: product.productCategoryId ? String(product.productCategoryId) : '',
      businessId: product.businessId ? String(product.businessId) : '',
      detail: product.description || '',
      feedback: product.notes || '',
    });
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!requestId) return;
    const confirmMsg = newStatus === 'PENDING_APPROVAL' 
      ? "Bạn có chắc chắn muốn gửi toàn bộ sản phẩm trong lô đi kiểm duyệt?" 
      : "Bạn có muốn lưu trạng thái lô hiện tại là bản nháp?";
    if (!window.confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      await axios.post(`${API_ENDPOINTS.PRODUCT_REQUESTS.UPDATE_STATUS(requestId)}`, { status: newStatus });
      toast.success("Cập nhật trạng thái thành công!", { 
        style: toastStyle, 
        iconTheme: { primary: '#10B981', secondary: '#fff' } 
      });
      setTimeout(() => window.location.reload(), 1000); 
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái.", { 
        style: toastStyle, 
        iconTheme: { primary: '#DC2626', secondary: '#fff' } 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!quickViewProduct) return;
    
    const missingRequired = criteria.find(
  (c) =>
    c.isRequired &&
    isHtmlEmpty(c.value)
);

if (
  !formData.name.trim() ||
  missingRequired
) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*).", { style: toastStyle });
      return;
    }

    setIsSavingProduct(true);
    try {
      const selectedGroup = displayGroupOptions.find(g => g.id === formData.productGroupId);
      const selectedCategory = categoryOptions.find(c => c.id === formData.productCategoryId);
      const selectedBusiness = operationOptions.find(b => b.id === formData.businessId);
      const payload = {
        name: formData.name,
        productGroupId: formData.productGroupId || null,
        productGroupName: selectedGroup?.name || '',

        productCategoryId: formData.productCategoryId || null,
        productCategoryName: selectedCategory?.name || null,

        businessId: formData.businessId || null,
        businessName: selectedBusiness?.name || null,

        criteria: criteria.map((c) => ({
          criteriaId: c.id,
          value: c.value,
        })),

        notes: formData.feedback,
      };
      
      // Update data via API (Thay đổi endpoint nếu cấu trúc API_ENDPOINTS của bạn khác)
      await axios.put(`${API_ENDPOINTS.PRODUCT.LIST}/${quickViewProduct.id}`, payload);
      
      // Cập nhật lại danh sách hiển thị local (không cần reload lại trang)
      setProducts(prevProducts => prevProducts.map(p => 
        p.id === quickViewProduct.id ? { ...p, ...payload } : p
      ));

      toast.success("Đã lưu thông tin sản phẩm thành công!", { 
        style: toastStyle, 
        iconTheme: { primary: '#10B981', secondary: '#fff' } 
      });
      
      // Tùy chọn: Đóng khung xem nhanh hoặc giữ nguyên để người dùng xem tiếp
      // setQuickViewProduct(null); 
    } catch (error) {
      console.error('Lỗi khi lưu sản phẩm:', error);
      toast.error("Có lỗi xảy ra khi lưu thông tin sản phẩm.", { 
        style: toastStyle, 
        iconTheme: { primary: '#DC2626', secondary: '#fff' } 
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const safeStatus = status?.toUpperCase();
    switch (safeStatus) {
      case 'DRAFT':
        return (
          <div style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 12px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0369A1' }}></span>Lưu nháp
          </div>
        );
      case 'PENDING_APPROVAL':
        return (
          <div style={{ backgroundColor: '#FEF9C3', color: '#CA8A04', padding: '4px 12px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#CA8A04' }}></span>Chờ duyệt
          </div>
        );
      default:
        return (
          <div style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 12px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0369A1' }}></span>Lưu nháp
          </div>
        );
    }
  };

  return (
    <div
      className="batch-fullscreen-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#F9FAFB', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <Toaster position="top-right" reverseOrder={false} />
      <style>{`.ql-editor{word-break:break-word!important;overflow-wrap:break-word!important;white-space:pre-wrap!important;} .ql-editor.ql-blank::before{font-style:normal!important;color:#9CA3AF!important;}`}</style>

      {/* HEADER */}
      <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontWeight: 600, fontSize: '14px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Quay lại
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#D1D5DB' }}></div>

          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            {stripHtml(batchName)}
          </h2>
          {renderStatusBadge(batchStatus)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '14px', color: '#4B5563' }}>{products.length} sản phẩm</span>
          <span style={{ fontSize: '14px', color: '#4B5563' }}>{formattedDate}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button disabled={isUpdating} onClick={() => handleUpdateStatus('DRAFT')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#4B5563', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
              Lưu nháp
            </button>
            <button disabled={isUpdating} onClick={() => handleUpdateStatus('PENDING_APPROVAL')}
              style={{ padding: '8px 24px', borderRadius: '4px', border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
              Gửi
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '16px 24px', gap: '16px' }}>
        
        {/* TABLE LEFT */}
        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600 }}>Sản phẩm</th>
                  <th style={{ padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600 }}>Nhóm sản phẩm</th>
                  <th style={{ padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600 }}>Danh mục sản phẩm</th>
                  <th style={{ padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600 }}>Nghiệp vụ</th>
                  <th style={{ padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600 }}>Ghi chú</th>
                  <th style={{ width: '120px', padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 600, textAlign: 'right', position: 'sticky', right: 0, backgroundColor: '#F9FAFB' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Đang tải dữ liệu...</td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => {
                    const isSelected = quickViewProduct?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: '#fff',
                          boxShadow: isSelected ? 'inset 0 0 0 2px #A855F7' : 'none', 
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <td style={{ padding: '14px 16px', color: '#111827', fontSize: '14px', width: '25%' }}>
                          <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '150px', fontWeight: isSelected ? 500 : 400 }}>
                             {item.name || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: '14px' }}>
                          {item.productGroupName || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: '14px' }}>
                          {item.productCategoryName || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: '14px' }}>
                          {item.businessName || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: '14px', maxWidth: '200px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.notes || ''}>
                             {item.notes || ''}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', position: 'sticky', right: 0, backgroundColor: isSelected ? '#faf5ff' : '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                              onClick={() => navigate(`/product/${item.id}`)}
                              title="Xem chi tiết"
                              style={{ background: '#FEE2E2', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button
                              onClick={() => handleOpenQuickView(item)}
                              style={{ background: '#D1FAE5', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', color: '#047857', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              Xem nhanh
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '14px' }}>Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && products.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, products.length)} trên tổng số {products.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: currentPage === 1 ? '#F3F4F6' : '#fff', color: currentPage === 1 ? '#9CA3AF' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Trước
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#fff', color: currentPage === totalPages ? '#9CA3AF' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* QUICK VIEW PANEL RIGHT */}
        {quickViewProduct && (
          <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* Form Section */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px', position: 'relative' }}>
              <button 
                onClick={() => setQuickViewProduct(null)} 
                title="Đóng"
                style={{ position: 'absolute', top: '12px', right: '12px', background: '#D1FAE5', border: 'none', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#047857', transition: 'all 0.2s' }}
              >✕</button>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Tên sản phẩm dịch vụ <span style={{ color: '#DC2626' }}>(*)</span>
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Nhóm sản phẩm
                </label>
                <div
  style={{
    marginBottom: '16px',
  }}
>
  <label
    style={{
      display: 'block',
      fontSize: '13px',
      fontWeight: 600,
      marginBottom: '8px',
    }}
  >
    Ảnh mô tả
  </label>

  {quickViewProduct?.imageUrl ? (
    <img
      src={quickViewProduct.imageUrl}
      alt=""
      style={{
        width: '100%',
        aspectRatio: '16/9',
        objectFit: 'cover',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
      }}
    />
  ) : (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '12px',
        border: '1px dashed #D1D5DB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
      }}
    >
      Chưa có ảnh
    </div>
  )}
</div>
                <select 
                  value={formData.productGroupId}
                  onChange={(e) => setFormData({ ...formData, productGroupId: e.target.value, productCategoryId: '', businessId: '' })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', appearance: 'auto', boxSizing: 'border-box' }}
                >
                  <option value="" disabled>Chọn nhóm sản phẩm</option>
                  {displayGroupOptions.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Danh mục sản phẩm
                  </label>
                  <select
                    value={formData.productCategoryId}
                    onChange={(e) => setFormData({ ...formData, productCategoryId: e.target.value })}
                    disabled={!formData.productGroupId || loadingCategories}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB',
                      fontSize: '14px', outline: 'none', appearance: 'auto', boxSizing: 'border-box',
                      backgroundColor: (!formData.productGroupId || loadingCategories) ? '#F3F4F6' : '#fff',
                      color: !formData.productGroupId ? '#9CA3AF' : '#111827',
                    }}
                  >
                    <option value="">{loadingCategories ? 'Đang tải...' : '-- Chọn danh mục --'}</option>
                    {categoryOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Nghiệp vụ
                  </label>
                  <select
                    value={formData.businessId}
                    onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                    disabled={!formData.productGroupId || loadingOperations}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB',
                      fontSize: '14px', outline: 'none', appearance: 'auto', boxSizing: 'border-box',
                      backgroundColor: (!formData.productGroupId || loadingOperations) ? '#F3F4F6' : '#fff',
                      color: !formData.productGroupId ? '#9CA3AF' : '#111827',
                    }}
                  >
                    <option value="">{loadingOperations ? 'Đang tải...' : '-- Chọn nghiệp vụ --'}</option>
                    {operationOptions.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
  style={{
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginBottom: '12px',
  }}
>
  <label
    style={{
      display: 'block',
      fontSize: '13px',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '10px',
    }}
  >
    Đặc tính sản phẩm dịch vụ
  </label>

  {criteria.map((criterion) => (
    <div
      key={criterion.id}
      style={{ marginBottom: '16px' }}
    >
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {criterion.name}

        {criterion.isRequired && (
          <span style={{ color: '#DC2626' }}>
            {' '}
            (*)
          </span>
        )}
      </label>

      <QuillEditor
        value={criterion.value}
        onChange={(value) =>
          setCriteria((prev) =>
            prev.map((c) =>
              c.id === criterion.id
                ? { ...c, value }
                : c
            )
          )
        }
      />
    </div>
  ))}
</div>
              
            </div>

            {/* Revision Feedback Section */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nội dung yêu cầu chỉnh sửa (nếu có)
              </label>
              <textarea
                value={formData.feedback}
                onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                rows={4}
                placeholder="Nhập ghi chú hoặc phản hồi chỉnh sửa..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div
  style={{
    background: '#fff',
    border: '1px solid #86EFAC',
    borderRadius: '8px',
    padding: '16px',
  }}
>
  <div
    style={{
      fontWeight: 600,
      marginBottom: '12px',
      color: '#AE1C3F',
    }}
  >
    Lịch sử phản hồi
  </div>

  {(quickViewProduct?.comments || []).length >
  0 ? (
    quickViewProduct.comments.map(
      (item: any) => (
        <div
          key={item.id}
          style={{
            borderBottom:
              '1px solid #F3F4F6',
            marginBottom: '12px',
            paddingBottom: '12px',
          }}
        >
          <div
            style={{
              fontWeight: 600,
            }}
          >
            {item.createdBy}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '4px',
            }}
          >
            {item.createdAt}
          </div>

          <div
            style={{
              marginTop: '8px',
            }}
          >
            {item.comment}
          </div>
        </div>
      )
    )
  ) : (
    <div
      style={{
        color: '#9CA3AF',
      }}
    >
      Chưa có phản hồi
    </div>
  )}
</div>

            {/* Action Bottom */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSaveProduct}
                disabled={isSavingProduct}
                style={{ 
                  backgroundColor: isSavingProduct ? '#F3A8BA' : '#D97793', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 24px', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: isSavingProduct ? 'not-allowed' : 'pointer', 
                  fontSize: '14px', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSavingProduct ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default BatchRequestDetailPage;