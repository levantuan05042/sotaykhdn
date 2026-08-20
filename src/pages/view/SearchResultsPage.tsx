import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import ProductCard from './common/ProductCard';
import './Search.css';

interface SearchProductItem {
  id: string;
  name: string; // Đã đổi thành string bắt buộc để khớp với ProductInfo
  title?: string;
  image?: string;
  categoryTag?: string;
  views?: number;
  createdAt?: string;
  businessName?: string;
  categoryName?: string;
  groupName?: string;
}

interface SearchData {
  total: number;
  products: SearchProductItem[];
}

export const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;

      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.SEARCH, {
          params: { keyword: query }
        });

        const rawData = response.data?.products || response.data || [];
        
        // Map dữ liệu để đảm bảo trường 'name' luôn có giá trị hợp lệ
        const productList: SearchProductItem[] = rawData.map((item: any) => ({
          ...item,
          name: item.name || item.title || 'Sản phẩm không tên'
        }));

        setResults({
          total: response.data?.total || productList.length,
          products: productList
        });
      } catch (error) {
        console.error('Lỗi khi tải kết quả tìm kiếm:', error);
        setResults({ total: 0, products: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  if (!query) return <div className="search-results-page">Vui lòng nhập từ khóa tìm kiếm.</div>;
  if (loading) return <div className="search-results-page">Đang tìm kiếm dữ liệu...</div>;
  if (!results) return null;

  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <div className="search-title-group">
          <span className="search-subtitle">Kết quả cho</span>
          <h1 className="search-keyword">"{query}"</h1>
        </div>
        <div className="search-total-count">
          {results.total} sản phẩm
        </div>
      </div>

      {results.products && results.products.length > 0 ? (
        <div className="products-result-grid">
          {results.products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
              onClick={() => navigate(`/view/product-detail/${product.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="search-empty-state">
          Không tìm thấy sản phẩm nào chứa từ khóa "{query}".
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;