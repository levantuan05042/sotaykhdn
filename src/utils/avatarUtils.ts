/**
 * Danh sách 5 avatar chuyên nghiệp, sắc nét, hoạt động 100% offline (SVG Data URI)
 * Không bao giờ bị lỗi link, hết hạn hay phụ thuộc mạng ngoài.
 */

// Avatar 1: Nam chuyên viên thanh lịch (Vest xanh navy, sơ mi xanh nhạt, cà vạt đỏ Agribank)
const AVATAR_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23DBEAFE"/>
      <stop offset="100%" stop-color="%2393C5FD"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(%23bg1)"/>
  <!-- Thân áo vest -->
  <path d="M22 100 C22 76 34 68 50 68 C66 68 78 76 78 100 Z" fill="%231E3A8A"/>
  <!-- Cổ áo sơ mi -->
  <polygon points="50,68 40,78 45,86 50,80 55,86 60,78" fill="%23FFFFFF"/>
  <!-- Cà vạt Agribank đỏ -->
  <polygon points="50,78 47,88 50,98 53,88" fill="%23B01E3E"/>
  <!-- Cổ -->
  <rect x="44" y="52" width="12" height="18" fill="%23FBD5B5" rx="3"/>
  <!-- Khuôn mặt -->
  <ellipse cx="50" cy="46" rx="18" ry="21" fill="%23FBD5B5"/>
  <!-- Mắt -->
  <circle cx="43" cy="44" r="2.2" fill="%231E293B"/>
  <circle cx="57" cy="44" r="2.2" fill="%231E293B"/>
  <!-- Miệng cười -->
  <path d="M44 54 Q50 60 56 54" stroke="%23B45309" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <!-- Tóc nam ngắn -->
  <path d="M30 42 C30 26 40 22 50 22 C60 22 70 26 70 42 C70 34 66 28 50 28 C34 28 30 36 30 42 Z" fill="%231F2937"/>
  <path d="M30 38 Q50 25 68 36" fill="%231F2937"/>
</svg>`;

// Avatar 2: Nữ chuyên viên ngân hàng duyên dáng (Tóc nâu bồng bềnh, áo đỏ đô)
const AVATAR_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23FCE7F3"/>
      <stop offset="100%" stop-color="%23FBCFE8"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(%23bg2)"/>
  <!-- Tóc dài phía sau -->
  <path d="M26 45 C24 72 32 88 32 95 L68 95 C68 88 76 72 74 45 Z" fill="%234A2810"/>
  <!-- Thân áo vest công sở -->
  <path d="M22 100 C22 75 35 68 50 68 C65 68 78 75 78 100 Z" fill="%23991B1B"/>
  <!-- Cổ áo trong -->
  <polygon points="50,68 42,80 50,86 58,80" fill="%23FFFFFF"/>
  <!-- Cổ -->
  <rect x="44" y="52" width="12" height="18" fill="%23FEE0C6" rx="3"/>
  <!-- Khuôn mặt -->
  <ellipse cx="50" cy="45" rx="17" ry="20" fill="%23FEE0C6"/>
  <!-- Mắt to và mi mắt -->
  <circle cx="43" cy="44" r="2.2" fill="%23374151"/>
  <circle cx="57" cy="44" r="2.2" fill="%23374151"/>
  <path d="M40 40 Q43 38 46 40" stroke="%234A2810" stroke-width="1.2" fill="none"/>
  <path d="M54 40 Q57 38 60 40" stroke="%234A2810" stroke-width="1.2" fill="none"/>
  <!-- Miệng cười tươi nhẹ -->
  <path d="M45 54 Q50 59 55 54" stroke="%23E11D48" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Tóc mái phía trước -->
  <path d="M31 40 C32 24 45 20 50 20 C58 20 69 24 69 40 C65 30 55 26 50 26 C42 26 35 32 31 40 Z" fill="%234A2810"/>
</svg>`;

// Avatar 3: Quản lý / Trưởng phòng nam chững chạc (Kính cận, áo vest xám than lịch lãm)
const AVATAR_3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23DCFCE7"/>
      <stop offset="100%" stop-color="%23BBF7D0"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(%23bg3)"/>
  <!-- Thân áo vest xám -->
  <path d="M22 100 C22 76 34 68 50 68 C66 68 78 76 78 100 Z" fill="%23334155"/>
  <!-- Sơ mi trắng -->
  <polygon points="50,68 41,78 46,86 50,82 54,86 59,78" fill="%23F8FAFC"/>
  <!-- Cà vạt xanh đậm -->
  <polygon points="50,80 47,88 50,98 53,88" fill="%230F766E"/>
  <!-- Cổ -->
  <rect x="44" y="52" width="12" height="18" fill="%23FED7AA" rx="3"/>
  <!-- Khuôn mặt -->
  <ellipse cx="50" cy="46" rx="18" ry="21" fill="%23FED7AA"/>
  <!-- Kính mắt sang trọng -->
  <rect x="37" y="40" width="11" height="8" rx="2.5" fill="none" stroke="%231E293B" stroke-width="1.8"/>
  <rect x="52" y="40" width="11" height="8" rx="2.5" fill="none" stroke="%231E293B" stroke-width="1.8"/>
  <line x1="48" y1="44" x2="52" y2="44" stroke="%231E293B" stroke-width="1.8"/>
  <!-- Mắt phía sau kính -->
  <circle cx="42.5" cy="44" r="1.8" fill="%230F172A"/>
  <circle cx="57.5" cy="44" r="1.8" fill="%230F172A"/>
  <!-- Nụ cười điềm tĩnh -->
  <path d="M45 54 Q50 58 55 54" stroke="%239A3412" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <!-- Tóc hoa râm / đen phong độ -->
  <path d="M30 42 C30 26 40 22 50 22 C60 22 70 26 70 42 C70 32 64 27 50 27 C36 27 30 34 30 42 Z" fill="%23475569"/>
</svg>`;

// Avatar 4: Nữ kiểm duyệt / Trưởng nhóm năng động (Tóc cột cao, áo vest xanh ngọc)
const AVATAR_4 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23FEF3C7"/>
      <stop offset="100%" stop-color="%23FDE68A"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(%23bg4)"/>
  <!-- Búi tóc / tóc cao -->
  <circle cx="50" cy="22" r="10" fill="%231E1B4B"/>
  <!-- Thân áo vest xanh ngọc -->
  <path d="M22 100 C22 75 35 68 50 68 C65 68 78 75 78 100 Z" fill="%23047857"/>
  <!-- Áo trong vàng kem -->
  <polygon points="50,68 43,82 50,88 57,82" fill="%23FEF9C3"/>
  <!-- Cổ -->
  <rect x="44" y="52" width="12" height="18" fill="%23FED7AA" rx="3"/>
  <!-- Khuôn mặt -->
  <ellipse cx="50" cy="46" rx="17" ry="20" fill="%23FED7AA"/>
  <!-- Mắt tinh anh -->
  <circle cx="43" cy="44" r="2.2" fill="%231E293B"/>
  <circle cx="57" cy="44" r="2.2" fill="%231E293B"/>
  <!-- Khuyên tai ngọc trai -->
  <circle cx="32" cy="47" r="2.2" fill="%23F8FAFC"/>
  <circle cx="68" cy="47" r="2.2" fill="%23F8FAFC"/>
  <!-- Nụ cười -->
  <path d="M44 55 Q50 60 56 55" stroke="%23BE123C" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Tóc mái rẽ ngôi hiện đại -->
  <path d="M31 42 C33 28 44 24 50 24 C57 24 68 28 69 42 C65 32 58 28 50 28 C41 28 35 32 31 42 Z" fill="%231E1B4B"/>
</svg>`;

// Avatar 5: Chuyên viên công nghệ / Phân tích trẻ trung (Tóc bồng bềnh, áo polo xanh Agribank)
const AVATAR_5 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23EDE9FE"/>
      <stop offset="100%" stop-color="%23DDD6FE"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(%23bg5)"/>
  <!-- Áo polo xanh Agribank -->
  <path d="M22 100 C22 76 34 68 50 68 C66 68 78 76 78 100 Z" fill="%230369A1"/>
  <!-- Cổ áo polo -->
  <polygon points="50,72 38,76 43,84 50,78 57,84 62,76" fill="%230284C7"/>
  <line x1="50" y1="78" x2="50" y2="92" stroke="%230369A1" stroke-width="1.8"/>
  <circle cx="50" cy="84" r="1.2" fill="%23FFFFFF"/>
  <circle cx="50" cy="89" r="1.2" fill="%23FFFFFF"/>
  <!-- Cổ -->
  <rect x="44" y="52" width="12" height="18" fill="%23FBD5B5" rx="3"/>
  <!-- Khuôn mặt -->
  <ellipse cx="50" cy="46" rx="18" ry="21" fill="%23FBD5B5"/>
  <!-- Mắt sáng -->
  <circle cx="43" cy="44" r="2.2" fill="%231E293B"/>
  <circle cx="57" cy="44" r="2.2" fill="%231E293B"/>
  <!-- Cười tươi trẻ -->
  <path d="M44 54 Q50 61 56 54" stroke="%239A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Tóc undercut trẻ trung -->
  <path d="M31 38 C31 22 42 18 50 18 C58 18 69 22 69 38 C69 30 63 24 50 24 C37 24 31 30 31 38 Z" fill="%23262626"/>
  <path d="M40 24 Q52 14 62 22" stroke="%23262626" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

export const RANDOM_AVATARS = [AVATAR_1, AVATAR_2, AVATAR_3, AVATAR_4, AVATAR_5];

const resolveAvatarSeed = (username?: string | number | null): string => {
  if (typeof username === 'number') return String(username);
  const raw = String(username ?? '').trim();
  if (raw) return raw;

  try {
    const stored =
      localStorage.getItem('currentUserUsername') ||
      localStorage.getItem('username') ||
      localStorage.getItem('currentUserFullName');
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }
  return 'default-user';
};

/**
 * Lấy avatar cố định theo chuỗi mã định danh (username, id, index). Không random theo lần render.
 */
export const getRandomAvatar = (seed?: string | number | null): string => {
  if (typeof seed === 'number') {
    const safeIdx = Math.abs(seed) % RANDOM_AVATARS.length;
    return RANDOM_AVATARS[safeIdx];
  }

  const str = resolveAvatarSeed(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % RANDOM_AVATARS.length;
  return RANDOM_AVATARS[idx];
};

/**
 * Lấy avatar của user hiện tại. Lưu index (0-4) để không bị đổi khi SVG/remount thay đổi.
 */
export const getUserAvatar = (username?: string | null): string => {
  const seed = resolveAvatarSeed(username);
  const key = `agri_user_avatar_idx_${seed}`;

  try {
    const savedIdx = localStorage.getItem(key);
    if (savedIdx != null) {
      const idx = Number(savedIdx);
      if (Number.isInteger(idx) && idx >= 0 && idx < RANDOM_AVATARS.length) {
        return RANDOM_AVATARS[idx];
      }
    }

    const legacyKey = `agri_user_avatar_${seed}`;
    const legacySaved = localStorage.getItem(legacyKey);
    if (legacySaved) {
      const legacyIdx = RANDOM_AVATARS.indexOf(legacySaved);
      if (legacyIdx >= 0) {
        localStorage.setItem(key, String(legacyIdx));
        return RANDOM_AVATARS[legacyIdx];
      }
    }
  } catch {
    // ignore
  }

  const avatar = getRandomAvatar(seed);
  const idx = Math.max(0, RANDOM_AVATARS.indexOf(avatar));
  try {
    localStorage.setItem(key, String(idx));
  } catch {
    // ignore
  }
  return avatar;
};
