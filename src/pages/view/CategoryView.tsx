import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import './GroupView.css'; 
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';

// TODO: Đảm bảo đường dẫn import này đúng với cấu trúc dự án của bạn
import EmptyIcon from '../../assets/icon/khong_san_pham.svg'; 

const GROUP_OPTIONS = [
  { label: 'Nhóm sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Nhóm sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Nhóm chương trình ưu đãi', value: 'PROGRAM' }
];

export interface BusinessItem { id: string; name: string; [key: string]: any; }
export interface CategoryDetailData {
  categoryId: string;
  categoryName: string;
  groupId?: string; 
  groupName?: string;
  superGroup?: string; 
  businesses: BusinessItem[];
  products?: ProductInfo[];
  [key: string]: any; 
}

const BusinessSection = ({ business, onNavigate }: { business: BusinessItem; onNavigate: (id: string) => void }) => {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<ProductInfo[]>(API_ENDPOINTS.PRODUCT_BUSINESS.PRODUCTS(business.id));
        setProducts(res.data || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchProducts();
  }, [business.id]);

  if (loading || products.length === 0) return null;

  return (
    <div className="sub-section-block">
      <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '16px' }}>{business.name}</h3>
      <div className="products-grid">
        {products.map(prod => (
          <ProductCard key={prod.id} product={prod} onClick={() => onNavigate(prod.id)} />
        ))}
      </div>
    </div>
  );
};

const CategoryView: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryData, setCategoryData] = useState<CategoryDetailData | null>(null);

  useEffect(() => {
    const fetchCategoryDetail = async () => {
      if (!categoryId) return;
      setLoading(true);
      try {
        const res = await axios.get<CategoryDetailData>(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL_FULL(categoryId));
        let currentData = res.data;

        let foundGroupId = currentData.groupId || currentData.productGroupId;
        let foundGroupName = currentData.groupName || currentData.productGroupName;

        if (!foundGroupId && currentData.products && currentData.products.length > 0) {
          foundGroupId = currentData.products[0].productGroupId;
          foundGroupName = currentData.products[0].productGroupName;
        }

        if (!foundGroupId) {
          try {
            const listGroupsRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
              params: { status: 'ACTIVE', active: true },
            });
            const groups = listGroupsRes.data || [];

            for (const grp of groups) {
              try {
                const groupDetailRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL_FULL(grp.id));
                const categoriesInGroup = groupDetailRes.data?.categories || [];
                const isMatched = categoriesInGroup.some((cat: any) => cat.id === categoryId);

                if (isMatched) {
                  foundGroupId = grp.id;
                  foundGroupName = grp.name;
                  currentData.superGroup = grp.superGroup;
                  break;
                }
              } catch (e) {}
            }
          } catch (err) { console.error('Lỗi khi quét tìm group cha:', err); }
        }

        if (foundGroupId && !currentData.superGroup) {
          try {
            const listRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
              params: { status: 'ACTIVE', active: true },
            });
            const matchedGroup = (listRes.data || []).find((g: any) => g.id === foundGroupId);
            if (matchedGroup) {
              currentData.superGroup = matchedGroup.superGroup;
            }
          } catch (e) {}
        }

        currentData.groupId = foundGroupId;
        currentData.groupName = foundGroupName;
        setCategoryData(currentData);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchCategoryDetail();
  }, [categoryId]);

  const handleNavigate = (id: string) => navigate(`/view/product-detail/${id}`);

  if (loading && !categoryData) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;
  if (!categoryData) return <div className="group-view"><div className="state-message">Không tìm thấy danh mục này.</div></div>;

  const currentCategoryName = categoryData.categoryName || 'Chi tiết danh mục';
  const directProducts = categoryData.products || [];
  const businesses = categoryData.businesses || [];

  const superGroupLabel = GROUP_OPTIONS.find((opt) => opt.value === categoryData.superGroup)?.label || 'Nhóm sản phẩm dịch vụ'; 

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
         <span className="breadcrumb-link" onClick={() => categoryData.groupId && navigate(`/view/groups/${categoryData.groupId}`)}>
           {categoryData.groupName || 'Nhóm sản phẩm'}
         </span>
         <span className="breadcrumb-separator">❯</span>
         <span className="breadcrumb-current">{currentCategoryName}</span>
      </div>

      <h2 className="group-page-title">{currentCategoryName}</h2>

      {directProducts.length > 0 && (
        <div className="section-block">
          <div className="products-grid">
            {directProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} onClick={() => handleNavigate(prod.id)} />
            ))}
          </div>
        </div>
      )}

      {businesses.map((bus) => (
         <BusinessSection key={bus.id} business={bus} onNavigate={handleNavigate} />
      ))}

      {/* THAY ĐỔI MỚI: Giao diện Empty State khi không có dữ liệu */}
      {directProducts.length === 0 && businesses.length === 0 && (
         <div className="empty-data-message">
           <img src={EmptyIcon} alt="Không có dữ liệu" className="empty-state-icon" />
           <span className="empty-state-text">Không có sản phẩm dịch vụ nào</span>
         </div>
      )}
    </div>
  );
};

export default CategoryView;