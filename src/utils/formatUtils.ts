export const formatApprovedBy = (userVal: string | null | undefined): string => {
  if (!userVal) return '---';
  const val = String(userVal).trim();
  if (!val || val === '---') return '---';

  const storedFullName = localStorage.getItem('currentUserFullName');
  const storedUsername = localStorage.getItem('currentUserUsername');

  if (val === 'anonymousUser') {
    if (storedFullName) return storedFullName;
    return 'anonymousUser';
  }

  const parts = val.split('_');
  const username = parts[0];
  const branchCode = parts[1];

  const rawUsers = sessionStorage.getItem('beadminUsers');
  if (rawUsers) {
    try {
      const parsed = typeof rawUsers === 'string' && (rawUsers.startsWith('{') || rawUsers.startsWith('[')) ? JSON.parse(rawUsers) : rawUsers;
      const usersList = parsed.listUser || (Array.isArray(parsed) ? parsed : []);
      if (Array.isArray(usersList)) {
        let found = usersList.find((u: any) => u.username === username && branchCode && u.branchCode === branchCode);
        if (!found) {
          found = usersList.find((u: any) => u.username === username);
        }
        if (found && (found.fullname || found.fullName)) {
          return found.fullname || found.fullName;
        }
      }
    } catch (e) {
      console.error("Error parsing beadminUsers from sessionStorage", e);
    }
  }

  if (storedUsername && username === storedUsername && storedFullName) {
    return storedFullName;
  }

  return val;
};

export const formatUserFullName = formatApprovedBy;
export const formatCreatedBy = formatApprovedBy;

