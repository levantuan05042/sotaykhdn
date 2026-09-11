import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import ProductImageCard from '../components/ui/ProductImageCard';
import CriteriaRichBlock from '../components/ui/CriteriaRichBlock';
import StatusBadge from '../components/ui/StatusBadge';
import AuditLogTimeline from '../components/AuditLogTimeline';
import CollapsibleRightCard from '../components/ui/CollapsibleRightCard';
import './ApproverProductDetailPage.css';

interface CommentItem {
  id: string;
  createdBy: string;
  createdByFullName?: string;
  createdAt: string;
  comment?: string;
  content?: string;
}

interface CriteriaItem {
  id: string;
  criteriaId?: string;
  tieuChi: string;
  noiDung: string;
  isRequired: boolean;
}

interface ProductDetail {
  id: string;
  name: string;
  status: string;
  active: boolean;
  createdBy: string;
  createdByFullName?: string;
  approvedBy: string;
  approvedByFullName?: string;
  createdAt: string;
  version: number;
  imageUrl: string;
  productGroupId: string;
  productGroupName: string;
  productCategoryId: string;
  productCategoryName: string;
  businessId: string;
  businessName: string;
  notes?: string;
  viewCount?: number | null;
  savedCount?: number | null;
  rejectReason?: string;
  details: CriteriaItem[];
  comments: CommentItem[];
}

export const ApproverProductSingleDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const fetchDetail = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT.DETAIL(productId));
      const data = Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : response.data;
      setDetail(data);

      if (data.comments && data.comments.length > 0) {
        setNewComment(data.comments[data.comments.length - 1].comment || data.comments[data.comments.length - 1].content || '');
      } else if (data.rejectReason) {
        setNewComment(data.rejectReason);
      }
    } catch (error) {
      console.error("Error fetching single product detail:", error);
      toast.error("Không thể tải chi tiết sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [productId]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.LIST);
        setCategories(response.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    const fetchProductGroups = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST);
        setProductGroups(response.data);
      } catch (error) {
        console.error("Error fetching product groups:", error);
      }
    };
    fetchCategories();
    fetchProductGroups();
  }, []);

  useEffect(() => {
    if (!detail?.productCategoryId) {
      setBusinesses([]);
      return;
    }
    const fetchBusinesses = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.APPROVER.PRODUCT_BUSINESS.LIST}?categoryIds=${detail.productCategoryId}`);
        setBusinesses(response.data);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      }
    };
    fetchBusinesses();
  }, [detail?.productCategoryId]);

  const handleBack = () => {
    navigate('/approver/products/single');
  };

  const handleSaveReview = async (notesVal: string) => {
    if (!productId || !detail) return;

    if ((notesVal === '1' || notesVal === '0') && !newComment.trim()) {
      if (notesVal === '1') {
        toast.error("Sản phẩm bị từ chối bắt buộc phải nhập nội dung comment!");
      } else {
        toast.error("Sản phẩm yêu cầu chỉnh sửa bắt buộc phải nhập nội dung comment!");
      }
      return;
    }

    try {
      const username = localStorage.getItem('currentUserUsername') || '';
      const branchCode = localStorage.getItem('currentUserBranchCode') || '';
      const approvedByStr = username ? `${username}_${branchCode}` : '';

      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT.REVIEW(productId), {
        notes: notesVal,
        comment: newComment.trim(),
        approvedBy: approvedByStr
      });

      const labelMap: Record<string, string> = {
        '0': 'Yêu cầu chỉnh sửa',
        '1': 'Từ chối',
        '2': 'Duyệt',
        '3': 'Đã Review',
        'REVIEWED': 'Đã Review'
      };
      toast.success(`Đã lưu đánh giá (${labelMap[notesVal] || notesVal}) thành công!`);
      setAuditRefreshKey((prev) => prev + 1);
      fetchDetail();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi thực hiện đánh giá!");
    } finally {
      setLoading(false);
    }
  };

  const formatDateDDMMYYYY = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading && !detail) {
    return <LoadingOverlay />;
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin sản phẩm lẻ</p>
      </div>
    );
  }

  const origComment = (detail?.comments?.[detail.comments.length - 1]?.comment || detail?.comments?.[detail.comments.length - 1]?.content || detail?.rejectReason || '').trim();
  const currentComment = newComment.trim();
  const isCommentModified = Boolean(currentComment && currentComment !== origComment);

  return (
    <div className="single-product-detail-page">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-back-only" onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#595959" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px' }}>
            <span style={{ color: '#8C8C8C', fontWeight: 500 }}>Sản phẩm lẻ</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span style={{ color: '#171717', fontWeight: 600 }}>{detail.name}</span>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {detail.status === 'PENDING_APPROVAL' && (
            <>
              <button
                className="btn-reject"
                onClick={() => handleSaveReview('1')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#171717',
                  border: '1px solid #d9d9d9',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Từ chối
              </button>

              {isCommentModified ? (
                <button
                  className="btn-revision-request-yellow"
                  onClick={() => handleSaveReview('0')}
                  style={{
                    backgroundColor: '#FEF08A',
                    color: '#854D0E',
                    border: '1px solid #FEF08A',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Yêu cầu chỉnh sửa
                </button>
              ) : (
                <button
                  className="btn-action-approve"
                  onClick={() => handleSaveReview('2')}
                  style={{
                    backgroundColor: '#053E2B',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Duyệt
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="detail-main-container">

        {/* LEFT COLUMN: FORM */}
        <section className="detail-left-panel">
          <div className="detail-form-card shadow-sm">
            <div className="form-group">
              <label className="form-label">
                Nhóm sản phẩm <span className="form-label-required">(*)</span>
              </label>
              <select
                className="form-select"
                value={detail.productGroupId || ''}
                disabled
              >
                <option value="">Chọn nhóm sản phẩm</option>
                {productGroups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">Danh mục sản phẩm</label>
                <select
                  className="form-select"
                  value={detail.productCategoryId || ''}
                  disabled
                >
                  <option value="">Chọn danh mục sản phẩm</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nghiệp vụ</label>
                <select
                  className="form-select"
                  value={detail.businessId || ''}
                  disabled
                >
                  <option value="">Chọn nghiệp vụ</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Tên sản phẩm dịch vụ <span className="form-label-required">(*)</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={detail.name || ''}
                readOnly
              />
            </div>

            {/* Dynamic Criteria Fields */}
            {detail.details?.map((item: any, index: number) => (
              <CriteriaRichBlock
                key={item.criteriaId || index}
                label={item.tieuChi}
                isRequired={item.isRequired}
                value={item.noiDung || ''}
              />
            ))}

            {/* Product Image */}
            <ProductImageCard imageUrl={detail.imageUrl} />
          </div>

          <AuditLogTimeline objectCode={detail.id} refreshKey={auditRefreshKey} />
        </section>

        {/* RIGHT COLUMN: INFO PANEL & COMMENTS */}
        <section className="detail-right-panel">

          {/* Trạng thái sản phẩm & Trạng thái hiển thị */}
          <CollapsibleRightCard title="Trạng thái" className="right-card shadow-sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 className="right-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  Trạng thái sản phẩm
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </h3>
                <StatusBadge status={detail.status || 'PENDING_APPROVAL'} />
              </div>

              <div style={{ borderTop: '1px solid #E3DFE6', paddingTop: '12px' }}>
                <h3 className="right-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  Trạng thái hiển thị
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </h3>
                <select
                  className="form-select"
                  value={detail.active ? 'Hiển thị' : 'Ẩn'}
                  disabled
                >
                  <option value="Ẩn">Ẩn</option>
                  <option value="Hiển thị">Hiển thị</option>
                </select>
              </div>
            </div>
          </CollapsibleRightCard>

          {/* Thông tin sản phẩm */}
          <CollapsibleRightCard title="Thông tin sản phẩm" className="right-card shadow-sm">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
            }}>
              {/* Row 1: Người tạo & Người Phê duyệt */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Người tạo</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatApprovedBy(detail.createdByFullName || detail.createdBy)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Người Phê duyệt</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatApprovedBy(detail.approvedByFullName || detail.approvedBy)}</span>
                </div>
              </div>

              {/* Row 2: Thời gian tạo & Phiên bản */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Thời gian tạo</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {detail.createdAt ? formatDateDDMMYYYY(detail.createdAt) : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Phiên bản</span>
                  <div>
                    <span style={{
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-block'
                    }}>Phiên bản {detail.version || 1}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '2px 0' }} />

              {/* Row 3: Lượt xem & Lượt lưu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '13px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Lượt xem</span>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                    {detail.viewCount !== null && detail.viewCount !== undefined ? detail.viewCount : 'Chưa có'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '13px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Lượt lưu</span>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                    {detail.savedCount !== null && detail.savedCount !== undefined ? detail.savedCount : 0}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '2px 0' }} />

              {/* Row 4 (Single Product): Trạng thái instead of Ghi chú, NO Thuộc yêu cầu, NO Thời gian tạo yêu cầu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Trạng thái</span>
                <div>
                  <StatusBadge status={detail.status || 'PENDING_APPROVAL'} />
                </div>
              </div>

            </div>
          </CollapsibleRightCard>

          {/* Bình luận phản hồi */}
          <div className="comments-container shadow-sm">
            <h2 className="comments-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AE1C3F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Bình luận phản hồi</span>
            </h2>

            <div className="comment-input-area">
              <textarea
                className="comment-textarea"
                rows={4}
                placeholder="Nhập nội dung bình luận phản hồi..."
                value={newComment}
                disabled={detail.status !== 'PENDING_APPROVAL'}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>

        </section>

      </main>
    </div>
  );
};

export default ApproverProductSingleDetailPage;

