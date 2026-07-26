import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import StatusBadge from '../components/ui/StatusBadge';
import SingleProductDetailPage from './SingleProductDetailPage';
import { API_ENDPOINTS } from '../config/apiConfig';
import './BatchRequestDetailPage.css';

interface ProductItem {
  id: string;
  name: string;
  group: string;
  category: string;
  business: string;
  notes: string | null;
  characteristics: string;
  feedback: string;
}

const BatchRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null);
  const [batchRequest, setBatchRequest] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    const fetchBatchAndProducts = async () => {
      setLoading(true);
      try {
        // Fetch batch request metadata
        const batchRes = await axios.get(API_ENDPOINTS.PRODUCT_REQUESTS.GET_DETAIL(requestId));
        setBatchRequest(batchRes.data);

        // Fetch products
        const response = await axios.get(API_ENDPOINTS.PRODUCT_REQUESTS.PRODUCTS(requestId));
        const mapped: ProductItem[] = response.data.map((item: any) => {
          const characItem = item.details?.find((d: any) => d.tieuChi?.toLowerCase().includes('đặc tính'));
          return {
            id: item.id,
            name: item.name || '—',
            group: item.productGroupName || '—',
            category: item.productCategoryName || '—',
            business: item.businessName || '—',
            notes: item.notes || null,
            characteristics: characItem ? characItem.noiDung : '',
            feedback: item.notes === '0' ? (item.comments?.[item.comments.length - 1]?.comment || item.comments?.[item.comments.length - 1]?.content || '') : ''
          };
        });
        setProducts(mapped);
      } catch (error) {
        console.error("Error fetching batch request detail:", error);
        toast.error("Không thể tải thông tin yêu cầu!");
      } finally {
        setLoading(false);
      }
    };

    fetchBatchAndProducts();
  }, [requestId]);

  const [quickViewDetails, setQuickViewDetails] = useState<any>(null);
  const [loadingQuickView, setLoadingQuickView] = useState(false);

  // Toggle Xem nhanh panel
  const handleToggleQuickView = async (p: ProductItem) => {
    if (quickViewProduct?.id === p.id) {
      setQuickViewProduct(null); // Click lại lần nữa sẽ đóng panel
      setQuickViewDetails(null);
    } else {
      setQuickViewProduct(p);
      setLoadingQuickView(true);
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT.DETAIL(p.id));
        setQuickViewDetails(response.data);
      } catch (error) {
        console.error("Error fetching product detail for quick view:", error);
        toast.error("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoadingQuickView(false);
      }
    }
  };
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('userRole') || 'ETN08';
  });

  useEffect(() => {
    const handleRoleChange = () => {
      setUserRole(localStorage.getItem('userRole') || 'ETN08');
    };
    window.addEventListener('userRoleChanged', handleRoleChange);
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
    };
  }, []);

  const handleRejectBatch = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn TỪ CHỐI toàn bộ lô sản phẩm này không?")) return;
    try {
      await axios.post(API_ENDPOINTS.PRODUCT_REQUESTS.UPDATE_STATUS(requestId!), {
        status: 'REJECTED',
        productReviews: products.map(p => ({
          productId: p.id,
          notes: '1',
          comment: 'Từ chối toàn bộ lô sản phẩm'
        }))
      });
      toast.success("Đã từ chối toàn bộ lô sản phẩm thành công!");
      navigate('/request-list');
    } catch (error) {
      console.error("Error rejecting batch:", error);
      toast.error("Không thể từ chối lô sản phẩm!");
    }
  };

  const handleApproveBatch = async () => {
    // Determine status: if there's any product with notes === '0', it's NEEDS_REVISION, otherwise ACTIVE
    const hasRevision = products.some(p => p.notes === '0');
    const targetStatus = hasRevision ? 'NEEDS_REVISION' : 'ACTIVE';
    
    // Check if revision comments are filled:
    const missingComment = products.find(p => p.notes === '0' && !p.feedback?.trim());
    if (missingComment) {
      toast.error(`Sản phẩm "${missingComment.name}" yêu cầu chỉnh sửa bắt buộc phải nhập nội dung góp ý!`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt lưu lô sản phẩm này với trạng thái "${hasRevision ? 'Gửi lại chỉnh sửa' : 'Hoàn thành'}" không?`)) return;

    try {
      await axios.post(API_ENDPOINTS.PRODUCT_REQUESTS.UPDATE_STATUS(requestId!), {
        status: targetStatus,
        productReviews: products.map(p => ({
          productId: p.id,
          notes: p.notes,
          comment: p.feedback
        }))
      });
      toast.success(
        targetStatus === 'NEEDS_REVISION' 
          ? "Đã yêu cầu chỉnh sửa và trả lại lô sản phẩm!" 
          : "Đã phê duyệt hoàn thành lô sản phẩm!"
      );
      navigate('/request-list');
    } catch (error) {
      console.error("Error approving batch:", error);
      toast.error("Không thể phê duyệt lô sản phẩm!");
    }
  };
  const handleAction = (type: 'DRAFT' | 'SEND' | 'REJECT' | 'REVISION') => {
    switch (type) {
      case 'DRAFT':
        toast.success('Đã lưu bản nháp lô sản phẩm thành công!');
        break;
      case 'SEND':
        toast.success('Đã gửi lô sản phẩm đi kiểm duyệt thành công!');
        break;
      case 'REJECT':
        if (quickViewProduct) {
          toast.success(`Đã TỪ CHỐI sản phẩm: ${quickViewProduct.name}`);
          setProducts(prev => prev.map(p => p.id === quickViewProduct.id ? { ...p, notes: '1' } : p));
        }
        break;
      case 'REVISION':
        if (quickViewProduct) {
          toast.success(`Đã YÊU CẦU CHỈNH SỬA sản phẩm: ${quickViewProduct.name}`);
          setProducts(prev => prev.map(p => p.id === quickViewProduct.id ? { ...p, notes: '0' } : p));
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="batch-list-layout">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="batch-header shadow-sm">
        <div className="batch-header-left">
          <button className="btn-back" onClick={() => navigate('/request-list')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Quay lại</span>
          </button>
          <div className="batch-header-separator" />
          <h2 className="batch-breadcrumb-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{batchRequest?.name || 'Lô sản phẩm'}</span>
            <span style={{ color: '#8c8c8c', fontSize: '14px' }}>&rsaquo;</span>
            <StatusBadge status={batchRequest?.status || 'PENDING_APPROVAL'} />
          </h2>
        </div>

        <div className="batch-header-right">
          <span className="batch-info-text">{products.length} sản phẩm &nbsp;&bull;&nbsp; 12/04/2024</span>
          {batchRequest?.status === 'PENDING_APPROVAL' && (
            userRole === 'ETK08' ? (
              <>
                <button 
                  className="btn-draft-action" 
                  onClick={handleRejectBatch}
                  style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5' }}
                >
                  Từ chối toàn bộ lô
                </button>
                <button 
                  className="btn-send-action" 
                  onClick={handleApproveBatch}
                  style={{ backgroundColor: '#AE1C3F', color: '#ffffff' }}
                >
                  Duyệt / Lưu
                </button>
              </>
            ) : (
              <>
                <button className="btn-draft-action" onClick={() => handleAction('DRAFT')}>
                  Lưu nháp
                </button>
                <button className="btn-send-action" onClick={() => handleAction('SEND')}>
                  Gửi
                </button>
              </>
            )
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="batch-main-container">
        
        {/* LEFT COLUMN: TABLE */}
        <section className={`batch-table-panel ${quickViewProduct ? 'with-quickview' : ''}`}>
          <table className="batch-data-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Nhóm sản phẩm</th>
                <th>Danh mục sản phẩm</th>
                <th>Nghiệp vụ</th>
                <th>Ghi chú</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isActive = quickViewProduct?.id === p.id;
                return (
                  <tr key={p.id} className={isActive ? 'active-quickview-row' : ''}>
                    <td className="product-title-cell">{p.name}</td>
                    <td>{p.group}</td>
                    <td>{p.category}</td>
                    <td>{p.business}</td>
                    <td>
                      {p.notes === '0' && (
                        <span className="note-badge note-badge--revision">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                          </svg>
                          Yêu cầu sửa
                        </span>
                      )}
                      {p.notes === '1' && (
                        <span className="note-badge note-badge--rejected">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                          Từ chối
                        </span>
                      )}
                      {p.notes === '2' && (
                        <span className="note-badge note-badge--approved">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Đã duyệt
                        </span>
                      )}
                      {(p.notes !== '0' && p.notes !== '1' && p.notes !== '2') && '—'}
                    </td>
                    <td align="center">
                      <div className="action-buttons-group">
                        <button
                          className="btn-eye-view"
                          title="Xem chi tiết"
                          onClick={() => setSelectedDetailProductId(p.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button
                          className={`btn-toggle-quickview ${isActive ? 'active' : ''}`}
                          onClick={() => handleToggleQuickView(p)}
                        >
                          Xem nhanh »
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* RIGHT COLUMN: QUICK VIEW PANEL */}
        {quickViewProduct && (
          <section className="batch-quickview-panel">
            {loadingQuickView ? (
              <div className="quickview-loading-card">
                Đang tải thông tin chi tiết...
              </div>
            ) : (
              <>
                {/* Top Form Box */}
                <div className="quickview-card quickview-card--green-border">
                  <button 
                    className="btn-close-quickview"
                    onClick={() => {
                      setQuickViewProduct(null);
                      setQuickViewDetails(null);
                    }}
                    title="Đóng xem nhanh"
                  >
                    ✕
                  </button>

                  <div className="quickview-field">
                    <label className="quickview-label">Tên sản phẩm dịch vụ (*)</label>
                    <input 
                      type="text" 
                      className="quickview-input" 
                      value={quickViewProduct.name}
                      readOnly
                    />
                  </div>

                  <div className="quickview-field">
                    <label className="quickview-label">Nhóm sản phẩm (*)</label>
                    <input 
                      type="text" 
                      className="quickview-input" 
                      value={quickViewProduct.group}
                      readOnly
                    />
                  </div>

                  {/* Dynamic Criteria from Backend */}
                  {quickViewDetails?.details?.map((detail: any) => (
                    <div className="quickview-field" key={detail.id}>
                      <label className="quickview-label">
                        {detail.tieuChi} {detail.isRequired ? '(*)' : ''}
                      </label>
                      <div className="quickview-editor-mock">
                        <div className="quickview-editor-toolbar">
                          <span style={{ fontWeight: 'bold' }}>B</span>
                          <span style={{ fontStyle: 'italic' }}>I</span>
                          <span style={{ textDecoration: 'underline' }}>U</span>
                          <span className="toolbar-sep" />
                          <span>≡</span>
                          <span>•=</span>
                          <span>1=</span>
                          <span>⊞</span>
                        </div>
                        <div 
                          className="quickview-editor-html-content"
                          dangerouslySetInnerHTML={{ __html: detail.noiDung || '—' }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Last Field: Product Image */}
                  {quickViewDetails?.imageUrl && (
                    <div className="quickview-field">
                      <label className="quickview-label">Ảnh sản phẩm</label>
                      <div className="quickview-image-container">
                        <img 
                          src={new URL(`../assets/${quickViewDetails.imageUrl}`, import.meta.url).href}
                          alt="Ảnh sản phẩm" 
                          className="quickview-product-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Feedback Box */}
                <div className="quickview-card quickview-card--green-border">
                  {/* <label className="quickview-label">Ý kiến phản hồi gần nhất</label>
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: '#4B5563', 
                    border: '1px solid #E5E7EB', 
                    marginBottom: '12px',
                    textAlign: 'left'
                  }}>
                    {quickViewDetails?.comments && quickViewDetails.comments.length > 0 ? (
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: '#1F2937' }}>
                          {quickViewDetails.comments[quickViewDetails.comments.length - 1].comment}
                        </p>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          Gửi bởi: {quickViewDetails.comments[quickViewDetails.comments.length - 1].createdBy}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Chưa có ý kiến phản hồi nào.</span>
                    )}
                  </div> */}

                  <label className="quickview-label">Nội dung yêu cầu chỉnh sửa (nếu có)</label>
                  <textarea 
                    className="quickview-feedback-textarea"
                    rows={3}
                    placeholder="Nhập nội dung yêu cầu chỉnh sửa..."
                    value={quickViewProduct.feedback}
                    disabled={batchRequest?.status !== 'PENDING_APPROVAL'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickViewProduct({ ...quickViewProduct, feedback: val });
                      setProducts(prev => prev.map(item => item.id === quickViewProduct.id ? { ...item, feedback: val } : item));
                    }}
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            {batchRequest?.status === 'PENDING_APPROVAL' && (
              <div className="quickview-actions-row">
                <button className="btn-qv-reject" onClick={() => handleAction('REJECT')}>
                  Từ chối
                </button>
                <button 
                  className="btn-qv-revision" 
                  onClick={() => handleAction('REVISION')}
                  disabled={!quickViewProduct.feedback?.trim()}
                >
                  Yêu cầu chỉnh sửa
                </button>
              </div>
            )}

          </section>
        )}
      </main>

      {selectedDetailProductId && (() => {
        const prod = products.find(p => p.id === selectedDetailProductId);
        return (
          <SingleProductDetailPage 
            requestId={selectedDetailProductId} 
            initialNotes={prod?.notes}
            initialFeedback={prod?.feedback}
            onClose={(updatedData) => {
              if (updatedData) {
                setProducts(prev => prev.map(p => p.id === selectedDetailProductId ? { 
                  ...p, 
                  notes: updatedData.notes, 
                  feedback: updatedData.feedback 
                } : p));
              }
              setSelectedDetailProductId(null);
            }} 
          />
        );
      })()}
    </div>
  );
};

export default BatchRequestDetailPage;