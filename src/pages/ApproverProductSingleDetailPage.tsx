import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import { getRandomAvatar } from '../utils/avatarUtils';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import ProductImageCard from '../components/ui/ProductImageCard';
import CriteriaRichBlock from '../components/ui/CriteriaRichBlock';
import StatusBadge from '../components/ui/StatusBadge';
import AuditLogTimeline from '../components/AuditLogTimeline';
import CollapsibleRightCard from '../components/ui/CollapsibleRightCard';
import iconChat from '../assets/icon/iconchat.svg';
import iconPen from '../assets/icon/iconpen.svg';
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
      setNewComment('');
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
        '3': 'Đã xem',
        'REVIEWED': 'Đã xem'
      };
      toast.success(`Đã lưu đánh giá (${labelMap[notesVal] || notesVal}) thành công!`);
      setNewComment('');
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

  const isCommentModified = Boolean(newComment.trim());

  return (
    <div className="single-product-detail-page">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm">
        <div className="header-left">
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

          <div className="detail-breadcrumb">
            <span className="detail-breadcrumb-muted">Sản phẩm lẻ</span>
            <span className="detail-breadcrumb-sep">&rsaquo;</span>
            <span className="detail-breadcrumb-active">{detail.name}</span>
          </div>
        </div>

        <div className="header-actions">
          {detail.status === 'PENDING_APPROVAL' && (
            <>
              <button
                className="btn-reject"
                onClick={() => handleSaveReview('1')}
              >
                Từ chối
              </button>

              {isCommentModified ? (
                <button
                  className="btn-revision-request-yellow"
                  onClick={() => handleSaveReview('0')}
                >
                  <img src={iconPen} alt="" />
                  Yêu cầu chỉnh sửa
                </button>
              ) : (
                <button
                  className="btn-action-approve"
                  onClick={() => handleSaveReview('2')}
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

          <div className="status-pair-card shadow-sm">
            <div className="status-pair-grid">
              <div className="status-pair-col">
                <span className="status-pair-label">Trạng thái sản phẩm</span>
                <StatusBadge status={detail.status || 'PENDING_APPROVAL'} />
              </div>
              <div className="status-pair-col">
                <span className="status-pair-label">Trạng thái hiển thị</span>
                <StatusBadge status={detail.active ? 'VISIBLE' : 'HIDDEN'} />
              </div>
            </div>
          </div>

          <div className="comments-container shadow-sm">
            <h2 className="comments-header">
              <img src={iconChat} alt="" className="comments-header-icon" />
              <span>Bình luận</span>
            </h2>

            {detail.comments && detail.comments.length > 0 ? (
              <div className="comments-list">
                {detail.comments.map((comment, index) => (
                  <div className="comment-item" key={comment.id || index}>
                    <div className="comment-meta">
                      <div className="comment-avatar">
                        <img src={getRandomAvatar(comment.createdBy)} alt="" />
                      </div>
                      <div className="comment-author-info">
                        <span className="comment-author">{formatApprovedBy(comment.createdByFullName || comment.createdBy) || 'Cán bộ duyệt'}</span>
                        <span className="comment-date">{formatDateDDMMYYYY(comment.createdAt)}</span>
                      </div>
                    </div>
                    <div className="comment-body">
                      {comment.content || comment.comment}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-comments">Chưa có bình luận nào</p>
            )}

            <div className="comment-input-area">
              <textarea
                className="comment-textarea"
                rows={3}
                placeholder="Nhập nội dung bình luận..."
                value={newComment}
                disabled={detail.status !== 'PENDING_APPROVAL'}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>

          <CollapsibleRightCard title="Thông tin sản phẩm" className="right-card shadow-sm" defaultOpen={false}>
            <div className="meta-info-white-box">
              {/* Row 1: Người tạo & Người Phê duyệt */}
              <div className="meta-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="meta-label">Người tạo</span>
                  <span className="meta-value">{formatApprovedBy(detail.createdByFullName || detail.createdBy)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="meta-label">Người Phê duyệt</span>
                  <span className="meta-value">{formatApprovedBy(detail.approvedByFullName || detail.approvedBy)}</span>
                </div>
              </div>

              {/* Row 2: Thời gian tạo & Phiên bản */}
              <div className="meta-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="meta-label">Thời gian tạo</span>
                  <span className="meta-value">
                    {detail.createdAt ? formatDateDDMMYYYY(detail.createdAt) : '—'}
                  </span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Phiên bản</span>
                  <div>
                    <span className="badge-version">Phiên bản {detail.version || 1}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '2px 0' }} />

              {/* Row 3: Lượt xem & Lượt lưu */}
              <div className="meta-grid">
                <div className="meta-item-vertical">
                  <div className="meta-label-row meta-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Lượt xem</span>
                  </div>
                  <span className="meta-value">
                    {detail.viewCount !== null && detail.viewCount !== undefined ? detail.viewCount : 'Chưa có'}
                  </span>
                </div>
                <div className="meta-item-vertical">
                  <div className="meta-label-row meta-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Lượt lưu</span>
                  </div>
                  <span className="meta-value">
                    {detail.savedCount !== null && detail.savedCount !== undefined ? detail.savedCount : 0}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '2px 0' }} />

              {/* Row 4 (Single Product): Trạng thái instead of Ghi chú, NO Thuộc yêu cầu, NO Thời gian tạo yêu cầu */}
              <div className="meta-item-vertical">
                <span className="meta-label">Trạng thái</span>
                <div>
                  <StatusBadge status={detail.status || 'PENDING_APPROVAL'} />
                </div>
              </div>

            </div>
          </CollapsibleRightCard>

        </section>

      </main>
    </div>
  );
};

export default ApproverProductSingleDetailPage;

