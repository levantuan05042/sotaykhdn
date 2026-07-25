export interface MenuItem {
  name: string;
  path?: string;
  count?: number;
  children?: MenuItem[];
}
export type UserRole = 'ETN08' | 'ETK08' | 'VIEWER';
export const USER_ROLES: { code: UserRole; name: string }[] = [
  { code: 'ETN08', name: 'Biên tập viên (ETN08)' },
  { code: 'ETK08', name: 'Kiểm duyệt viên (ETK08)' },
  { code: 'VIEWER', name: 'Cán bộ tra cứu (VIEWER)' },
];
// 1. Menu Quyền Biên tập (ETN08)
export const EDIT_MENU_ITEMS: MenuItem[] = [
  { name: 'Quản lý nhóm sản phẩm', path: '/product-groups' },
  { name: 'Quản lý danh mục sản phẩm', path: '/product-category' },
  { name: 'Quản lý nghiệp vụ', path: '/business-management' },
  {
    name: 'Quản lý sản phẩm',
    children: [
      {
        name: 'Danh sách sản phẩm',
        children: [
          { name: 'Danh sách chính thức', path: '/products/official' },
          { name: 'Danh sách sản phẩm đang xử lý', path: '/products/processing' },
          { name: 'Danh sách sản phẩm từ chối', path: '/products/rejected' },
        ],
      },
      { name: 'Danh sách yêu cầu', path: '/request-list', count: 100 },
    ],
  },
  { name: 'Quản lý tiêu chí', path: '/criteria-management' },
];
// 2. Menu Quyền Kiểm duyệt (ETK08)
export const APPROVE_MENU_ITEMS: MenuItem[] = [
  { name: 'Danh sách yêu cầu', path: '/request-list', count: 100 },
  { name: 'Danh sách sản phẩm kiểm duyệt', path: '/product-approval-list' }
];
// 3. Menu Quyền Tra cứu (VIEWER)
export const VIEWER_MENU_ITEMS: MenuItem[] = [
  { name: 'Quản lý nhóm sản phẩm', path: '/product-groups' },
  { name: 'Quản lý danh mục sản phẩm', path: '/product-category' },
  { name: 'Quản lý nghiệp vụ', path: '/business-management' },
  {
    name: 'Tra cứu sản phẩm',
    children: [
      { name: 'Danh sách sản phẩm chính thức', path: '/products/official' },
    ],
  },
  { name: 'Quản lý tiêu chí', path: '/criteria-management' },
];
export const getMenuItemsByRole = (role: UserRole): MenuItem[] => {
  switch (role) {
    case 'ETK08':
      return APPROVE_MENU_ITEMS;
    case 'VIEWER':
      return VIEWER_MENU_ITEMS;
    case 'ETN08':
    default:
      return EDIT_MENU_ITEMS;
  }
};
