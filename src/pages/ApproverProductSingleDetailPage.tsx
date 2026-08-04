import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverProductSingleDetailPage.css';

interface CommentItem {
  id: string;
  createdBy: string;
  createdAt: string;
  comment: string;
}

interface CriteriaItem {
  id: string;
  criteriaId: string;
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
  approvedBy: string;
  createdAt: string;
  version: number;
  imageUrl: string;
  productGroupId: string;
  productGroupName: string;
  productCategoryId: string;
  productCategoryName: string;
  businessId: string;
  businessName: string;
  details: CriteriaItem[];
  comments: CommentItem[];
}

interface EditorBlockProps {
  label: string;
  value: string;
}

const EditorBlock: React.FC<EditorBlockProps> = ({ label, value }) => {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="editor-container disabled-editor">
        <textarea
          className="editor-textarea"
          rows={6}
          value={value}
          readOnly
        />
      </div>
    </div>
  );
};

export const ApproverProductSingleDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const fetchDetail = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT.DETAIL(productId));
      setDetail(response.data);
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

  // Load Groups and Categories metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [groupsRes, categoriesRes] = await Promise.all([
          axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST),
          axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST)
        ]);
        setProductGroups(groupsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };
    fetchMetadata();
  }, []);

  // Load businesses when category changes
  useEffect(() => {
    if (!detail?.productCategoryId) {
      setBusinesses([]);
      return;
    }
    const fetchBusinesses = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT_BUSINESS.LIST}?categoryIds=${detail.productCategoryId}`);
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

  const handleReview = async (notesVal: string) => {
    if (!productId || !detail) return;

    // Yêu cầu nhập lý do góp ý khi từ chối hoặc cần chỉnh sửa
    if ((notesVal === '0' || notesVal === '1') && !newComment.trim()) {
      toast.error("Vui lòng điền nội dung góp ý / lý do chỉnh sửa vào ô bình luận!");
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedBy = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.PRODUCT.REVIEW(productId), {
        notes: notesVal,
        comment: newComment.trim(),
        approvedBy: approvedBy
      });

      toast.success(
        notesVal === '2' 
          ? "Đã phê duyệt sản phẩm thành công!" 
          : notesVal === '0'
            ? "Đã gửi yêu cầu chỉnh sửa sản phẩm!"
            : "Đã từ chối sản phẩm thành công!"
      );
      setNewComment('');
      fetchDetail();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi thực hiện phê duyệt!");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="product-single-detail-page flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết sản phẩm lẻ...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="product-single-detail-page flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin sản phẩm lẻ</p>
      </div>
    );
  }

  const isPending = detail.status === 'PENDING_APPROVAL';

  return (
    <div className="product-single-detail-page">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Quay lại</span>
          </button>
          <div className="header-separator" />
          <h2 className="breadcrumb-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#595959' }}>Nhóm sản phẩm</span>
            <span style={{ color: '#8c8c8c', fontSize: '14px' }}>&rsaquo;</span>
            <span className="breadcrumb-active" style={{ fontWeight: 600 }}>{detail.name}</span>
          </h2>
          <span className="status-header-badge note-badge" style={{ marginLeft: '12px' }}>
            {detail.status === 'PENDING_APPROVAL' && <span className="status-label status-pending">Chờ duyệt</span>}
            {detail.status === 'ACTIVE' && <span className="status-label status-active">Đã duyệt</span>}
            {detail.status === 'REJECTED' && <span className="status-label status-rejected">Từ chối</span>}
            {detail.status === 'NEEDS_REVISION' && <span className="status-label status-revision">Cần chỉnh sửa</span>}
          </span>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isPending && (
            <>
              <button 
                className="btn-action-reject" 
                onClick={() => handleReview('1')} 
              >
                Từ chối
              </button>
              <button 
                className="btn-action-revision" 
                onClick={() => handleReview('0')} 
              >
                Yêu cầu chỉnh sửa
              </button>
              <button 
                className="btn-action-approve" 
                onClick={() => handleReview('2')} 
              >
                Duyệt
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="detail-main-container">
        
        {/* LEFT COLUMN: FORM */}
        <section className="detail-left-panel">
          
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
            <EditorBlock
              key={item.criteriaId || index}
              label={`${item.tieuChi} ${item.isRequired ? '(*)' : ''}`}
              value={item.noiDung || ''}
            />
          ))}

          {/* Last Field: Product Image */}
          {detail.imageUrl && (
            <div className="form-group">
              <label className="form-label">Ảnh sản phẩm</label>
              <div className="quickview-image-container" style={{ width: '100%', boxSizing: 'border-box' }}>
                <img 
                  src={new URL(`../assets/${detail.imageUrl}`, import.meta.url).href}
                  alt="Ảnh sản phẩm" 
                  className="quickview-product-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

        </section>

        {/* RIGHT COLUMN: INFO PANEL & COMMENTS */}
        <section className="detail-right-panel">
          
          {/* Trạng thái hiển thị */}
          <div className="right-card shadow-sm">
            <h3 className="right-card-title">
              Trạng thái hiển thị
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

          {/* Thông tin sản phẩm */}
          <div className="right-card shadow-sm" style={{ marginTop: '16px' }}>
            <h3 className="right-card-title">
              <span>Thông tin sản phẩm</span>
            </h3>
            <div className="product-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Người tạo</span>
                <span className="meta-value">{detail.createdBy || '—'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Người kiểm duyệt</span>
                <span className="meta-value">{formatApprovedBy(detail.approvedBy)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Thời gian tạo</span>
                <span className="meta-value">
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Phiên bản</span>
                <span className="version-tag">Phiên bản {detail.version || 1}</span>
              </div>
            </div>
          </div>

          {/* Bình luận */}
          <div className="comments-container shadow-sm" style={{ marginTop: '16px' }}>
            <h2 className="comments-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Bình luận</span>
            </h2>

            <div className="comments-list">
              {detail.comments && detail.comments.map((comment: any) => {
                const dateStr = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('vi-VN') : '—';
                return (
                  <div className="comment-item" key={comment.id}>
                    <div className="comment-meta">
                      <div className="comment-avatar">
                        <img src="https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92" alt="Avatar" />
                      </div>
                      <div className="comment-author-info">
                        <span className="comment-author">{comment.createdBy || 'Cán bộ duyệt'}</span>
                        <span className="comment-date">{dateStr}</span>
                      </div>
                    </div>
                    <div className="comment-body">
                      {comment.comment}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="comment-input-area">
              <textarea
                className="comment-textarea"
                rows={4}
                placeholder="Điền nội dung chỉnh sửa"
                value={newComment}
                disabled={!isPending}
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
