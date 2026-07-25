// Nơi quản lý tập trung đường dẫn Server Backend
export const BASE_URL = 'http://localhost:8082/api/v1';

// Bạn có thể gom sẵn các đầu Endpoint vào đây cho dễ quản lý
export const API_ENDPOINTS = {
  PRODUCT_GROUPS: {
    DETAIL: (id: string | number) => `${BASE_URL}/product-groups/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/product-groups/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/product-groups/delete/${id}`,
    LIST: `${BASE_URL}/product-groups`,
  },

   PRODUCT_CATEGORY: {
    DETAIL: (id: string | number) => `${BASE_URL}/product-category/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/product-category/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/product-category/delete/${id}`,
    LIST: `${BASE_URL}/product-category`,
  },

  PRODUCT_CRITERIA: {
    DETAIL: (id: string | number) => `${BASE_URL}/criteria/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/criteria/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/criteria/delete/${id}`,
    LIST: `${BASE_URL}/criteria`,
  },

    PRODUCT_BUSINESS: {
    DETAIL: (id: string | number) => `${BASE_URL}/business/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/business/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/business/delete/${id}`,
    LIST: `${BASE_URL}/business`,
  },

    PRODUCT: {
    DETAIL: (id: string | number) => `${BASE_URL}/products/detail/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/products/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/products/delete/${id}`,
    LIST: `${BASE_URL}/products`,
    LIST2: `${BASE_URL}/product-requests`,
    EXPORT: `${BASE_URL}/products/export`,
    IMPORT: `${BASE_URL}/products/import`,
  },
  FILES: {
    UPLOAD: `${BASE_URL}/files/upload`,
  },
  PRODUCT_REQUESTS: {
      UPDATE_STATUS: (requestId: string) => `${BASE_URL}/product-requests/${requestId}/status`,
  },
};