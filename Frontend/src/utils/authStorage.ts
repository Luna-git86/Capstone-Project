// Frontend/src/utils/authStorage.ts

/**
 * Menyimpan data sesi otentikasi.
 * Prioritas disimpan di sessionStorage agar terisolasi per-tab browser,
 * sehingga penguji dapat membuka 5 tab berbeda untuk 5 role sekaligus
 * tanpa risiko saling menimpa sesi.
 */
export const setAuthSession = (data: {
  token: string;
  userId: number | string;
  userRole: string;
  userName: string;
  telegramLinked?: boolean;
  userDivisiId?: number | string | null;
  userDivisiNama?: string | null;
}) => {
  // Simpan utama ke sessionStorage (terisolasi per-tab)
  sessionStorage.setItem('token', data.token);
  sessionStorage.setItem('userId', String(data.userId));
  sessionStorage.setItem('userRole', data.userRole);
  sessionStorage.setItem('userName', data.userName || '');
  sessionStorage.setItem('telegramLinked', data.telegramLinked ? '1' : '0');
  if (data.userDivisiId) {
    sessionStorage.setItem('userDivisiId', String(data.userDivisiId));
  } else {
    sessionStorage.removeItem('userDivisiId');
  }
  if (data.userDivisiNama) {
    sessionStorage.setItem('userDivisiNama', data.userDivisiNama);
  } else {
    sessionStorage.removeItem('userDivisiNama');
  }

  // Sinkronkan ke localStorage sebagai fallback
  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', String(data.userId));
  localStorage.setItem('userRole', data.userRole);
  localStorage.setItem('userName', data.userName || '');
  localStorage.setItem('telegramLinked', data.telegramLinked ? '1' : '0');
  if (data.userDivisiId) {
    localStorage.setItem('userDivisiId', String(data.userDivisiId));
  } else {
    localStorage.removeItem('userDivisiId');
  }
  if (data.userDivisiNama) {
    localStorage.setItem('userDivisiNama', data.userDivisiNama);
  } else {
    localStorage.removeItem('userDivisiNama');
  }
};

/**
 * Mengambil token otentikasi (prioritas sessionStorage tab aktif).
 */
export const getAuthToken = (): string | null => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

/**
 * Mengambil role otentikasi tab aktif.
 */
export const getAuthRole = (): string => {
  return sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'STAF';
};

/**
 * Mengambil nama user otentikasi tab aktif.
 */
export const getAuthUserName = (fallback = 'Pengguna RSIA'): string => {
  return sessionStorage.getItem('userName') || localStorage.getItem('userName') || fallback;
};

/**
 * Mengambil ID user otentikasi tab aktif.
 */
export const getAuthUserId = (): string | null => {
  return sessionStorage.getItem('userId') || localStorage.getItem('userId');
};

/**
 * Mengambil ID Divisi user otentikasi tab aktif.
 */
export const getAuthUserDivisiId = (): string => {
  return sessionStorage.getItem('userDivisiId') || localStorage.getItem('userDivisiId') || '';
};

export const getAuthDivisiId = getAuthUserDivisiId;

const DIVISI_FALLBACK_MAP: Record<string, string> = {
  '1': 'Pelayanan Medis',
  '2': 'Penunjang Medis',
  '3': 'Keperawatan & Kebidanan',
  '4': 'Umum & IT',
  '5': 'Administrasi & Keuangan',
  '6': 'HRD & Marketing',
};

/**
 * Mengambil Nama Divisi user otentikasi tab aktif.
 */
export const getAuthDivisiNama = (fallback?: string): string => {
  const storedNama = sessionStorage.getItem('userDivisiNama') || localStorage.getItem('userDivisiNama');
  if (storedNama) return storedNama;

  const role = getAuthRole();
  if (role === 'DIREKTUR') return 'Direksi (Seluruh Divisi)';
  if (role === 'ADMIN') return 'Administrator Sistem';

  const divisiId = getAuthUserDivisiId();
  if (divisiId && DIVISI_FALLBACK_MAP[divisiId]) {
    return DIVISI_FALLBACK_MAP[divisiId];
  }

  return fallback || (role === 'DIREKTUR' ? 'Seluruh Divisi' : 'Lintas Divisi');
};

/**
 * Memeriksa status penautan Telegram akun.
 */
export const isTelegramLinked = (): boolean => {
  return (sessionStorage.getItem('telegramLinked') || localStorage.getItem('telegramLinked')) === '1';
};

/**
 * Memperbarui status penautan Telegram akun di session tab aktif.
 */
export const setTelegramLinkedState = (linked: boolean) => {
  const val = linked ? '1' : '0';
  sessionStorage.setItem('telegramLinked', val);
  localStorage.setItem('telegramLinked', val);
};

/**
 * Menghapus sesi otentikasi saat logout.
 */
export const clearAuthSession = () => {
  sessionStorage.clear();
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userDivisiId');
  localStorage.removeItem('userDivisiNama');
  localStorage.removeItem('telegramLinked');
};
