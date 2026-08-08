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

/**
 * Hàm xử lý chuỗi (VD: "37ETN082_10500037" -> "37ETN082") và đối chiếu để lấy Fullname
 * @param rawName Chuỗi tên/mã người dùng trả về từ API
 * @param userMap Map danh sách người dùng (để tối ưu, nên truyền vào thay vì parse lại)
 */
export const getFullName = (
  rawName: string | null | undefined, 
  userMap: Record<string, string>
): string | null => {
  if (!rawName) return null;

  // Tách chuỗi lấy phần trước dấu '_'
  const baseUsername = rawName.split('_')[0];

  // Trả về fullname nếu có, nếu không thì trả về mã baseUsername
  return userMap[baseUsername] || baseUsername;
};