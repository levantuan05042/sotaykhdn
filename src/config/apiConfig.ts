// Nơi quản lý tập trung đường dẫn Server Backend
// export const BASE_URL = 'https://determine-september-helmet-archive.trycloudflare.com/api/v1';
export const BASE_URL = 'http://localhost:8082/api/v1';
export const AUTH_SERVICE_LOGIN_URL = 'http://localhost:8080/login';
export const AUTH_SERVICE_LOGOUT_URL = 'http://localhost:8080/logout';

// Bạn có thể gom sẵn các đầu Endpoint vào đây cho dễ quản lý
export const API_ENDPOINTS = {
  PRODUCT_GROUPS: {
    DETAIL: (id: string | number) => `${BASE_URL}/product-groups/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/product-groups/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/product-groups/delete/${id}`,
    LIST: `${BASE_URL}/product-groups`,
    REVIEW: (id: string | number) => `${BASE_URL}/product-groups/review/${id}`,
    DETAILS: (id: string | number) => `${BASE_URL}/product-groups/${id}/details`,
  },

   PRODUCT_CATEGORY: {
    DETAIL: (id: string | number) => `${BASE_URL}/product-category/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/product-category/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/product-category/delete/${id}`,
    LIST: `${BASE_URL}/product-category`,
    REVIEW: (id: string | number) => `${BASE_URL}/product-category/review/${id}`,
    DETAILS: (id: string | number) => `${BASE_URL}/product-category/${id}/details`,
  },

  PRODUCT_CRITERIA: {
    DETAIL: (id: string | number) => `${BASE_URL}/criteria/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/criteria/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/criteria/delete/${id}`,
    LIST: `${BASE_URL}/criteria`,
    REVIEW: (id: string | number) => `${BASE_URL}/criteria/review/${id}`,
  },

    PRODUCT_BUSINESS: {
    DETAIL: (id: string | number) => `${BASE_URL}/business/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/business/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/business/delete/${id}`,
    LIST: `${BASE_URL}/business`,
    REVIEW: (id: string | number) => `${BASE_URL}/business/review/${id}`,
  },

    PRODUCT: {
    DETAIL: (id: string | number) => `${BASE_URL}/products/detail/${id}`,
    REVIEW: (id: string | number) => `${BASE_URL}/products/review/${id}`,
    UPDATE: (id: string | number) => `${BASE_URL}/products/update/${id}`,
    DELETE: (id: string | number) => `${BASE_URL}/products/delete/${id}`,
    LIST: `${BASE_URL}/products`,
    SINGLE_FOR_APPROVAL: `${BASE_URL}/products/single/for-approval`,
    LIST2: `${BASE_URL}/product-requests`,
    EXPORT: `${BASE_URL}/products/export`,
    IMPORT: `${BASE_URL}/products/import`,
  },
  FILES: {
    UPLOAD: `${BASE_URL}/api/v1/files/upload`,
  },
  PRODUCT_REQUESTS: {
      GET_DETAIL: (requestId: string) => `${BASE_URL}/product-requests/${requestId}`,
      UPDATE_STATUS: (requestId: string) => `${BASE_URL}/product-requests/${requestId}/status`,
      PRODUCTS: (requestId: string) => `${BASE_URL}/product-requests/${requestId}/products`,
  },
  APPROVER: {
    PRODUCT_GROUPS: {
      LIST: `${BASE_URL}/approver/product-groups`,
      DETAIL: (id: string | number) => `${BASE_URL}/approver/product-groups/${id}`,
      REVIEW: (id: string | number) => `${BASE_URL}/approver/product-groups/review/${id}`,
    },
    PRODUCT_CATEGORY: {
      LIST: `${BASE_URL}/approver/product-category`,
      DETAIL: (id: string | number) => `${BASE_URL}/approver/product-category/${id}`,
      REVIEW: (id: string | number) => `${BASE_URL}/approver/product-category/review/${id}`,
    },
    PRODUCT_CRITERIA: {
      LIST: `${BASE_URL}/approver/criteria`,
      DETAIL: (id: string | number) => `${BASE_URL}/approver/criteria/${id}`,
      REVIEW: (id: string | number) => `${BASE_URL}/approver/criteria/review/${id}`,
    },
    PRODUCT_BUSINESS: {
      LIST: `${BASE_URL}/approver/business`,
      DETAIL: (id: string | number) => `${BASE_URL}/approver/business/${id}`,
      REVIEW: (id: string | number) => `${BASE_URL}/approver/business/review/${id}`,
    },
    PRODUCT: {
      SINGLE_FOR_APPROVAL: `${BASE_URL}/approver/products/single/for-approval`,
      DETAIL: (id: string | number) => `${BASE_URL}/approver/products/detail/${id}`,
      REVIEW: (id: string | number) => `${BASE_URL}/approver/products/review/${id}`,
    },
    PRODUCT_REQUESTS: {
      LIST: `${BASE_URL}/approver/product-requests`,
      GET_DETAIL: (requestId: string) => `${BASE_URL}/approver/product-requests/${requestId}`,
      PRODUCTS: (requestId: string) => `${BASE_URL}/approver/product-requests/${requestId}/products`,
      UPDATE_STATUS: (requestId: string) => `${BASE_URL}/approver/product-requests/${requestId}/status`,
    }
  }
};