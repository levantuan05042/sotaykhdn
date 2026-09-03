import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ==========================================
// 1. IMPORTS CHO LUỒNG ADMIN / QUẢN TRỊ
// ==========================================
import MainLayout from './layouts/MainLayout';
import ProductGroupPage from './pages/ProductGroupPage';
import ProductCategoryPage from './pages/ProductCategoryPage';
import CreateProductPage from './pages/DetailGroupPage'; // Lưu ý kiểm tra nếu file export default DetailGroupPage
import AddGroupPage from './pages/AddGroupPage';
import DetailCategoryPage from './pages/DetailCategoryPage';
import AddCategoryPage from './pages/AddCategoryPage';
import ProductCriteriaPage from './pages/ProductCriteriaPage';
import DetailCriteriaPage from './pages/DetailCriteriaPage';
import AddCriteriaPage from './pages/AddCriteriaPage';
import ProductBusinessPage from './pages/ProductBusinessPage';
import DetailBusinessPage from './pages/DetailBusinessPage';
import AddBusinessPage from './pages/AddBusinessPage';
import ProductPage from './pages/ProductPage';
import AddProductPage from './pages/AddProductPage';
import DetailProductPage from './pages/DetailProductPage';
// import DetailProductsPage from './pages/DetailProductsPage';
import RequestListPage from './pages/RequestListPage';
import ApproverRequestListPage from './pages/ApproverRequestListPage';
import BatchRequestDetailPage from './pages/BatchRequestDetailPage';
import ApproverBatchDetailPage from './pages/ApproverBatchDetailPage';
import ApproverProductDetailPage from './pages/ApproverProductDetailPage';
import ApproverProductGroupListPage from './pages/ApproverProductGroupListPage';
import ApproverProductGroupDetailPage from './pages/ApproverProductGroupDetailPage';
import ApproverProductCategoryListPage from './pages/ApproverProductCategoryListPage';
import ApproverProductCategoryDetailPage from './pages/ApproverProductCategoryDetailPage';
import ApproverProductSingleListPage from './pages/ApproverProductSingleListPage';
import ApproverProductSingleDetailPage from './pages/ApproverProductSingleDetailPage';
import ApproverBusinessListPage from './pages/ApproverBusinessListPage';
import ApproverBusinessDetailPage from './pages/ApproverBusinessDetailPage';
import ApproverCriteriaListPage from './pages/ApproverCriteriaListPage';
import ApproverCriteriaDetailPage from './pages/ApproverCriteriaDetailPage';

// ==========================================
// 2. IMPORTS THÊM CHO LUỒNG VIEW (TRA CỨU)
// ==========================================
import ViewMainLayout from './layouts/view/MainLayout';
import HomePage from './pages/view/HomePage';
import GroupView from './pages/view/GroupView';
import ProductDetailView from './pages/view/ProductDetailView';
import { SearchResultsPage } from './pages/view/SearchResultsPage';
import CategoryView from './pages/view/CategoryView';
import BusinessView from './pages/view/BusinessView';
import SavedProductsView from './pages/view/SavedProductsView';

const IndexRedirect = () => {
  const currentMode = localStorage.getItem('userRole') || 'ETN08';
  if (currentMode === 'ETK08') {
    return <Navigate to="/approver/product-groups" replace />;
  } else if (currentMode === 'VIEWER') {
    return <Navigate to="/view" replace />;
  } else {
    return <Navigate to="/product-groups" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* =========================================
            LUỒNG 1: QUẢN TRỊ / KIỂM DUYỆT (LAYOUT CHÍNH)
            URL bắt đầu bằng /
            ========================================= */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<IndexRedirect />} />

          {/* Quản lý Nhóm sản phẩm */}
          <Route path="product-groups" element={<ProductGroupPage />} />
          <Route path="product-groups/add" element={<AddGroupPage />} />
          <Route path="product-groups/:id" element={<CreateProductPage />} />
          
          {/* Quản lý Danh mục sản phẩm */}
          <Route path="product-category" element={<ProductCategoryPage />} />
          <Route path="product-category/add" element={<AddCategoryPage />} />
          <Route path="product-category/:id" element={<DetailCategoryPage />} />

          {/* Quản lý Mảng nghiệp vụ */}
          <Route path="business-management" element={<ProductBusinessPage />} />
          <Route path="business-management/add" element={<AddBusinessPage />} />
          <Route path="business-management/:id" element={<DetailBusinessPage />} />
          
          {/* Tiêu chí */}
          <Route path="criteria-management" element={<ProductCriteriaPage />} />
          <Route path="criteria-management/add" element={<AddCriteriaPage />} />
          <Route path="criteria-management/:id" element={<DetailCriteriaPage />} />

          {/* Quản lý Sản phẩm */}
          <Route path="products/official" element={<ProductPage />} />
          <Route path="products/processing" element={<ProductPage />} />
          <Route path="products/rejected" element={<ProductPage />} />
          <Route path="products/requests" element={<RequestListPage />} />
          <Route path="request-list" element={<RequestListPage />} />
          <Route path="approver/request-list" element={<ApproverRequestListPage />} />
          <Route path="product-approval-list" element={<ProductPage />} />
          <Route path="products/add" element={<AddProductPage />} />
          <Route path="products/:id" element={<DetailProductPage />} />
          {/* <Route path="product/:id" element={<DetailProductsPage />} /> */}
          <Route path="products/batch/:requestId" element={<BatchRequestDetailPage />} />
          
          {/* Luồng Duyệt (Approver) */}
          <Route path="approver/batch/:requestId" element={<ApproverBatchDetailPage />} />
          <Route path="approver/product-detail/:requestId" element={<ApproverProductDetailPage />} />
          <Route path="approver/product-groups" element={<ApproverProductGroupListPage />} />
          <Route path="approver/product-groups/:groupId" element={<ApproverProductGroupDetailPage />} />
          <Route path="approver/product-category" element={<ApproverProductCategoryListPage />} />
          <Route path="approver/product-category/:categoryId" element={<ApproverProductCategoryDetailPage />} />
          <Route path="approver/products/single" element={<ApproverProductSingleListPage />} />
          <Route path="approver/products/single/:productId" element={<ApproverProductSingleDetailPage />} />
          <Route path="approver/business" element={<ApproverBusinessListPage />} />
          <Route path="approver/business/:businessId" element={<ApproverBusinessDetailPage />} />
          <Route path="approver/criteria" element={<ApproverCriteriaListPage />} />
          <Route path="approver/criteria/:criteriaId" element={<ApproverCriteriaDetailPage />} />
        </Route>

        {/* =========================================
            LUỒNG 2: TRA CỨU SẢN PHẨM (VIEW LAYOUT)
            URL bắt đầu bằng /view
            ========================================= */}
        <Route path="/view" element={<ViewMainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="groups/:groupId" element={<GroupView />} />
          <Route path="product-detail/:id" element={<ProductDetailView />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="category/:categoryId" element={<CategoryView />} />
          <Route path="business/:businessId" element={<BusinessView />} />
          <Route path="saved-products" element={<SavedProductsView />} />
        </Route>

        {/* =========================================
            CATCH-ALL: XỬ LÝ KHI NHẬP SAI URL
            ========================================= */}
        <Route path="*" element={<Navigate to="/product-groups" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;