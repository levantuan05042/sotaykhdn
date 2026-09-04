// src/utils/userUtils.ts

/**
 * Hàm lấy và parse danh sách người dùng từ sessionStorage thành một Map { username: fullname }
 * Nên gọi hàm này 1 lần ở ngoài vòng lặp để tối ưu hiệu suất.
 */
export const getUserMap = (): Record<string, string> => {
  const userMap: Record<string, string> = {};
  try {
    const rawUsers = sessionStorage.getItem('beadminUsers') || sessionStorage.getItem('headminUsers');
    if (rawUsers) {
      const parsedUsers = JSON.parse(rawUsers);
      const userList = parsedUsers.listUser || (Array.isArray(parsedUsers) ? parsedUsers : []);
      
      userList.forEach((user: any) => {
        if (user.username) {
          userMap[user.username] = user.fullname || user.fullName || user.username;
        }
      });
    }
  } catch (e) {
    console.error('Lỗi khi lấy dữ liệu user từ sessionStorage:', e);
  }
  return userMap;
};

import { formatApprovedBy } from './formatUtils';

export const getFullName = (
  rawName: string | null | undefined, 
  _userMap?: Record<string, string>
): string | null => {
  if (!rawName) return null;
  return formatApprovedBy(rawName);
};