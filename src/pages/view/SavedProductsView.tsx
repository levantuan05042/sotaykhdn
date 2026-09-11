import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../config/view/apiConfig';
import EmptyIcon from '../../assets/icon/khong_san_pham.svg';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';
import './GroupView.css';

const SavedProductsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductInfo[]>([]);

  useEffect(() => {
    const fetchSavedProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/saved-products/list`, {
          withCredentials: true,
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
        setLoading(false);
      }
    };

    fetchSavedProducts();
  }, []);

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
        <div className="section-block" style={{ margin: 0 }}>
          <div className="products-grid">
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
