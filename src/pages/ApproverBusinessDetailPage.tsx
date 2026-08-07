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

interface BusinessDetail {
  id: string;
  name: string;
  status: string;
  categoryName: string;
  groupName: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
  active: boolean;
  comments: CommentItem[];
}

export const ApproverBusinessDetailPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_BUSINESS.DETAIL(businessId));
      const busData = response.data;
      
      setDetail({
        id: busData.id,
        name: busData.name,
        status: busData.status,
        categoryName: busData.categoryName || '---',
        groupName: busData.groupName || '---',
        createdBy: busData.createdBy,
        approvedBy: busData.approvedBy,
        createdAt: busData.createdAt,
        version: busData.version,
        active: busData.active,
        comments: busData.comments || [],
      });
    } catch (error) {
      console.error('Error loading business details:', error);
      toast.error('Lỗi khi tải chi tiết nghiệp vụ sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [businessId]);

  const handleBack = () => {
    navigate('/approver/business');
  };

  const handleSaveReview = async (statusVal: string, commentVal: string) => {
    if (!businessId || !detail) return;
    
    if ((statusVal === 'REJECTED' || statusVal === 'NEEDS_REVISION') && !commentVal.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý / lý do chỉnh sửa!');
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedByStr = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_BUSINESS.REVIEW(businessId), {
        status: statusVal,
        comment: commentVal,
        approvedBy: approvedByStr,
      });

      toast.success(statusVal === 'ACTIVE' ? 'Phê duyệt nghiệp vụ thành công!' : 'Đã phản hồi ý kiến đánh giá!');
      fetchDetail();
    } catch (error: any) {
      console.error('Lỗi khi lưu phê duyệt nghiệp vụ:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết nghiệp vụ...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin nghiệp vụ</p>
      </div>
    );
  }

  return (
    <ApproverDetailWrapper
      moduleName="nghiệp vụ"
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
          value={detail.groupName} 
          readOnly 
        />
      </div>

      <div className="formGroup">
        <label className="formLabel">Danh mục sản phẩm <span className="required-asterisk">(*)</span></label>
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.categoryName} 
          readOnly 
        />
      </div>

      <div className="formGroup">
        <label className="formLabel">Tên nghiệp vụ sản phẩm <span className="required-asterisk">(*)</span></label>
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

export default ApproverBusinessDetailPage;
