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

interface CriteriaDetail {
  id: string;
  code: string;
  name: string;
  status: string;
  active: boolean;
  isRequired: boolean;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
  groupName: string;
  categoryName: string;
  businessName: string;
  superGroupName: string;
  comments: CommentItem[];
}

export const ApproverCriteriaDetailPage: React.FC = () => {
  const { criteriaId } = useParams<{ criteriaId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<CriteriaDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    if (!criteriaId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CRITERIA.DETAIL(criteriaId));
      const critData = response.data;
      
      setDetail({
        id: critData.id,
        code: critData.code || '---',
        name: critData.name || '---',
        status: critData.status,
        active: !!critData.active,
        isRequired: !!critData.isRequired,
        createdBy: critData.createdBy || '---',
        approvedBy: critData.approvedBy || '---',
        createdAt: critData.createdAt,
        version: critData.version || 1,
        groupName: critData.groupName || '---',
        categoryName: critData.categoryName || '---',
        businessName: critData.businessName || '---',
        superGroupName: critData.superGroupName || '---',
        comments: critData.comments || [],
      });
    } catch (error) {
      console.error('Error loading criteria details:', error);
      toast.error('Lỗi khi tải chi tiết tiêu chí');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [criteriaId]);

  const handleBack = () => {
    navigate('/approver/criteria');
  };

  const handleSaveReview = async (statusVal: string, commentVal: string) => {
    if (!criteriaId || !detail) return;
    
    if ((statusVal === 'REJECTED' || statusVal === 'NEEDS_REVISION') && !commentVal.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý / lý do chỉnh sửa!');
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedByStr = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_CRITERIA.REVIEW(criteriaId), {
        status: statusVal,
        comment: commentVal,
        approvedBy: approvedByStr,
      });

      toast.success(statusVal === 'ACTIVE' ? 'Phê duyệt tiêu chí thành công!' : 'Đã phản hồi ý kiến đánh giá!');
      fetchDetail();
    } catch (error: any) {
      console.error('Lỗi khi lưu phê duyệt tiêu chí:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="loading-text">Đang tải chi tiết tiêu chí...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin tiêu chí</p>
      </div>
    );
  }

  return (
    <ApproverDetailWrapper
      moduleName="tiêu chí"
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
        <label className="formLabel">Thuộc nhóm sản phẩm <span className="required-asterisk">(*)</span></label>
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.superGroupName === 'SERVICE' ? 'Chương trình dịch vụ' : detail.superGroupName === 'INSURANCE' ? 'Bảo hiểm' : detail.superGroupName === 'PROGRAM' ? 'Chương trình ưu đãi' : detail.superGroupName} 
          readOnly 
        />
      </div>

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
          value={detail.businessName} 
          readOnly 
        />
      </div>

      <div className="formGroup">
        <label className="formLabel">Tên tiêu chí <span className="required-asterisk">(*)</span></label>
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.name} 
          readOnly 
        />
      </div>

      <div className="formGroup">
        <label className="formLabel">Mã tiêu chí <span className="required-asterisk">(*)</span></label>
        <input 
          type="text" 
          className="formInput readonly" 
          value={detail.code} 
          readOnly 
        />
      </div>
    </ApproverDetailWrapper>
  );
};

export default ApproverCriteriaDetailPage;
