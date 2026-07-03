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
import RequestListPage from './pages/RequestListPage';



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
          <Route path="/products/add" element={<AddProductPage />} />
          <Route path="/products/:id" element={<DetailProductPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;