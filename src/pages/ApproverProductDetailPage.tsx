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
import './ApproverProductDetailPage.css';

interface ApproverProductDetailPageProps {
  requestId?: string;
  onClose?: (updatedData?: { notes: string | null; feedback: string }) => void;
  initialNotes?: string | null;
  initialFeedback?: string;
  isModal?: boolean;
}

const ApproverProductDetailPage: React.FC<ApproverProductDetailPageProps> = ({ requestId: propRequestId, onClose, initialNotes, initialFeedback, isModal = false }) => {
  const { requestId: routeRequestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const activeRequestId = propRequestId || routeRequestId || '1';

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!activeRequestId) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT.DETAIL(activeRequestId));
        const data = Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : response.data;
        if (initialNotes !== undefined) {
          data.notes = initialNotes;
        }
        setDetail(data);
        if (initialFeedback !== undefined) {
          setNewComment(initialFeedback);
        } else if (data.comments && data.comments.length > 0) {
          setNewComment(data.comments[data.comments.length - 1].comment || '');
        } else if (data.rejectReason) {
          setNewComment(data.rejectReason);
        }
      } catch (error) {
        console.error("Error fetching product detail:", error);
        toast.error("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [activeRequestId, initialNotes, initialFeedback]);

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

  const handleFieldChange = (key: string, value: any) => {
    setDetail((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value
      };
    });
  };

  const handleBack = () => {
    if (onClose) {
      onClose({
        notes: detail?.notes || null,
        feedback: newComment
      });
    } else {
      navigate(-1);
    }
  };

  const handleSaveReview = async (notesVal: string) => {
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

      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT.REVIEW(detail.id), {
        notes: notesVal,
        comment: newComment.trim(),
        approvedBy: approvedByStr
      });

      setDetail((prev: any) => ({
        ...prev,
        notes: notesVal
      }));

      const labelMap: Record<string, string> = {
        '0': 'Yêu cầu chỉnh sửa',
        '1': 'Từ chối',
        '2': 'Duyệt',
        '3': 'Đã Review',
        'REVIEWED': 'Đã Review'
      };
      toast.success(`Đã lưu đánh giá (${labelMap[notesVal] || notesVal}) thành công!`);

      if (onClose) {
        onClose({ notes: notesVal, feedback: newComment.trim() });
      }
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Không thể lưu đánh giá sản phẩm!");
    }
  };

  const formatDateDDMMYYYY = (dateStr?: any) => {
    if (!dateStr) return '—';
    if (Array.isArray(dateStr)) {
      const year = dateStr[0];
      const month = String(dateStr[1]).padStart(2, '0');
      const day = String(dateStr[2]).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderNoteBadge = (notesValue: string | null) => {
    if (notesValue === '0') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: '#FEF9C3',
          color: '#854D0E'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Yêu cầu chỉnh sửa
        </span>
      );
    }
    if (notesValue === '1') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: '#FEE2E2',
          color: '#991B1B'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Từ chối
        </span>
      );
    }
    if (notesValue === '3' || notesValue === 'REVIEWED') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: '#D1FAE5',
          color: '#065F46'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Đã review
        </span>
      );
    }
    if (notesValue === '2') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: '#D1FAE5',
          color: '#065F46'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Đã duyệt
        </span>
      );
    }
    return <span style={{ color: '#8C8C8C' }}>Chưa có</span>;
  };

  if (loading || !detail) {
    if (isModal) {
      return (
        <div className={`single-product-detail-page is-modal`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div className="quickview-loading-card">
            Đang tải chi tiết sản phẩm...
          </div>
        </div>
      );
    }
    return <LoadingOverlay />;
  }

  return (
    <div className={`single-product-detail-page ${isModal ? 'is-modal' : ''}`}>
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
            <span style={{ color: '#8C8C8C', fontWeight: 500 }}>Lô {detail.requestName || '1250384'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span style={{ color: '#171717', fontWeight: 600 }}>{detail.name}</span>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {(detail.status === 'PENDING_APPROVAL' || detail.requestStatus === 'PENDING_APPROVAL') && (() => {
            const origComment = (initialFeedback || detail?.comments?.[detail.comments.length - 1]?.comment || detail?.rejectReason || '').trim();
            const currentComment = newComment.trim();
            const isCommentModified = Boolean(currentComment && currentComment !== origComment);

            return (
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
                    onClick={() => handleSaveReview('3')}
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
                    Đã review
                  </button>
                )}
              </>
            );
          })()}
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
              onChange={(e) => {
                const grpId = e.target.value;
                const grpName = productGroups.find(g => g.id === grpId)?.name || '';
                setDetail((prev: any) => ({
                  ...prev,
                  productGroupId: grpId,
                  productGroupName: grpName
                }));
              }}
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
                onChange={(e) => {
                  const catId = e.target.value;
                  const catName = categories.find(c => c.id === catId)?.name || '';
                  setDetail((prev: any) => ({
                    ...prev,
                    productCategoryId: catId,
                    productCategoryName: catName,
                    businessId: '',
                    businessName: ''
                  }));
                }}
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
                onChange={(e) => {
                  const busId = e.target.value;
                  const busName = businesses.find(b => b.id === busId)?.name || '';
                  setDetail((prev: any) => ({
                    ...prev,
                    businessId: busId,
                    businessName: busName
                  }));
                }}
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

          {/* Last Field: Product Image */}
          <ProductImageCard imageUrl={detail.imageUrl} />

        </section>

        {/* RIGHT COLUMN: INFO PANEL & COMMENTS */}
        <section className="detail-right-panel">

          {/* Trạng thái sản phẩm & Trạng thái hiển thị */}
          <div className="right-card shadow-sm">
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
                <StatusBadge status={detail.requestStatus || detail.status || 'PENDING_APPROVAL'} />
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
                  onChange={(e) => handleFieldChange('active', e.target.value === 'Hiển thị')}
                >
                  <option value="Ẩn">Ẩn</option>
                  <option value="Hiển thị">Hiển thị</option>
                </select>
              </div>
            </div>
          </div>

          {/* Thông tin sản phẩm */}
          <div className="right-card shadow-sm">
            <h3 className="right-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Thông tin sản phẩm</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>

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
                    }}>
                      {detail.version !== null && detail.version !== undefined ? `Phiên bản ${detail.version}` : '---'}
                    </span>
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

              {/* Row 4: Thuộc yêu cầu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Thuộc yêu cầu</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#053E2B', textDecoration: 'underline', cursor: 'pointer' }}>
                  {detail.requestName || '—'}
                </span>
              </div>

              {/* Row 5: Thời gian tạo yêu cầu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Thời gian tạo yêu cầu</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {detail.requestCreatedAt ? formatDateDDMMYYYY(detail.requestCreatedAt) : '—'}
                </span>
              </div>

              {/* Row 6: Ghi chú */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Ghi chú</span>
                <div>{renderNoteBadge(detail.notes)}</div>
              </div>

            </div>
          </div>

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
                disabled={detail.status !== 'PENDING_APPROVAL' && detail.requestStatus !== 'PENDING_APPROVAL'}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>

        </section>

      </main>
    </div>
  );
};

export default ApproverProductDetailPage;
