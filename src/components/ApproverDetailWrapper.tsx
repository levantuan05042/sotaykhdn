import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import RejectReasonPopup from './RejectReasonPopup';
import ApproveConfirmPopup from './ApproveConfirmPopup';
import AuditLogTimeline from './AuditLogTimeline';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverDetailWrapper.css';

interface CommentItem {
  id: string;
  createdBy: string;
  createdAt: string;
  content?: string;
  comment?: string;
}

interface ApproverDetailWrapperProps {
  moduleName: string;
  itemName: string;
  objectCode?: string;
  status: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
  comments: CommentItem[];
  isPending: boolean;
  loading: boolean;
  onBack: () => void;
  onSaveReview: (status: string, comment: string) => Promise<void>;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Lưu nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  ACTIVE: 'Đã duyệt',
  REJECTED: 'Từ chối',
  NEEDS_REVISION: 'Yêu cầu sửa đổi',
};

const mapModuleBreadcrumb = (name: string) => {
  const clean = name.toLowerCase().trim();
  if (clean === 'tiêu chí') return 'Tiêu chí sản phẩm';
  if (clean === 'nhóm sản phẩm') return 'Nhóm sản phẩm';
  if (clean === 'danh mục sản phẩm') return 'Danh mục sản phẩm';
  if (clean === 'nghiệp vụ') return 'Nghiệp vụ sản phẩm';
  if (clean === 'sản phẩm') return 'Sản phẩm';
  return name;
};

export const ApproverDetailWrapper: React.FC<ApproverDetailWrapperProps> = ({
  moduleName,
  itemName,
  objectCode,
  status,
  createdBy,
  approvedBy,
  createdAt,
  version,
  comments,
  isPending,
  loading,
  onBack,
  onSaveReview,
  children,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectReasonOpen, setIsRejectReasonOpen] = useState(false);

  const handleApprove = () => {
    setIsApproveConfirmOpen(true);
  };

  const handleReject = () => {
    setIsRejectReasonOpen(true);
  };

  return (
    <div className="approver-detail-wrapper">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-back-only" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <span style={{ color: '#8C8C8C', fontWeight: 500 }}>{mapModuleBreadcrumb(moduleName)}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span style={{ color: '#171717', fontWeight: 600 }}>{itemName}</span>
          </div>

          <span className={`status-badge-text badge--${status.toLowerCase()}`} style={{ marginLeft: '12px', fontSize: '15px', padding: '4px 10px', borderRadius: '20px' }}>
            {STATUS_LABELS[status] || status}
          </span>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isPending && (
            <>
              <button 
                className="btn-action-reject" 
                onClick={handleReject} 
                disabled={loading}
              >
                Từ chối
              </button>
              {newComment.trim() !== '' ? (
                <button 
                  className="btn-action-revision" 
                  onClick={() => onSaveReview('NEEDS_REVISION', newComment)} 
                  disabled={loading}
                >
                  Yêu cầu chỉnh sửa
                </button>
              ) : (
                <button 
                  className="btn-action-approve" 
                  onClick={handleApprove} 
                  disabled={loading}
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
        
        {/* Left Column: Form Details */}
        <section className="detail-left-panel">
          <div className="detail-form-card shadow-sm">
            {children}
          </div>

          {/* Audit Log Timeline Card */}
          <AuditLogTimeline objectCode={objectCode} />
        </section>

        {/* Right Column: Metadata & Comments */}
        <section className="detail-right-panel">
          
          {/* Status Display Card */}
          <div className="status-display-card shadow-sm">
            <h3 className="card-title">Trạng thái hiển thị</h3>
            <select className="formSelect" disabled value={status === 'ACTIVE' ? 'active' : 'inactive'}>
              <option value="active">Hiển thị</option>
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
                  <span className="meta-value">{formatApprovedBy(createdBy)}</span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Người kiểm duyệt</span>
                  <span className="meta-value">{formatApprovedBy(approvedBy)}</span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Thời gian tạo</span>
                  <span className="meta-value">
                    {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : '---'}
                  </span>
                </div>
                <div className="meta-item-vertical">
                  <span className="meta-label">Phiên bản</span>
                  <span className="meta-value">
                    <span className="badge-version">Phiên bản {version || 1}</span>
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
              {comments && comments.map((comment) => {
                const dateStr = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('vi-VN') : '—';
                return (
                  <div className="comment-item" key={comment.id}>
                    <div className="comment-meta">
                      <div className="comment-avatar">
                        <img src="https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92" alt="Avatar" />
                      </div>
                      <div className="comment-author-info">
                        <span className="comment-author">{formatApprovedBy(comment.createdBy) || 'Cán bộ duyệt'}</span>
                        <span className="comment-date">{dateStr}</span>
                      </div>
                    </div>
                    <div className="comment-body">
                      {comment.content || comment.comment}
                    </div>
                  </div>
                );
              })}
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
              </div>
            )}
          </div>
        </section>

      </main>

      <ApproveConfirmPopup
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={async () => {
          setIsApproveConfirmOpen(false);
          await onSaveReview('ACTIVE', '');
        }}
        itemName={itemName}
      />

      <RejectReasonPopup
        isOpen={isRejectReasonOpen}
        onClose={() => setIsRejectReasonOpen(false)}
        onSubmit={async (reason) => {
          setIsRejectReasonOpen(false);
          await onSaveReview('REJECTED', reason);
        }}
      />
    </div>
  );
};

export default ApproverDetailWrapper;
