import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import './GroupView.css'; 
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';

const GROUP_OPTIONS = [
  { label: 'Nhóm sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Nhóm sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Nhóm chương trình ưu đãi', value: 'PROGRAM' }
];

const BusinessView: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [businessName, setBusinessName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [superGroup, setSuperGroup] = useState<string>('');

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await axios.get<ProductInfo[]>(API_ENDPOINTS.PRODUCT_BUSINESS.PRODUCTS(businessId));
        const prods = res.data || [];
        setProducts(prods);

        if (prods.length > 0) {
          const firstProd = prods[0];
          setBusinessName(firstProd.businessName || 'Chi tiết nghiệp vụ');
          setCategoryId(firstProd.productCategoryId || '');
          setCategoryName(firstProd.productCategoryName || '');
          setGroupId(firstProd.productGroupId || '');
          setGroupName(firstProd.productGroupName || '');
        }

        let currentGroupId = prods[0]?.productGroupId;
        let currentSuperGroup = '';

        if (!currentGroupId) {
          try {
            const listGroupsRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
              params: { status: 'ACTIVE', active: true },
            });
            const groups = listGroupsRes.data || [];

            for (const grp of groups) {
              try {
                const groupDetailRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL_FULL(grp.id));
                const categories = groupDetailRes.data?.categories || [];
                
                for (const cat of categories) {
                  const catDetailRes = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL_FULL(cat.id));
                  const businesses = catDetailRes.data?.businesses || [];
                  const matchedBus = businesses.find((b: any) => b.id === businessId);

                  if (matchedBus) {
                    currentGroupId = grp.id;
                    setGroupId(grp.id);
                    setGroupName(grp.name);
                    currentSuperGroup = grp.superGroup;
                    setSuperGroup(grp.superGroup);
                    setCategoryId(cat.id);
                    setCategoryName(cat.name);
                    if (!businessName) setBusinessName(matchedBus.name);
                    break;
                  }
                }
                if (currentGroupId) break;
              } catch (e) {}
            }
          } catch (err) {
            console.error('Lỗi quét tìm cấp cha của nghiệp vụ:', err);
          }
        } else if (groupId && !superGroup) {
          try {
            const listRes = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
              params: { status: 'ACTIVE', active: true },
            });
            const matchedGroup = (listRes.data || []).find((g: any) => g.id === groupId);
            if (matchedGroup) {
              setSuperGroup(matchedGroup.superGroup);
            }
          } catch (e) {}
        }
      } catch (error) {
        console.error('Lỗi tải dữ liệu nghiệp vụ:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId]);

  const handleNavigate = (id: string) => navigate(`/view/product-detail/${id}`);

  if (loading) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;

  const superGroupLabel = GROUP_OPTIONS.find((opt) => opt.value === superGroup)?.label || 'Nhóm sản phẩm dịch vụ';

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
         <span className="breadcrumb-link" onClick={() => groupId && navigate(`/view/groups/${groupId}`)}>
           {groupName || 'Nhóm sản phẩm'}
         </span>
         <span className="breadcrumb-separator">❯</span>
         <span className="breadcrumb-link" onClick={() => categoryId && navigate(`/view/category/${categoryId}`)}>
           {categoryName || 'Danh mục'}
         </span>
         <span className="breadcrumb-separator">❯</span>
         <span className="breadcrumb-current">{businessName || 'Chi tiết nghiệp vụ'}</span>
      </div>

      <h2 className="group-page-title">{businessName || 'Chi tiết nghiệp vụ'}</h2>

      {products.length > 0 ? (
        <div className="section-block">
          <div className="products-grid">
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} onClick={() => handleNavigate(prod.id)} />
            ))}
          </div>
        </div>
      ) : (
         <div className="state-message">Nghiệp vụ này chưa có dữ liệu sản phẩm.</div>
      )}
    </div>
  );
};

export default BusinessView;