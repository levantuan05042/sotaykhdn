import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import ApproverDetailWrapper from '../components/ApproverDetailWrapper';
import LoadingOverlay from '../components/ui/LoadingOverlay';

interface CommentItem {
  id: string;
  createdBy: string;
  createdAt: string;
  content: string;
  comment?: string;
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

export const ApproverProductGroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ProductGroupDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.DETAIL(groupId));
      const groupData = response.data;
      setDetail({
        id: groupData.id,
        name: groupData.name,
        status: groupData.status,
        superGroup: groupData.superGroup,
        createdBy: groupData.createdByFullName || groupData.createdBy,
        approvedBy: groupData.approvedByFullName || groupData.approvedBy,
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
    
    if ((statusVal === 'REJECTED' || statusVal === 'NEEDS_REVISION') && !commentVal.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý / lý do chỉnh sửa!');
      return;
    }

    const username = localStorage.getItem('currentUserUsername') || '';
    const branchCode = localStorage.getItem('currentUserBranchCode') || '';
    const approvedByStr = username ? `${username}_${branchCode}` : '';

    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.REVIEW(groupId), {
        status: statusVal,
        comment: commentVal,
        approvedBy: approvedByStr,
      });

      toast.success(statusVal === 'ACTIVE' ? 'Phê duyệt nhóm sản phẩm thành công!' : 'Đã phản hồi ý kiến đánh giá!');
      fetchDetail();
    } catch (error: any) {
      console.error('Lỗi khi lưu phê duyệt nhóm sản phẩm:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return <LoadingOverlay />;
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="error-text">Không tìm thấy thông tin nhóm sản phẩm</p>
      </div>
    );
  }

  return (
    <ApproverDetailWrapper
      moduleName="nhóm sản phẩm"
      itemName={detail.name}
      objectCode={detail.id}
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
    </ApproverDetailWrapper>
  );
};

export default ApproverProductGroupDetailPage;
