export const formatApprovedBy = (approvedByVal: string): string => {
  if (!approvedByVal) return '---';
  if (!approvedByVal.includes('_')) {
    return approvedByVal;
  }
  const parts = approvedByVal.split('_');
  const username = parts[0];

  // 1. Tra cứu trong sessionStorage (danh sách user sạch từ BEAdmin)
  const rawUsers = sessionStorage.getItem('beadminUsers');
  if (rawUsers) {
    try {
      const usersList = JSON.parse(rawUsers);
      if (Array.isArray(usersList)) {
        const found = usersList.find((u: any) => u.username === username);
        if (found && found.fullname) {
          return found.fullname;
        }
      }
    } catch (e) {
      console.error("Lỗi khi giải mã beadminUsers từ sessionStorage", e);
    }
  }

  // 2. Tra cứu từ thông tin user hiện tại trong localStorage làm phương án dự phòng
  const storedUsername = localStorage.getItem('currentUserUsername');
  const storedFullName = localStorage.getItem('currentUserFullName');

  if (storedUsername && username === storedUsername) {
    return storedFullName || username;
  }
  return username;
};
