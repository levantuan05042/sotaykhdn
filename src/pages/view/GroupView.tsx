import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import './GroupView.css';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';
import FolderCard from './common/FolderCard';
import { useViewAutoRefresh } from '../../hooks/useViewAutoRefresh';

import EmptyIcon from '../../assets/icon/khong_san_pham.svg';

const GROUP_OPTIONS = [
  { label: 'Nhóm sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Nhóm sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Nhóm chương trình ưu đãi', value: 'PROGRAM' }
];

export interface CategoryItem { id: string; name: string; [key: string]: any; }
export interface GroupDetailData {
  groupId: string;
  groupName: string;
  superGroup?: string;
  categories: CategoryItem[];
  products?: ProductInfo[];
}

const checkHasBusiness = (prod: any): boolean => {
  return !!(
    prod.businessId ||
    prod.productBusinessId ||
    prod.business ||
    prod.productBusiness ||
    prod.businessName ||
    prod.productBusinessName
  );
};

const checkHasCategory = (prod: any): boolean => {
  return !!(
    prod.categoryId ||
    prod.productCategoryId ||
    prod.category ||
    prod.productCategory ||
    prod.categoryName ||
    prod.productCategoryName
  );
};

const GroupView: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [groupData, setGroupData] = useState<GroupDetailData | null>(null);

  const fetchGroupDetail = useCallback(async (isBackground = false) => {
    if (!groupId) return;
    if (!isBackground) setLoading(true);
    try {
      const res = await axios.get<GroupDetailData>(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL_FULL(groupId), {
        params: { _t: Date.now() },
      });
      let currentData = res.data;

      if (!currentData.superGroup) {
        try {
          const listRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
            params: { status: 'ACTIVE', active: true, _t: Date.now() },
          });
          const matchedGroup = (listRes.data || []).find((g: any) => g.id === groupId);
          if (matchedGroup && matchedGroup.superGroup) {
            currentData = { ...currentData, superGroup: matchedGroup.superGroup };
          }
        } catch (listError) {}
      }
      setGroupData(currentData);
    } catch (error) {
      console.error(error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchGroupDetail();
  }, [fetchGroupDetail]);

  useViewAutoRefresh(() => fetchGroupDetail(true), [groupId]);

  if (loading && !groupData) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;
  if (!groupData) return <div className="group-view"><div className="state-message">Không tìm thấy nhóm sản phẩm này.</div></div>;

  const currentGroupName = groupData.groupName || 'Chi tiết nhóm';
  const categories = groupData.categories || [];
  const superGroupLabel = GROUP_OPTIONS.find((opt) => opt.value === groupData.superGroup)?.label || 'Nhóm sản phẩm dịch vụ';

  const groupDirectProducts = (groupData.products || []).filter(
    (prod: any) => !checkHasCategory(prod) && !checkHasBusiness(prod)
  );

  const isEmpty = groupDirectProducts.length === 0 && categories.length === 0;

  return (
    <div className="group-view">
      <div className="group-breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/view')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Trang chủ
        </span>
        <span className="breadcrumb-separator">❯</span>
        <span className="breadcrumb-link">{superGroupLabel}</span>
        <span className="breadcrumb-separator">❯</span>
        <span className="breadcrumb-current">{currentGroupName}</span>
      </div>

      <h2 className="group-page-title">{currentGroupName}</h2>

      {isEmpty ? (
        <div className="empty-data-message">
          <img src={EmptyIcon} alt="Không có dữ liệu" className="empty-state-icon" />
          <span className="empty-state-text">Không có sản phẩm dịch vụ nào</span>
        </div>
      ) : (
        <div className="products-grid explorer-grid">
          {categories.map((cat) => (
            <FolderCard
              key={cat.id}
              name={cat.name}
              kind="category"
              onClick={() => navigate(`/view/category/${cat.id}`)}
            />
          ))}
          {groupDirectProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onClick={() => navigate(`/view/product-detail/${prod.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupView;
