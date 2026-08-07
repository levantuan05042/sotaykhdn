import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import ApproverDetailWrapper from '../components/ApproverDetailWrapper';

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
    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1A191B', textAlign: 'left' }}>{label}</label>
      <div className="editor-container disabled-editor" style={{ border: '1px solid #D1D5DB', borderRadius: '12px', padding: '12px 20px', backgroundColor: '#ffffff', minHeight: '48px', boxSizing: 'border-box' }}>
        <div 
          className="editor-content-view"
          style={{ fontSize: '14px', color: '#1A191B', textAlign: 'left', lineHeight: '1.5' }}
          dangerouslySetInnerHTML={{ __html: value }}
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

  const [categories, setCategories] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const fetchDetail = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT.DETAIL(productId));
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
          axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST),
          axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.LIST)
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

  const handleSaveReview = async (statusVal: string, commentVal: string) => {
    if (!productId || !detail) return;

    let notesVal = '2'; // Default ACTIVE
    if (statusVal === 'REJECTED') {
      notesVal = '1';
    } else if (statusVal === 'NEEDS_REVISION') {
      notesVal = '0';
    }

    if ((notesVal === '0' || notesVal === '1') && !commentVal.trim()) {
      toast.error("Vui lòng điền nội dung góp ý / lý do chỉnh sửa vào ô bình luận!");
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedByStr = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT.REVIEW(productId), {
        notes: notesVal,
        comment: commentVal,
        approvedBy: approvedByStr
      });

      toast.success(
        notesVal === '2' 
          ? "Đã phê duyệt sản phẩm thành công!" 
          : notesVal === '0'
            ? "Đã gửi yêu cầu chỉnh sửa sản phẩm!"
            : "Đã từ chối sản phẩm thành công!"
      );
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
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết sản phẩm lẻ...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin sản phẩm lẻ</p>
      </div>
    );
  }

  return (
    <ApproverDetailWrapper
      moduleName="sản phẩm"
      itemName={detail.name}
      status={detail.status}
      createdBy={detail.createdBy}
      approvedBy={detail.approvedBy}
      createdAt={detail.createdAt}
      version={detail.version}
      comments={detail.comments}
      isPending={detail.status === 'PENDING_APPROVAL'}
      loading={loading}
      onBack={handleBack}
      onSaveReview={handleSaveReview}
    >
      <div className="formGroup">
        <label className="formLabel">Nhóm sản phẩm <span className="required-asterisk">(*)</span></label>
        <select
          className="formSelect"
          value={detail.productGroupId || ''}
          disabled
        >
          <option value="">Chọn nhóm sản phẩm</option>
          {productGroups.map((g: any) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
        <div className="formGroup" style={{ flex: 1 }}>
          <label className="formLabel">Danh mục sản phẩm</label>
          <select
            className="formSelect"
            value={detail.productCategoryId || ''}
            disabled
          >
            <option value="">Chọn danh mục sản phẩm</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="formGroup" style={{ flex: 1 }}>
          <label className="formLabel">Nghiệp vụ</label>
          <select
            className="formSelect"
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

      <div className="formGroup">
        <label className="formLabel">Tên sản phẩm dịch vụ <span className="required-asterisk">(*)</span></label>
        <input
          type="text"
          className="formInput readonly"
          value={detail.name || ''}
          readOnly
        />
      </div>

      {detail.details?.map((item: any, index: number) => (
        <EditorBlock
          key={item.criteriaId || index}
          label={`${item.tieuChi} ${item.isRequired ? '(*)' : ''}`}
          value={item.noiDung || ''}
        />
      ))}

      {detail.imageUrl && (
        <div className="formGroup">
          <label className="formLabel">Ảnh sản phẩm</label>
          <div className="quickview-image-container" style={{ width: '100%', display: 'flex', boxSizing: 'border-box', marginTop: '4px' }}>
            <img 
              src={new URL(`../assets/${detail.imageUrl}`, import.meta.url).href}
              alt="Ảnh sản phẩm" 
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid #E5E7EB', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </ApproverDetailWrapper>
  );
};

export default ApproverProductSingleDetailPage;
