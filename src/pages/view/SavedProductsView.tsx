import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../config/view/apiConfig';
import EmptyIcon from '../../assets/icon/khong_san_pham.svg';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';
import FolderCard from './common/FolderCard';
import './GroupView.css';
import { useViewAutoRefresh } from '../../hooks/useViewAutoRefresh';

const SavedProductsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductInfo[]>([]);

  const fetchSavedProducts = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/saved-products/list`, {
        withCredentials: true,
        params: { _t: Date.now() },
      });
      const list: ProductInfo[] = (res.data || []).map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl || item.image_url || item.image || '',
        viewCount: item.viewCount ?? item.views ?? 0,
      }));
      setProducts(list);
    } catch (error) {
      console.error('Lỗi khi tải danh sách sản phẩm đã lưu:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSavedProducts();
  }, [fetchSavedProducts]);

  useViewAutoRefresh(() => fetchSavedProducts(true));

  const folderItems = useMemo(() => {
    const groups = new Map<string, { id: string; name: string }>();
    const categories = new Map<string, { id: string; name: string }>();
    const businesses = new Map<string, { id: string; name: string }>();

    products.forEach((p) => {
      if (p.productGroupId && p.productGroupName) {
        groups.set(String(p.productGroupId), { id: String(p.productGroupId), name: p.productGroupName });
      }
      if (p.productCategoryId && p.productCategoryName) {
        categories.set(String(p.productCategoryId), { id: String(p.productCategoryId), name: p.productCategoryName });
      }
      const businessId = p.businessId || p.productBusinessId;
      const businessName = p.businessName || p.productBusinessName;
      if (businessId && businessName) {
        businesses.set(String(businessId), { id: String(businessId), name: String(businessName) });
      }
    });

    return {
      groups: Array.from(groups.values()),
      categories: Array.from(categories.values()),
      businesses: Array.from(businesses.values()),
    };
  }, [products]);

  const handleUnsave = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  if (loading) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;

  return (
    <div className="group-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 className="group-page-title" style={{ margin: 0 }}>Sản phẩm đã lưu</h2>
        <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>
          {products.length} sản phẩm
        </span>
      </div>

      {products.length > 0 ? (
        <div className="products-grid explorer-grid">
          {folderItems.groups.map((item) => (
            <FolderCard
              key={`group-${item.id}`}
              name={item.name}
              kind="group"
              onClick={() => navigate(`/view/groups/${item.id}`)}
            />
          ))}
          {folderItems.categories.map((item) => (
            <FolderCard
              key={`category-${item.id}`}
              name={item.name}
              kind="category"
              onClick={() => navigate(`/view/category/${item.id}`)}
            />
          ))}
          {folderItems.businesses.map((item) => (
            <FolderCard
              key={`business-${item.id}`}
              name={item.name}
              kind="business"
              onClick={() => navigate(`/view/business/${item.id}`)}
            />
          ))}
          {products.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              initiallySaved
              onClick={() => navigate(`/view/product-detail/${prod.id}`)}
              onUnsave={handleUnsave}
            />
          ))}
        </div>
      ) : (
        <div className="empty-data-message">
          <img src={EmptyIcon} alt="Chưa có sản phẩm nào đã lưu" className="empty-state-icon" />
          <span className="empty-state-text">Chưa có sản phẩm nào đã lưu</span>
        </div>
      )}
    </div>
  );
};

export default SavedProductsView;
