import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import StatusBadge from '../components/ui/StatusBadge';
import ProductImageCard from '../components/ui/ProductImageCard';
import CriteriaRichBlock from '../components/ui/CriteriaRichBlock';
import ApproverProductDetailPage from './ApproverProductDetailPage';
import { API_ENDPOINTS } from '../config/apiConfig';
import RejectReasonPopup from '../components/RejectReasonPopup';
import ApproveConfirmPopup from '../components/ApproveConfirmPopup';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import iconChat from '../assets/icon/iconchat.svg';
import iconPen from '../assets/icon/iconpen.svg';
import './ApproverBatchDetailPage.css';

interface ProductItem {
  id: string;
  name: string;
  group: string;
  category: string;
  business: string;
  notes: string | null;
  characteristics: string;
  feedback: string;
  originalFeedback: string;
}

const ApproverBatchDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null);
  const [batchRequest, setBatchRequest] = useState<any>(null);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectReasonOpen, setIsRejectReasonOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const getApprovedByStr = () => {
    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    return username ? `${username}_${branchCode}` : '';
  };

  useEffect(() => {
    if (!requestId) return;
    const fetchBatchAndProducts = async () => {
      setLoading(true);
      try {
        // Fetch batch request metadata
        const batchRes = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.GET_DETAIL(requestId));
        setBatchRequest(batchRes.data);

        // Fetch products
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.PRODUCTS(requestId));
        const mapped: ProductItem[] = response.data.map((item: any) => {
          const characItem = item.details?.find((d: any) => d.tieuChi?.toLowerCase().includes('đặc tính'));
          const lastComment = item.comments?.[item.comments.length - 1]?.comment || item.comments?.[item.comments.length - 1]?.content || item.rejectReason || '';
          return {
            id: item.id,
            name: item.name || '—',
            group: item.productGroupName || '—',
            category: item.productCategoryName || '—',
            business: item.businessName || '—',
            notes: item.notes || null,
            characteristics: characItem ? characItem.noiDung : '',
            feedback: (item.notes === '0' || item.notes === '1') ? lastComment : (lastComment || ''),
            originalFeedback: lastComment,
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
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT.DETAIL(p.id));
        const data = Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : response.data;
        setQuickViewDetails(data);
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

  const handleRejectBatchSubmit = async (commentText: string) => {
    try {
      const approvedByStr = getApprovedByStr();
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.UPDATE_STATUS(requestId!), {
        status: 'REJECTED',
        approvedBy: approvedByStr,
        productReviews: products.map(p => ({
          productId: p.id,
          notes: '1',
          comment: commentText.trim()
        }))
      });
      toast.success("Đã từ chối toàn bộ lô sản phẩm thành công!");
      navigate('/approver/request-list');
    } catch (error) {
      console.error("Error rejecting batch:", error);
      toast.error("Không thể từ chối lô sản phẩm!");
    }
  };

  const triggerApproveBatch = () => {
    // Check if revision comments are filled:
    const missingComment = products.find(p => p.notes === '0' && !p.feedback?.trim());
    if (missingComment) {
      toast.error(`Sản phẩm "${missingComment.name}" yêu cầu chỉnh sửa bắt buộc phải nhập nội dung góp ý!`);
      return;
    }
    const missingRejectComment = products.find(p => p.notes === '1' && !p.feedback?.trim());
    if (missingRejectComment) {
      toast.error(`Sản phẩm "${missingRejectComment.name}" bị từ chối bắt buộc phải nhập nội dung góp ý!`);
      return;
    }
    setIsApproveConfirmOpen(true);
  };

  const handleApproveBatchSubmit = async () => {
    // Determine status: if there's any product with notes === '0', it's NEEDS_REVISION, otherwise COMPLETED
    const hasRevision = products.some(p => p.notes === '0');
    const targetStatus = hasRevision ? 'NEEDS_REVISION' : 'COMPLETED';

    try {
      const approvedByStr = getApprovedByStr();
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.UPDATE_STATUS(requestId!), {
        status: targetStatus,
        approvedBy: approvedByStr,
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
      navigate('/approver/request-list');
    } catch (error) {
      console.error("Error approving batch:", error);
      toast.error("Không thể phê duyệt lô sản phẩm!");
    }
  };

  // Hard Save single product evaluation (lưu cứng)
  const handleSaveProductReview = async (productId: string, targetNotes: string, commentText: string) => {
    if ((targetNotes === '1' || targetNotes === '0') && !commentText.trim()) {
      if (targetNotes === '1') {
        toast.error("Sản phẩm bị từ chối bắt buộc phải nhập nội dung comment!");
      } else {
        toast.error("Sản phẩm yêu cầu chỉnh sửa bắt buộc phải nhập nội dung comment!");
      }
      return false;
    }

    try {
      const approvedByStr = getApprovedByStr();
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT.REVIEW(productId), {
        notes: targetNotes,
        comment: commentText.trim(),
        approvedBy: approvedByStr
      });

      // Update state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, notes: targetNotes, feedback: commentText } : p));
      if (quickViewProduct?.id === productId) {
        setQuickViewProduct(prev => prev ? { ...prev, notes: targetNotes, feedback: commentText } : null);
      }

      const labelMap: Record<string, string> = {
        '0': 'Yêu cầu chỉnh sửa',
        '1': 'Từ chối',
        '2': 'Duyệt',
        '3': 'Đã xem',
        'REVIEWED': 'Đã xem'
      };
      toast.success(`Đã lưu đánh giá (${labelMap[targetNotes] || targetNotes}) cho sản phẩm thành công!`);
      return true;
    } catch (error) {
      console.error("Error saving product review:", error);
      toast.error("Không thể lưu đánh giá sản phẩm!");
      return false;
    }
  };

  const handleAction = async (type: 'DRAFT' | 'SEND' | 'REJECT' | 'REVISION' | 'REVIEWED') => {
    switch (type) {
      case 'DRAFT':
        toast.success('Đã lưu bản nháp lô sản phẩm thành công!');
        break;
      case 'SEND':
        toast.success('Đã gửi lô sản phẩm đi kiểm duyệt thành công!');
        break;
      case 'REJECT':
        if (quickViewProduct) {
          await handleSaveProductReview(quickViewProduct.id, '1', quickViewProduct.feedback || '');
        }
        break;
      case 'REVISION':
        if (quickViewProduct) {
          await handleSaveProductReview(quickViewProduct.id, '0', quickViewProduct.feedback || '');
        }
        break;
      case 'REVIEWED':
        if (quickViewProduct) {
          await handleSaveProductReview(quickViewProduct.id, '3', quickViewProduct.feedback || '');
        }
        break;
      default:
        break;
    }
  };

  const renderNoteBadge = (notesValue: string | null) => {
    if (notesValue === '0') {
      return (
        <span className="note-badge note-badge--revision">
          <img src={iconPen} alt="" width={14} height={14} />
          Yêu cầu chỉnh sửa
        </span>
      );
    }
    if (notesValue === '1') {
      return (
        <span className="note-badge note-badge--rejected">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Từ chối
        </span>
      );
    }
    if (notesValue === '3' || notesValue === 'REVIEWED') {
      return (
        <span className="note-badge note-badge--reviewed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Đã xem
        </span>
      );
    }
    if (notesValue === '2') {
      return (
        <span className="note-badge note-badge--approved">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Đã duyệt
        </span>
      );
    }
    return '—';
  };

  if (loading && !batchRequest) {
    return <LoadingOverlay />;
  }

  return (
    <div className="batch-list-layout">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="batch-header shadow-sm">
        <div className="batch-header-left">
          <button className="btn-back" onClick={() => navigate('/approver/request-list')}>
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
            <StatusBadge status={batchRequest?.status === 'ACTIVE' || batchRequest?.status === 'APPROVED' ? 'COMPLETED' : (batchRequest?.status || 'PENDING_APPROVAL')} />
          </h2>
        </div>

        <div className="batch-header-right">
          <span className="batch-info-text">{products.length} sản phẩm &nbsp;&bull;&nbsp; 12/04/2024</span>
          {batchRequest?.status === 'PENDING_APPROVAL' && (
            userRole === 'ETK08' ? (
              <>
                <button 
                  className="btn-draft-action" 
                  onClick={() => setIsRejectReasonOpen(true)}
                  style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5' }}
                >
                  Từ chối toàn bộ lô
                </button>
                <button 
                  className="btn-send-action" 
                  onClick={triggerApproveBatch}
                  style={{ backgroundColor: '#AE1C3F', color: '#ffffff' }}
                >
                  Gửi
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
                <th style={{ width: '80px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isActive = quickViewProduct?.id === p.id;
                return (
                  <tr 
                    key={p.id} 
                    className={isActive ? 'active-quickview-row' : ''}
                    onClick={() => navigate(`/approver/product-detail/${p.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="product-title-cell">{p.name}</td>
                    <td>{p.group}</td>
                    <td>{p.category}</td>
                    <td>{p.business}</td>
                    <td>{renderNoteBadge(p.notes)}</td>
                    <td align="center">
                      <div className="action-buttons-group">
                        <button
                          className="btn-quick-view-green"
                          title="Xem nhanh"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleQuickView(p);
                          }}
                        >
                          Xem nhanh &raquo;
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
                    <CriteriaRichBlock
                      key={detail.id || detail.criteriaId}
                      label={detail.tieuChi}
                      isRequired={detail.isRequired}
                      value={detail.noiDung || ''}
                    />
                  ))}

                  {/* Last Field: Product Image */}
                  <ProductImageCard imageUrl={quickViewDetails?.imageUrl} />
                </div>

                {/* Bottom Feedback Box */}
                <div className="quickview-card quickview-card--green-border">
                  <label className="quickview-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#AE1C3F', fontSize: '14px', fontWeight: 700 }}>
                    <img src={iconChat} alt="" width={16} height={16} />
                    <span>Bình luận phản hồi</span>
                  </label>
                  <textarea 
                    className="quickview-feedback-textarea"
                    rows={3}
                    placeholder="Nhập nội dung bình luận phản hồi..."
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
            {batchRequest?.status === 'PENDING_APPROVAL' && (() => {
              const currentTrim = (quickViewProduct.feedback || '').trim();
              const origTrim = (quickViewProduct.originalFeedback || '').trim();
              const isCommentModified = Boolean(currentTrim && currentTrim !== origTrim);

              return (
                <div className="quickview-actions-row">
                  <button className="btn-qv-reject" onClick={() => handleAction('REJECT')}>
                    Từ chối
                  </button>
                  {isCommentModified ? (
                    <button 
                      className="btn-qv-revision" 
                      onClick={() => handleAction('REVISION')}
                    >
                      Gửi lại chỉnh sửa
                    </button>
                  ) : (
                    <button 
                      className="btn-qv-reviewed" 
                      onClick={() => handleAction('REVIEWED')}
                    >
                      Đã xem
                    </button>
                  )}
                </div>
              );
            })()}

          </section>
        )}
      </main>

      {selectedDetailProductId && createPortal(
        (() => {
          const prod = products.find(p => p.id === selectedDetailProductId);
          return (
            <ApproverProductDetailPage 
              requestId={selectedDetailProductId} 
              initialNotes={prod?.notes}
              initialFeedback={prod?.feedback}
              isModal={true}
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
        })(),
        document.body
      )}
      <ApproveConfirmPopup
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={() => {
          setIsApproveConfirmOpen(false);
          handleApproveBatchSubmit();
        }}
        itemName={batchRequest?.name || 'Lô sản phẩm'}
      />

      <RejectReasonPopup
        isOpen={isRejectReasonOpen}
        onClose={() => setIsRejectReasonOpen(false)}
        onSubmit={(reason) => {
          setIsRejectReasonOpen(false);
          handleRejectBatchSubmit(reason);
        }}
      />
    </div>
  );
};

export default ApproverBatchDetailPage;