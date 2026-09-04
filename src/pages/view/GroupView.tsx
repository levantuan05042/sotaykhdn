import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import './GroupView.css';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';

// TODO: Điều chỉnh đường dẫn import này cho đúng với cấu trúc thư mục của dự án
import EmptyIcon from '../../assets/icon/khong_san_pham.svg'; 

const GROUP_OPTIONS = [
  { label: 'Nhóm sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Nhóm sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Nhóm chương trình ưu đãi', value: 'PROGRAM' }
];

export interface CategoryItem { id: string; name: string; [key: string]: any; }
export interface BusinessItem { id: string; name: string; [key: string]: any; }
export interface GroupDetailData {
  groupId: string;
  groupName: string;
  superGroup?: string;
  categories: CategoryItem[];
  products?: ProductInfo[];
}
export interface CategoryDetailData {
  categoryId: string;
  categoryName: string;
  businesses: BusinessItem[];
  products?: ProductInfo[];
}

// --- HELPER FUNCTIONS KIỂM TRA DỮ LIỆU ĐA CẤP ---
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

// --------------------------------------------------------
// 1. COMPONENT CẤP NGHIỆP VỤ (BUSINESS - CẤP 3)
// --------------------------------------------------------
const BusinessSection = ({ business, onNavigate }: { business: BusinessItem; onNavigate: (id: string) => void }) => {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<ProductInfo[]>(API_ENDPOINTS.PRODUCT_BUSINESS.PRODUCTS(business.id));
        setProducts(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [business.id]);

  if (loading || products.length === 0) return null;

  return (
    <div className="sub-section-block">
      <h4 className="sub-section-title">{business.name}</h4>
      <div className="products-grid">
        {products.map(prod => (
          <ProductCard key={prod.id} product={prod} onClick={() => onNavigate(prod.id)} />
        ))}
      </div>
    </div>
  );
};

// --------------------------------------------------------
// 2. COMPONENT CẤP DANH MỤC (CATEGORY - CẤP 2)
// --------------------------------------------------------
const CategorySection = ({ category, onNavigate }: { category: CategoryItem; onNavigate: (id: string) => void }) => {
  const [catData, setCatData] = useState<CategoryDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatData = async () => {
      try {
        const res = await axios.get<CategoryDetailData>(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL_FULL(category.id));
        setCatData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatData();
  }, [category.id]);

  if (loading || !catData) return null;

  // Lọc: Chỉ giữ lại SP thuộc Danh mục này nhưng KHÔNG thuộc Nghiệp vụ nào
  const categoryDirectProducts = (catData.products || []).filter(
    (prod: any) => !checkHasBusiness(prod)
  );

  const hasDirectProducts = categoryDirectProducts.length > 0;
  const hasBusinesses = catData.businesses && catData.businesses.length > 0;

  if (!hasDirectProducts && !hasBusinesses) return null;

  return (
    <div className="section-block">
      <h3 className="section-title">{catData.categoryName}</h3>
      
      {/* Hiển thị SP trực thuộc Danh mục */}
      {hasDirectProducts && (
        <div className="products-grid">
          {categoryDirectProducts.map(prod => (
            <ProductCard key={prod.id} product={prod} onClick={() => onNavigate(prod.id)} />
          ))}
        </div>
      )}

      {/* Render các Nghiệp vụ con */}
      {hasBusinesses && catData.businesses.map(bus => (
        <BusinessSection key={bus.id} business={bus} onNavigate={onNavigate} />
      ))}
    </div>
  );
};

// --------------------------------------------------------
// 3. COMPONENT CẤP NHÓM (GROUP - CẤP 1 - VIEW CHÍNH)
// --------------------------------------------------------
const GroupView: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [groupData, setGroupData] = useState<GroupDetailData | null>(null);

  useEffect(() => {
    const fetchGroupDetail = async () => {
      if (!groupId) return;
      setLoading(true);
      try {
        const res = await axios.get<GroupDetailData>(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL_FULL(groupId));
        let currentData = res.data;
        
        if (!currentData.superGroup) {
          try {
            const listRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
              params: { status: 'ACTIVE', active: true },
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
        setLoading(false);
      }
    };
    fetchGroupDetail();
  }, [groupId]);

  const handleNavigate = (id: string) => navigate(`/view/product-detail/${id}`);

  if (loading && !groupData) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;
  if (!groupData) return <div className="group-view"><div className="state-message">Không tìm thấy nhóm sản phẩm này.</div></div>;

  const currentGroupName = groupData.groupName || 'Chi tiết nhóm';
  const categories = groupData.categories || [];
  const superGroupLabel = GROUP_OPTIONS.find((opt) => opt.value === groupData.superGroup)?.label || 'Nhóm sản phẩm dịch vụ'; 

  // Lọc: Chỉ giữ lại SP trực thuộc Nhóm (KHÔNG có Danh mục và KHÔNG có Nghiệp vụ)
  const groupDirectProducts = (groupData.products || []).filter(
    (prod: any) => !checkHasCategory(prod) && !checkHasBusiness(prod)
  );

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

      {/* Hiển thị SP trực thuộc Nhóm */}
      {groupDirectProducts.length > 0 && (
        <div className="section-block">
          <div className="products-grid">
            {groupDirectProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} onClick={() => handleNavigate(prod.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Render các Danh mục con */}
      {categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} onNavigate={handleNavigate} />
      ))}

      {/* THAY ĐỔI MỚI: Giao diện Empty State khi không có dữ liệu */}
      {groupDirectProducts.length === 0 && categories.length === 0 && (
        <div className="empty-data-message">
          <img src={EmptyIcon} alt="Không có dữ liệu" className="empty-state-icon" />
          <span className="empty-state-text">Không có sản phẩm dịch vụ nào</span>
        </div>
      )}
    </div>
  );
};

export default GroupView;