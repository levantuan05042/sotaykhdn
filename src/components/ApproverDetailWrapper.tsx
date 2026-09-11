import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import RejectReasonPopup from './RejectReasonPopup';
import ApproveConfirmPopup from './ApproveConfirmPopup';
import AuditLogTimeline from './AuditLogTimeline';
import CollapsibleRightCard from './ui/CollapsibleRightCard';
import StatusBadge from './ui/StatusBadge';
import { formatApprovedBy } from '../utils/formatUtils';
import { getRandomAvatar } from '../utils/avatarUtils';
import iconChat from '../assets/icon/iconchat.svg';
import iconPen from '../assets/icon/iconpen.svg';
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
  isActive?: boolean;
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
  isActive = false,
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

  const submitReview = async (statusVal: string, commentVal: string) => {
    await onSaveReview(statusVal, commentVal);
    setNewComment('');
  };

  const formatCommentDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="approver-detail-wrapper">
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm">
        <div className="header-left">
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

          <div className="detail-breadcrumb">
            <span className="detail-breadcrumb-muted">{mapModuleBreadcrumb(moduleName)}</span>
            <span className="detail-breadcrumb-sep">&rsaquo;</span>
            <span className="detail-breadcrumb-active">{itemName}</span>
          </div>

          <span className={`status-badge-text badge--${status.toLowerCase()}`} style={{ marginLeft: '8px', fontSize: '15px', padding: '4px 10px', borderRadius: '20px' }}>
            {STATUS_LABELS[status] || status}
          </span>
        </div>

        <div className="header-actions">
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
                  onClick={() => submitReview('NEEDS_REVISION', newComment)} 
                  disabled={loading}
                >
                  <img src={iconPen} alt="" />
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
          <AuditLogTimeline objectCode={objectCode} refreshKey={status} />
        </section>

        {/* Right Column: Metadata & Comments */}
        <section className="detail-right-panel">

          <div className="status-pair-card shadow-sm">
            <div className="status-pair-grid">
              <div className="status-pair-col">
                <span className="status-pair-label">Trạng thái sản phẩm</span>
                <StatusBadge status={status} />
              </div>
              <div className="status-pair-col">
                <span className="status-pair-label">Trạng thái hiển thị</span>
                <StatusBadge status={isActive ? 'VISIBLE' : 'HIDDEN'} />
              </div>
            </div>
          </div>

          <div className="comments-container shadow-sm">
            <h3 className="comments-header">
              <img src={iconChat} alt="" className="comments-header-icon" />
              <span>Bình luận</span>
            </h3>

            {comments && comments.length > 0 ? (
              <div className="comments-list">
                {comments.map((comment, index) => (
                  <div className="comment-item" key={comment.id || index}>
                    <div className="comment-meta">
                      <div className="comment-avatar">
                        <img src={getRandomAvatar(comment.createdBy)} alt="" />
                      </div>
                      <div className="comment-author-info">
                        <span className="comment-author">{formatApprovedBy(comment.createdBy) || 'Cán bộ duyệt'}</span>
                        <span className="comment-date">{formatCommentDate(comment.createdAt)}</span>
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

            {isPending && (
              <div className="comment-input-area">
                <textarea
                  className="comment-textarea"
                  rows={3}
                  placeholder="Nhập nội dung bình luận..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
            )}
          </div>

          <CollapsibleRightCard title="Thông tin sản phẩm" className="meta-info-card shadow-sm" defaultOpen={false}>
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
          </CollapsibleRightCard>
        </section>

      </main>

      <ApproveConfirmPopup
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={async () => {
          setIsApproveConfirmOpen(false);
          await submitReview('ACTIVE', '');
        }}
        itemName={itemName}
      />

      <RejectReasonPopup
        isOpen={isRejectReasonOpen}
        onClose={() => setIsRejectReasonOpen(false)}
        onSubmit={async (reason) => {
          setIsRejectReasonOpen(false);
          await submitReview('REJECTED', reason);
        }}
      />
    </div>
  );
};

export default ApproverDetailWrapper;
