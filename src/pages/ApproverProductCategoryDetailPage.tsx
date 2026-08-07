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
  content: string;
}

interface ProductCategoryDetail {
  id: string;
  name: string;
  status: string;
  productGroupName: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
  active: boolean;
  comments: CommentItem[];
}

export const ApproverProductCategoryDetailPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ProductCategoryDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.DETAIL(categoryId));
      const catData = response.data;
      
      setDetail({
        id: catData.id,
        name: catData.name,
        status: catData.status,
        productGroupName: catData.groupName || '---',
        createdBy: catData.createdBy,
        approvedBy: catData.approvedBy,
        createdAt: catData.createdAt,
        version: catData.version,
        active: catData.active,
        comments: catData.comments || [],
      });
    } catch (error) {
      console.error('Error loading product category details:', error);
      toast.error('Lỗi khi tải chi tiết danh mục sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [categoryId]);

  const handleBack = () => {
    navigate('/approver/product-category');
  };

  const handleSaveReview = async (statusVal: string, commentVal: string) => {
    if (!categoryId || !detail) return;
    
    if ((statusVal === 'REJECTED' || statusVal === 'NEEDS_REVISION') && !commentVal.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý / lý do chỉnh sửa!');
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedByStr = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.REVIEW(categoryId), {
        status: statusVal,
        comment: commentVal,
        approvedBy: approvedByStr,
      });

      toast.success(statusVal === 'ACTIVE' ? 'Phê duyệt danh mục thành công!' : 'Đã phản hồi ý kiến đánh giá!');
      fetchDetail();
    } catch (error: any) {
      console.error('Lỗi khi lưu phê duyệt danh mục sản phẩm:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết danh mục sản phẩm...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin danh mục sản phẩm</p>
      </div>
    );
  }

  return (
    <ApproverDetailWrapper
      moduleName="danh mục sản phẩm"
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
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.productGroupName} 
          readOnly 
        />
      </div>

      <div className="formGroup">
        <label className="formLabel">Danh mục sản phẩm <span className="required-asterisk">(*)</span></label>
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.name} 
          readOnly 
        />
      </div>
    </ApproverDetailWrapper>
  );
};

export default ApproverProductCategoryDetailPage;
