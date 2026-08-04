// // src/utils/userUtils.ts

// /**
//  * Đọc sessionStorage và trả về một Map dạng: { "username": "fullname" }
//  */
// export const getUserMapFromStorage = (): Record<string, string> => {
//   try {
//     // Kiểm tra cả 2 key phòng trường hợp đặt tên beadminUsers hoặc headminUsers
//     const rawData = 
//       sessionStorage.getItem('beadminUsers') || 
//       sessionStorage.getItem('headminUsers');

//     if (!rawData) return {};

//     const parsedData = JSON.parse(rawData);
//     const userList = parsedData.listUser || (Array.isArray(parsedData) ? parsedData : []);

//     const map: Record<string, string> = {};
//     userList.forEach((user: any) => {
//       if (user.username) {
//         // Ánh xạ username -> fullname (nếu fullname rỗng thì lấy lại username)
//         map[user.username] = user.fullname || user.fullName || user.username;
//       }
//     });

//     return map;
//   } catch (error) {
//     console.error('Lỗi khi đọc danh sách User từ sessionStorage:', error);
//     return {};
//   }
// };

// /**
//  * Hàm hỗ trợ tra cứu trực tiếp Full Name theo Username
//  */
// export const getFullName = (username: string | null | undefined): string => {
//   if (!username) return '---';
//   const userMap = getUserMapFromStorage();
//   return userMap[username] || username;
// };