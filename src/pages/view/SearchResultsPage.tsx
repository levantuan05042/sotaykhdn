import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import './Search.css';
import toast from 'react-hot-toast';

// --- INTERFACES ---
interface SearchResultItem {
  id: string;
  name: string;
  productCount?: number;
  path?: string[]; 
}

interface SearchProductItem {
  id: string;
  name?: string;
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
  groups: SearchResultItem[];
  categories: SearchResultItem[];
  businesses: SearchResultItem[];
  products: SearchProductItem[];
}

export const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  
  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest'); 
  
  // Trạng thái lọc theo Nhóm/Danh mục/Nghiệp vụ
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string; name: string } | null>(null);
  // Danh sách sản phẩm RIÊNG của 1 nhóm/danh mục/nghiệp vụ đang được chọn.
  // Tách khỏi results.products để không ghi đè danh sách "sản phẩm liên quan" gốc.
  const [filteredProducts, setFilteredProducts] = useState<SearchProductItem[]>([]);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) return;
      
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.SEARCH, {
          params: { keyword: query, sort: sortBy }
        });

        const data = response.data;
        const totalCount = 
          (data?.groups?.length || 0) + 
          (data?.categories?.length || 0) + 
          (data?.businesses?.length || 0) + 
          (data?.products?.length || 0);

        setResults({
          total: data.total || totalCount,
          groups: data.groups || [],
          categories: data.categories || [],
          businesses: data.businesses || [],
          products: data.products || []
        });
        
        // Reset filter khi đổi từ khóa tìm kiếm mới
        setActiveFilter(null);
        setFilteredProducts([]);
      } catch (error) {
        console.error('Lỗi khi tải kết quả tìm kiếm:', error);
        setResults({ total: 0, groups: [], categories: [], businesses: [], products: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, sortBy]); 

  const handleSelectFilter = async (type: string, item: SearchResultItem) => {
    setLoading(true);
    try {
      // Gọi API tới Backend để lấy đúng sản phẩm thuộc nhóm/danh mục/nghiệp vụ này
      const response = await axios.get(API_ENDPOINTS.PRODUCTS_BY_NODE, { 
          params: { type, nodeId: item.id } 
      });
      
      // Lưu vào state riêng — KHÔNG ghi đè results.products, vì đó là danh sách
      // "sản phẩm liên quan" của kết quả tìm kiếm gốc theo từ khóa. Nếu ghi đè,
      // khi bấm "Quay lại" danh sách gốc sẽ bị mất.
      setFilteredProducts(response.data || []);
      setActiveFilter({ type, id: item.id, name: item.name });
    } catch (error) {
      console.error('Lỗi khi tải sản phẩm theo node:', error);
      toast.error('Không thể tải danh sách sản phẩm!');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToProduct = (id: string) => navigate(`/product-detail/${id}`);

  const handleCopyLink = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation(); 
    const link = `${window.location.origin}/product-detail/${productId}`;
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Đã sao chép liên kết!'))
      .catch(() => toast.error('Lỗi khi sao chép liên kết!'));
  };

  const handleSaveProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Đã lưu sản phẩm vào danh sách!');
  };

  // --- HELPERS ---
  const getDisplayTag = (product: SearchProductItem) => {
    return product.businessName || product.categoryName || product.groupName || 'Sản phẩm'; 
  };

  const stringToColor = (string: string) => {
    if (!string) return '#cbd5e1'; 
    let hash = 0;
    for (let i = 0; i < string.length; i++) hash = string.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i++) color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).substr(-2);
    return color;
  };

  // results.products = sản phẩm khớp từ khóa tìm kiếm (không đổi khi lọc theo node)
  // filteredProducts = sản phẩm của riêng nhóm/danh mục/nghiệp vụ vừa bấm chọn
  // Backend đã lọc đúng theo nodeId rồi nên không lọc lại theo tên ở client nữa
  const displayedProducts = activeFilter ? filteredProducts : results?.products;

  // --- EARLY RETURNS ---
  if (!query) return <div className="search-results-page">Vui lòng nhập từ khóa tìm kiếm.</div>;
  if (loading) return <div className="search-results-page">Đang tìm kiếm dữ liệu...</div>;
  if (!results) return null;

  // --- COMPONENT: GRID SẢN PHẨM ---
  const renderProductCards = (productsToRender: SearchProductItem[]) => (
    <div className="products-result-grid">
      {productsToRender.map((product) => (
        <div key={product.id} className="figma-product-card" onClick={() => handleNavigateToProduct(product.id)}>
          <div className="card-image-wrapper">
            {product.image ? (
              <img src={product.image} alt={product.title || product.name} />
            ) : (
              <div className="card-image-fallback" style={{ backgroundColor: stringToColor(product.title || product.name || '') }}>
                {(product.title || product.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="card-content">
            <span className="card-tag">{getDisplayTag(product)}</span>
            <h4 className="card-title">{product.title || product.name}</h4>
            
            <div className="card-meta">
              <span className="meta-item" title="Lượt xem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {product.views || 0}
              </span>
              
              {product.createdAt && (
                <span className="meta-item" title="Ngày tạo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {product.createdAt}
                </span>
              )}

              <div className="card-actions">
                <button className="action-btn" onClick={(e) => handleCopyLink(e, product.id)} title="Sao chép liên kết">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button className="action-btn" onClick={handleSaveProduct} title="Lưu sản phẩm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ========================================================
  // RENDER 1: GIAO DIỆN ĐÃ CHỌN LỌC (FILTERED VIEW)
  // ========================================================
  if (activeFilter) {
    return (
      <div className="search-results-page">
        <div className="filtered-view-header">
          <button className="btn-back-filter" onClick={() => setActiveFilter(null)} title="Quay lại">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className="filtered-view-title">{activeFilter.name}</h1>
        </div>

        {displayedProducts && displayedProducts.length > 0 ? (
          renderProductCards(displayedProducts)
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', width: '100%' }}>
            Không tìm thấy sản phẩm nào trong {activeFilter.type === 'group' ? 'nhóm' : activeFilter.type === 'category' ? 'danh mục' : 'nghiệp vụ'} này.
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // RENDER 2: GIAO DIỆN TỔNG QUAN (DEFAULT VIEW)
  // ========================================================
  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <h2 className="search-title-text">
          {results.total} kết quả cho "<strong>{query}</strong>"
        </h2>
        <div className="search-sort-dropdown">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Cập nhật mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </div>

      {results.total === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', width: '100%' }}>
          Không tìm thấy kết quả nào phù hợp với từ khóa của bạn.
        </div>
      )}

      {/* NHÓM SẢN PHẨM */}
      {results.groups?.length > 0 && (
        <div className="search-group-section">
          <div className="section-group-header">
             <svg className="group-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
              <path d="M8.33333 2.5H2.5V8.33333H8.33333V2.5Z" stroke="#3C393F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 2.5H11.6667V8.33333H17.5V2.5Z" stroke="#3C393F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 11.6667H11.6667V17.5H17.5V11.6667Z" stroke="#3C393F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.33333 11.6667H2.5V17.5H8.33333V11.6667Z" stroke="#3C393F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Nhóm sản phẩm ({results.groups.length})
          </div>
          {results.groups.map((group) => (
            <div key={group.id} className="search-row-item" onClick={() => handleSelectFilter('group', group)}>
              <span className="row-item-title">{group.name}</span>
              {group.productCount !== undefined && <span className="row-item-count">{group.productCount} sản phẩm</span>}
            </div>
          ))}
        </div>
      )}

      {/* DANH MỤC */}
      {results.categories?.length > 0 && (
        <div className="search-group-section">
          <div className="section-group-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            Danh mục ({results.categories.length})
          </div>
          {results.categories.map((cat) => (
            <div key={cat.id} className="search-row-item" onClick={() => handleSelectFilter('category', cat)}>
              <div className="row-item-left">
                {cat.path && <span className="row-item-breadcrumbs">{cat.path.join(' > ')}</span>}
                <span className="row-item-title">{cat.name}</span>
              </div>
              {cat.productCount !== undefined && <span className="row-item-count">{cat.productCount} sản phẩm</span>}
            </div>
          ))}
        </div>
      )}

      {/* NGHIỆP VỤ */}
      {results.businesses?.length > 0 && (
        <div className="search-group-section">
          <div className="section-group-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Nghiệp vụ ({results.businesses.length})
          </div>
          {results.businesses.map((svc) => (
            <div key={svc.id} className="search-row-item" onClick={() => handleSelectFilter('business', svc)}>
              <div className="row-item-left">
                {svc.path && <span className="row-item-breadcrumbs">{svc.path.join(' > ')}</span>}
                <span className="row-item-title">{svc.name}</span>
              </div>
              {svc.productCount !== undefined && <span className="row-item-count">{svc.productCount} sản phẩm</span>}
            </div>
          ))}
        </div>
      )}

      {/* SẢN PHẨM TỔNG HỢP KHI CHƯA LỌC */}
      {displayedProducts && displayedProducts.length > 0 && (
        <div className="search-products-section">
          <div className="section-group-header">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
             Sản phẩm liên quan ({displayedProducts.length})
          </div>
          {renderProductCards(displayedProducts)}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;