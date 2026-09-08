import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_ENDPOINTS, toDisplayUrl } from '../../config/apiConfig';
import type { VersionItem } from './ProductInfoCard';

export type VersionItemType = 'product' | 'group' | 'category' | 'business' | 'criteria';

interface VersionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: VersionItemType;
  versionItem: VersionItem | null;
}

export const VersionDetailModal: React.FC<VersionDetailModalProps> = ({
  isOpen,
  onClose,
  itemType,
  versionItem,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !versionItem?.id) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let endpoint = '';
        switch (itemType) {
          case 'product':
            endpoint = API_ENDPOINTS.PRODUCT.DETAIL(versionItem.id);
            break;
          case 'group':
            endpoint = API_ENDPOINTS.PRODUCT_GROUPS.DETAIL(versionItem.id);
            break;
          case 'category':
            endpoint = API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL(versionItem.id);
            break;
          case 'business':
            endpoint = API_ENDPOINTS.PRODUCT_BUSINESS.DETAIL(versionItem.id);
            break;
          case 'criteria':
            endpoint = API_ENDPOINTS.PRODUCT_CRITERIA.DETAIL(versionItem.id);
            break;
        }

        const res = await axios.get(endpoint);
        if (isMounted) {
          setData(res.data?.data || res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Lỗi tải chi tiết phiên bản:", err);
          setError(err.response?.data?.message || 'Không thể tải chi tiết phiên bản này.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, versionItem?.id, itemType]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !versionItem) return null;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#E0F9EC', text: '#14532D', label: 'Đang áp dụng' };
      case 'DRAFT':
        return { bg: '#F3F4F6', text: '#4B5563', label: 'Bản nháp' };
      case 'PENDING_APPROVAL':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Chờ duyệt' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Từ chối' };
      case 'ARCHIVED':
        return { bg: '#EFF6FF', text: '#1E40AF', label: 'Lưu trữ' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: status || '---' };
    }
  };

  const badge = getStatusBadge(data?.status || versionItem.status);
  const versionTitle = versionItem.version !== null && versionItem.version !== undefined
    ? `Phiên bản ${versionItem.version}`
    : (versionItem.status === 'DRAFT' ? 'Bản nháp' : 'Phiên bản mới');

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#B01E3E',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Đang tải nội dung phiên bản...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#DC2626' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      );
    }

    if (!data) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* THÔNG TIN CHUNG */}
        <div style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Người tạo</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
              {data.createdByFullName || versionItem.createdByFullName || '---'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Người kiểm duyệt</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
              {data.approvedByFullName || versionItem.approvedByFullName || '---'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Thời gian tạo</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
              {data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : (versionItem.createdAt || '---')}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Hiệu lực</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: data.active ? '#15803D' : '#9CA3AF' }}>
              {data.active ? 'Hoạt động' : 'Tạm khóa'}
            </span>
          </div>
        </div>

        {/* NỘI DUNG CHI TIẾT THEO ITEM TYPE */}
        {itemType === 'product' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '10px' }}>
            {/* Nhóm sản phẩm */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nhóm sản phẩm
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                {data.productGroupName || data.productGroup?.name || '---'}
              </div>
            </div>

            {/* Danh mục sản phẩm & Nghiệp vụ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Danh mục sản phẩm
                </label>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                  {data.productCategoryName || data.productCategory?.name || '---'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Nghiệp vụ
                </label>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                  {data.businessName || data.business?.name || '---'}
                </div>
              </div>
            </div>
            {(() => {
              const criteriaList = (data.details && Array.isArray(data.details) && data.details.length > 0)
                ? data.details
                : (data.criteria && Array.isArray(data.criteria) ? data.criteria : []);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                    Danh sách tiêu chí {criteriaList.length > 0 ? `(${criteriaList.length})` : ''}
                  </label>
                  {criteriaList.length > 0 ? (
                    criteriaList.map((c: any, idx: number) => {
                      const rawName = c.tieuChi || c.criteriaName || c.name || `Tiêu chí #${idx + 1}`;
                      const cName = rawName.replace(/\s*\(\*\)/g, '');
                      const isReq = Boolean(c.isRequired ?? c.required);
                      const val = c.noiDung || c.value || '';
                      const isHtml = /<[a-z][\s\S]*>/i.test(val);

                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                              {cName}
                            </span>
                            {isReq && <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '13px' }}>(*)</span>}
                          </div>
                          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', fontSize: '14px', color: '#1F2937', lineHeight: '1.6', wordBreak: 'break-word' }}>
                            {val && val.trim() ? (
                              isHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: val }} />
                              ) : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{val}</div>
                              )
                            ) : (
                              <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Chưa có nội dung</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
                      Không có tiêu chí nào trong phiên bản này.
                    </div>
                  )}
                </div>
              );
            })()}

            {data.imageUrl && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Ảnh sản phẩm
                </label>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', display: 'inline-block' }}>
                  <img
                    src={toDisplayUrl(data.imageUrl)}
                    alt={data.name || 'Sản phẩm'}
                    style={{ maxWidth: '180px', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              </div>
            )}
            {data.comments && Array.isArray(data.comments) && data.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                  Bình luận phản hồi ({data.comments.length})
                </label>
                {data.comments.map((cm: any, cIdx: number) => (
                  <div key={cm.id || cIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>{cm.createdBy || 'Người kiểm duyệt'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{cm.createdAt ? new Date(cm.createdAt).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>{cm.comment || cm.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {itemType === 'group' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên nhóm sản phẩm
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937', fontWeight: 600 }}>
                {data.name || '---'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nhóm sản phẩm cấp cao
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                {data.superGroup === 'SERVICE' ? 'Sản phẩm dịch vụ' : data.superGroup === 'INSURANCE' ? 'Sản phẩm bảo hiểm' : data.superGroup === 'PROGRAM' ? 'Chương trình ưu đãi' : (data.superGroup || '---')}
              </div>
            </div>

            {/* Bình luận phản hồi */}
            {data.comments && Array.isArray(data.comments) && data.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                  Bình luận phản hồi ({data.comments.length})
                </label>
                {data.comments.map((cm: any, cIdx: number) => (
                  <div key={cm.id || cIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>{cm.createdBy || 'Người kiểm duyệt'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{cm.createdAt ? new Date(cm.createdAt).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>{cm.comment || cm.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {itemType === 'category' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên danh mục
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937', fontWeight: 600 }}>
                {data.name || '---'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nhóm sản phẩm trực thuộc
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                {data.groupName || data.productGroupName || data.productGroup?.name || '---'}
              </div>
            </div>

            {/* Bình luận phản hồi */}
            {data.comments && Array.isArray(data.comments) && data.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                  Bình luận phản hồi ({data.comments.length})
                </label>
                {data.comments.map((cm: any, cIdx: number) => (
                  <div key={cm.id || cIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>{cm.createdBy || 'Người kiểm duyệt'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{cm.createdAt ? new Date(cm.createdAt).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>{cm.comment || cm.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {itemType === 'business' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên nghiệp vụ
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937', fontWeight: 600 }}>
                {data.name || '---'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Danh mục sản phẩm trực thuộc
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937' }}>
                {data.categoryName || data.productCategoryName || data.productCategory?.name || '---'}
              </div>
            </div>

            {/* Bình luận phản hồi */}
            {data.comments && Array.isArray(data.comments) && data.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                  Bình luận phản hồi ({data.comments.length})
                </label>
                {data.comments.map((cm: any, cIdx: number) => (
                  <div key={cm.id || cIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>{cm.createdBy || 'Người kiểm duyệt'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{cm.createdAt ? new Date(cm.createdAt).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>{cm.comment || cm.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {itemType === 'criteria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Mã tiêu chí
                </label>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#111827', fontWeight: 700 }}>
                  {data.code || '---'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Bắt buộc
                </label>
                <div style={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E5E7EB', 
                  borderRadius: '6px', 
                  padding: '10px 14px', 
                  fontSize: '14px', 
                  color: (data.isRequired ?? data.required) ? '#DC2626' : '#6B7280', 
                  fontWeight: 600 
                }}>
                  {(data.isRequired ?? data.required) ? 'Bắt buộc' : 'Không bắt buộc'}
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên tiêu chí
              </label>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: '#1F2937', fontWeight: 600 }}>
                {data.name || '---'}
              </div>
            </div>

            {/* Nhóm sản phẩm áp dụng */}
            {(() => {
              const groupsList = (data.productGroups && (Array.isArray(data.productGroups) ? data.productGroups : Array.from(data.productGroups)).length > 0)
                ? (Array.isArray(data.productGroups) ? data.productGroups : Array.from(data.productGroups))
                : (data.groups && Array.isArray(data.groups) ? data.groups : []);

              return (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Nhóm sản phẩm áp dụng
                  </label>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {groupsList.length > 0 ? (
                      groupsList.map((g: any, idx: number) => (
                        <span key={idx} style={{ backgroundColor: '#F3F4F6', color: '#1F2937', borderRadius: '6px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, border: '1px solid #E5E7EB' }}>
                          {g.name || g.label || g}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '13px' }}>Chưa chọn nhóm sản phẩm</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bình luận phản hồi */}
            {data.comments && Array.isArray(data.comments) && data.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                  Bình luận phản hồi ({data.comments.length})
                </label>
                {data.comments.map((cm: any, cIdx: number) => (
                  <div key={cm.id || cIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>{cm.createdBy || 'Người kiểm duyệt'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{cm.createdAt ? new Date(cm.createdAt).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>{cm.comment || cm.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const modalNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'modalFadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          animation: 'modalZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFA'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#FDEBEB',
              color: '#B01E3E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                Chi tiết {versionTitle}
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: badge.bg,
                color: badge.text,
                borderRadius: '100px',
                padding: '2px 8px',
              }}>
                {badge.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {renderContent()}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          backgroundColor: '#FAFAFA'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            Đóng
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default VersionDetailModal;
