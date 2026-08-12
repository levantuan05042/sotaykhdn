import axios from 'axios';
import { API_ENDPOINTS } from '../config/view/apiConfig';;

export interface MenuItem {
  id: string | number;
  name: string;
  path?: string;
  children?: MenuItem[];
  count?: number;
  label?: 'Danh mục' | 'Nghiệp vụ' | 'Sản phẩm';
  type: 'static' | 'group' | 'category' | 'criteria' | 'product';
}

export const getSidebarData = async (): Promise<MenuItem[]> => {
  try {
    // Gọi đồng thời tất cả các API để tối ưu tốc độ phản hồi
    const [groupsRes, categoriesRes, criteriaRes, productsRes] = await Promise.all([
      axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, { params: { status: 'ACTIVE', active: true } }),
      axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST),
      axios.get(API_ENDPOINTS.PRODUCT_CRITERIA.LIST),
      axios.get(API_ENDPOINTS.PRODUCT.LIST)
    ]);

    const groups = groupsRes.data || [];
    const categories = categoriesRes.data || [];
    const criterias = criteriaRes.data || [];
    const products = productsRes.data || [];

    // Xây dựng cây phân cấp dữ liệu linh hoạt
    const dynamicMenu: MenuItem[] = groups.map((group: any) => {
      // 1. Tìm các danh mục thuộc Nhóm này
      const subCategories = categories.filter((cat: any) => cat.productGroupId === group.id || cat.groupId === group.id);

      if (subCategories.length > 0) {
        return {
          id: `group-${group.id}`,
          name: group.name,
          type: 'group',
          children: subCategories.map((cat: any) => {
            // 2. Tìm các Nghiệp vụ (Criteria) thuộc Danh mục này
            const subCriterias = criterias.filter((cri: any) => cri.categoryId === cat.id || cri.productCategoryId === cat.id);
            
            // Tính toán số lượng sản phẩm nằm trong danh mục này
            const catProductCount = products.filter((p: any) => p.categoryId === cat.id).length;

            return {
              id: `cat-${cat.id}`,
              name: cat.name,
              path: `/categories/${cat.id}`,
              type: 'category',
              label: 'Danh mục',
              count: cat.productCount || catProductCount || 0,
              children: subCriterias.length > 0 ? subCriterias.map((cri: any) => {
                // Tính số sản phẩm thuộc nghiệp vụ này
                const criProductCount = products.filter((p: any) => p.criteriaId === cri.id || p.businessId === cri.id).length;

                return {
                  id: `cri-${cri.id}`,
                  name: cri.name,
                  path: `/criteria/${cri.id}`,
                  type: 'criteria',
                  label: 'Nghiệp vụ',
                  count: cri.productCount || criProductCount || 0
                };
              }) : undefined
            };
          })
        };
      }

      // 3. TRƯỜNG HỢP ĐẶC BIỆT: Nhóm không có danh mục mà chứa thẳng sản phẩm
      const directProducts = products.filter((p: any) => p.productGroupId === group.id || p.groupId === group.id);
      return {
        id: `group-${group.id}`,
        name: group.name,
        type: 'group',
        children: directProducts.length > 0 ? directProducts.map((prod: any) => ({
          id: `prod-${prod.id}`,
          name: prod.name,
          path: `/products/detail/${prod.id}`,
          type: 'product',
          label: 'Sản phẩm'
        })) : undefined
      };
    });

    return dynamicMenu;
  } catch (error) {
    console.error('Hệ thống không thể tải cấu trúc danh mục sidebar:', error);
    return [];
  }
};