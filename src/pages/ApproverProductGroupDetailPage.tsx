import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import './ApproverProductGroupDetailPage.css';

interface CommentItem {
  id: string;
  createdBy: string;
  createdAt: string;
  content: string;
  comment?: string; // Tương thích trường comment
}

interface ProductGroupDetail {
  id: string;
  name: string;
  status: string;
  superGroup: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
  active: boolean;
  comments: CommentItem[];
}

const SUPER_GROUP_LABELS: Record<string, string> = {
  SERVICE: 'Chương trình dịch vụ',
  INSURANCE: 'Bảo hiểm',
  PROGRAM: 'Chương trình ưu đãi',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Lưu nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  ACTIVE: 'Đã duyệt',
  REJECTED: 'Từ chối',
  NEEDS_REVISION: 'Yêu cầu sửa đổi',
};

export const ApproverProductGroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ProductGroupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    // Gán mock user
    (window as any).currentUser = "Phạm Thùy Linh_001";
    localStorage.setItem('currentUser', "Phạm Thùy Linh_001");
  }, []);

  const fetchDetail = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL(groupId));
      // Tải comments từ danh sách
      const groupData = response.data;
      setDetail({
        id: groupData.id,
        name: groupData.name,
        status: groupData.status,
        superGroup: groupData.superGroup,
        createdBy: groupData.createdBy,
        approvedBy: groupData.approvedBy,
        createdAt: groupData.createdAt,
        version: groupData.version,
        active: groupData.active,
        comments: groupData.comments || [],
      });
    } catch (error) {
      console.error('Error loading product group details:', error);
      toast.error('Lỗi khi tải chi tiết nhóm sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [groupId]);

  const handleBack = () => {
    navigate('/approver/product-groups');
  };

  const handleSaveReview = async (statusVal: string, commentVal: string) => {
    if (!groupId || !detail) return;
    
    // Kiểm tra comment bắt buộc khi Từ chối hoặc Yêu cầu sửa
    if ((statusVal === 'REJECTED' || statusVal === 'NEEDS_REVISION') && !commentVal.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý / lý do chỉnh sửa!');
      return;
    }

    const approvedBy = localStorage.getItem('currentUser') || 'Phạm Thùy Linh_001';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.PRODUCT_GROUPS.REVIEW(groupId), {
        status: statusVal,
        comment: commentVal,
        approvedBy: approvedBy,
      });

      toast.success(statusVal === 'ACTIVE' ? 'Phê duyệt nhóm sản phẩm thành công!' : 'Đã phản hồi ý kiến đánh giá!');
      setNewComment('');
      fetchDetail();
    } catch (error: any) {
      console.error('Lỗi khi lưu phê duyệt nhóm sản phẩm:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="product-group-detail-page flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết nhóm sản phẩm...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="product-group-detail-page flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin nhóm sản phẩm</p>
      </div>
    );
  }

  const isPending = detail.status === 'PENDING_APPROVAL';

  return (
    <div className="product-group-detail-page">
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
            <span style={{ color: '#595959' }}>Phê duyệt nhóm sản phẩm</span>
            <span style={{ color: '#8c8c8c', fontSize: '14px' }}>&rsaquo;</span>
            <span className="breadcrumb-active" style={{ fontWeight: 600 }}>{detail.name}</span>
          </h2>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="header-notes-label" style={{ fontSize: '13px', color: '#595959', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Trạng thái:</span>
            <span className={`status-badge-text badge--${detail.status.toLowerCase()}`}>
              {STATUS_LABELS[detail.status] || detail.status}
            </span>
          </span>
          {isPending && (
            <>
              <button 
                className="btn-action-reject" 
                onClick={() => {
                  if (!newComment.trim()) {
                    toast.error("Vui lòng điền nội dung lý do phản hồi vào khung Bình luận bên phải trước khi Từ chối!");
                  } else {
                    handleSaveReview('REJECTED', newComment);
                  }
                }} 
              >
                Từ chối
              </button>
              <button 
                className="btn-action-approve" 
                onClick={() => handleSaveReview('ACTIVE', newComment || 'Đã phê duyệt')} 
              >
                Duyệt
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="detail-main-container">
        
        {/* Left Column: Form Details */}
        <section className="detail-left-panel">
          <div className="detail-left-card">
            <div className="formGroup">
              <label className="formLabel">Thuộc nhóm <span className="required-asterisk">(*)</span></label>
              <input 
                type="text" 
                className="formInput readonly" 
                value={SUPER_GROUP_LABELS[detail.superGroup] || detail.superGroup} 
                readOnly 
              />
            </div>

            <div className="formGroup">
              <label className="formLabel">Nhóm sản phẩm</label>
              <input 
                type="text" 
                className="formInput readonly" 
                value={detail.name} 
                readOnly 
              />
            </div>
          </div>
        </section>

        {/* Right Column: Metadata & Comments */}
        <section className="detail-right-panel">
          
          {/* Status Display Card */}
          <div className="status-display-card shadow-sm">
            <h3 className="card-title">Trạng thái hiển thị</h3>
            <select className="formSelect" disabled value={detail.active ? 'active' : 'inactive'}>
              <option value="active">Hiện</option>
              <option value="inactive">Ẩn</option>
            </select>
          </div>

          {/* Metadata Card */}
          <div className="meta-info-card shadow-sm" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Thông tin sản phẩm</h3>
            <div className="meta-info-white-box">
              <div className="meta-grid">
                <div className="meta-item-vertical">
                  <span className="meta-label">Người tạo</span>
                  <span className="meta-value">{detail.createdBy || '---'}</span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Người kiểm duyệt</span>
                  <span className="meta-value">{detail.approvedBy || '---'}</span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Thời gian tạo</span>
                  <span className="meta-value">
                    {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('vi-VN') : '---'}
                  </span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Phiên bản</span>
                  <span className="meta-value">
                    <span className="badge-version">Phiên bản {detail.version || 1}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Card */}
          <div className="comments-container shadow-sm" style={{ marginTop: '16px' }}>
            <h3 className="comments-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Bình luận</span>
            </h3>

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
                      {comment.content || comment.comment}
                    </div>
                  </div>
                );
              })}
              {(!detail.comments || detail.comments.length === 0) && (
                <p className="no-comments">Chưa có bình luận hay góp ý nào.</p>
              )}
            </div>

            {isPending && (
              <div className="comment-input-area">
                <textarea
                  className="comment-textarea"
                  rows={3}
                  placeholder="Nhập nội dung chỉnh sửa..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="comment-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button 
                    className="btn-comment-clear"
                    onClick={() => setNewComment('')}
                  >
                    Huỷ
                  </button>
                  <button 
                    className="btn-comment-revision"
                    onClick={() => handleSaveReview('NEEDS_REVISION', newComment)}
                    disabled={!newComment.trim()}
                  >
                    Yêu cầu chỉnh sửa
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default ApproverProductGroupDetailPage;
