import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProductGroupPage from './pages/ProductGroupPage';
import ProductCategoryPage from './pages/ProductCategoryPage'; // Thêm dòng này
import CreateProductPage from './pages/DetailGroupPage';
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
import DetailProductsPage from './pages/DetailProductsPage';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Mặc định khi vào trang chủ sẽ dẫn đến Nhóm sản phẩm */}
          <Route index element={<Navigate to="/product-groups" replace />} />

          {/* Quản lý Nhóm sản phẩm */}
          <Route path="product-groups" element={<ProductGroupPage />} />
          <Route path="product-groups/add" element={<AddGroupPage />} />
          <Route path="product-groups/:id" element={<CreateProductPage />} />
          
          {/* Quản lý Danh mục sản phẩm */}
          <Route path="product-category" element={<ProductCategoryPage />} />
          <Route path="product-category/add" element={<AddCategoryPage />} />
          <Route path="/product-category/:id" element={<DetailCategoryPage />} />

          <Route path="/business-management" element={<ProductBusinessPage />} />
          <Route path="/business-management/add" element={<AddBusinessPage />} />
          <Route path="/business-management/:id" element={<DetailBusinessPage />} />
          
          {/*Tiêu chí */}
          <Route path="/criteria-management" element={<ProductCriteriaPage />} />
          <Route path="/criteria-management/add" element={<AddCriteriaPage />} />
          <Route path="/criteria-management/:id" element={<DetailCriteriaPage />} />

          <Route path="/products/official" element={<ProductPage />} />
          <Route path="/products/processing" element={<ProductPage />} />
          <Route path="/products/rejected" element={<ProductPage />} />
          <Route path="/products/requests" element={<RequestListPage />} />
          <Route path="/request-list" element={<RequestListPage />} />
          <Route path="/approver/request-list" element={<ApproverRequestListPage />} />
          <Route path="/product-approval-list" element={<ProductPage />} />
          <Route path="/products/add" element={<AddProductPage />} />
          <Route path="/products/:id" element={<DetailProductPage />} />
          <Route path="/product/:id" element={<DetailProductsPage />} />
          <Route path="/products/batch/:requestId" element={<BatchRequestDetailPage />} />
          <Route path="/approver/batch/:requestId" element={<ApproverBatchDetailPage />} />
          <Route path="/approver/product-detail/:requestId" element={<ApproverProductDetailPage />} />
          <Route path="/approver/product-groups" element={<ApproverProductGroupListPage />} />
          <Route path="/approver/product-groups/:groupId" element={<ApproverProductGroupDetailPage />} />
          <Route path="/approver/product-category" element={<ApproverProductCategoryListPage />} />
          <Route path="/approver/product-category/:categoryId" element={<ApproverProductCategoryDetailPage />} />
          <Route path="/approver/products/single" element={<ApproverProductSingleListPage />} />
          <Route path="/approver/products/single/:productId" element={<ApproverProductSingleDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;