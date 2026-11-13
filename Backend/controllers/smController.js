// Backend/controllers/smController.js
const fs = require('fs');
const path = require('path');

// Direktori dashboard default
const DEFAULT_DASHBOARD_DIR = path.resolve(__dirname, '../../scientific-method/outputs/dashboard');
const CONFIG_PATH = path.resolve(__dirname, '../../scientific-method/config/poliklinik_divisi.json');
const CONFIG_EXAMPLE_PATH = path.resolve(__dirname, '../../scientific-method/config/poliklinik_divisi.example.json');

// Whitelist berkas yang diizinkan untuk mencegah Path Traversal
const ALLOWED_FILES = new Set([
  'meta.json',
  'summary.json',
  'trend_monthly.json',
  'heatmap_weekday_hour.json',
  'poli_load.json',
  'penjamin_composition.json',
  'forecast_vs_actual.json',
  'model_comparison.json',
  'feature_effects.json',
  'insights.json',
]);

// Pemetaan divisi default berdasarkan Backend/seed.js
const DEFAULT_ID_TO_DIVISI = {
  1: 'Divisi Umum & Rumah Tangga',
  2: 'Divisi IT & SIMRS',
  3: 'Divisi Sarana & Prasarana (IPS-RS)',
  4: 'Divisi Pelayanan Medis & Keperawatan',
  5: 'Divisi Penunjang Medis',
  6: 'Divisi Administrasi & Keuangan',
};

// Cache memory sederhana
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 menit

function getDashboardDir() {
  return process.env.SM_DASHBOARD_DIR || DEFAULT_DASHBOARD_DIR;
}

function loadDivisiMapping() {
  try {
    let raw = null;
    if (fs.existsSync(CONFIG_PATH)) {
      raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    } else if (fs.existsSync(CONFIG_EXAMPLE_PATH)) {
      raw = fs.readFileSync(CONFIG_EXAMPLE_PATH, 'utf-8');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.divisi_map || {};
    }
  } catch (err) {
    console.warn('[SM] Gagal memuat pemetaan poliklinik_divisi:', err.message);
  }
  // Fallback standar RSIA
  return {
    'Divisi Pelayanan Medis & Keperawatan': [
      'POLIKLINIK OBGYN',
      'POLIKLINIK UMUM',
      'UNIT IGD',
      'POLIKLINIK ANAK',
      'POLIKLINIK BEDAH',
      'BBL (BAYI BARU LAHIR)',
    ],
    'Divisi Penunjang Medis': ['LABORATORIUM'],
    'Divisi IT & SIMRS': [],
    'Divisi Umum & Rumah Tangga': [],
    'Divisi Sarana & Prasarana (IPS-RS)': [],
    'Divisi Administrasi & Keuangan': [],
  };
}

function resolveDivisiName(user) {
  if (!user) return null;
  if (user.divisi && typeof user.divisi === 'string') {
    return user.divisi;
  }
  if (user.divisiId) {
    const idNum = Number(user.divisiId);
    return DEFAULT_ID_TO_DIVISI[idNum] || null;
  }
  return null;
}

function filterForKadiv(filename, data, allowedPolis, divisiName) {
  // Salin objek mendalam agar tidak mencemari cache
  const cloned = JSON.parse(JSON.stringify(data));
  const polisSet = new Set(allowedPolis || []);

  switch (filename) {
    case 'summary.json': {
      // Hapus KPI Total RS secara ketat
      delete cloned.kpi_total_rs;
      const filteredPoli = {};
      if (cloned.by_poliklinik) {
        for (const [poliName, info] of Object.entries(cloned.by_poliklinik)) {
          if (polisSet.has(poliName)) {
            filteredPoli[poliName] = info;
          }
        }
      }
      cloned.by_poliklinik = filteredPoli;
      cloned.role_scope = {
        role: 'KADIV',
        divisi: divisiName || 'Tidak Terpetakan',
        accessible_poliklinik: Array.from(polisSet),
        note: 'Data dibatasi khusus untuk poliklinik di bawah divisi Anda.',
      };
      return cloned;
    }

    case 'trend_monthly.json':
    case 'heatmap_weekday_hour.json':
    case 'penjamin_composition.json':
    case 'forecast_vs_actual.json': {
      // Hapus total_rs
      delete cloned.total_rs;
      delete cloned.yoy_total_rs;
      const filteredPoli = {};
      if (cloned.by_poliklinik) {
        for (const [poliName, val] of Object.entries(cloned.by_poliklinik)) {
          if (polisSet.has(poliName)) {
            filteredPoli[poliName] = val;
          }
        }
      }
      cloned.by_poliklinik = filteredPoli;
      if (cloned.yoy_by_poliklinik) {
        const filteredYoyPoli = {};
        for (const [poliName, val] of Object.entries(cloned.yoy_by_poliklinik)) {
          if (polisSet.has(poliName)) {
            filteredYoyPoli[poliName] = val;
          }
        }
        cloned.yoy_by_poliklinik = filteredYoyPoli;
      }
      cloned.role_scope = {
        role: 'KADIV',
        divisi: divisiName || 'Tidak Terpetakan',
        accessible_poliklinik: Array.from(polisSet),
      };
      return cloned;
    }

    case 'poli_load.json': {
      if (Array.isArray(cloned.poliklinik_loads)) {
        cloned.poliklinik_loads = cloned.poliklinik_loads.filter((item) =>
          polisSet.has(item.poliklinik)
        );
      }
      cloned.role_scope = {
        role: 'KADIV',
        divisi: divisiName || 'Tidak Terpetakan',
        accessible_poliklinik: Array.from(polisSet),
      };
      return cloned;
    }

    case 'meta.json': {
      if (Array.isArray(cloned.poliklinik_list)) {
        cloned.poliklinik_list = cloned.poliklinik_list.filter((p) => polisSet.has(p));
      }
      if (Array.isArray(cloned.primary_poliklinik)) {
        cloned.primary_poliklinik = cloned.primary_poliklinik.filter((p) => polisSet.has(p));
      }
      cloned.role_scope = {
        role: 'KADIV',
        divisi: divisiName || 'Tidak Terpetakan',
        accessible_poliklinik: Array.from(polisSet),
      };
      return cloned;
    }

    default:
      // model_comparison, feature_effects, insights tetap aman ditampilkan
      cloned.role_scope = {
        role: 'KADIV',
        divisi: divisiName || 'Tidak Terpetakan',
        accessible_poliklinik: Array.from(polisSet),
      };
      return cloned;
  }
}

const getDashboardData = async (req, res) => {
  try {
    let requestedFile = String(req.params.file || '').trim();
    if (!requestedFile.endsWith('.json')) {
      requestedFile += '.json';
    }

    // 1. Validasi Whitelist Nama Berkas (Anti Path Traversal)
    if (!ALLOWED_FILES.has(requestedFile)) {
      return res.status(400).json({
        message: `Berkas '${requestedFile}' tidak valid atau tidak diizinkan.`,
        allowed_files: Array.from(ALLOWED_FILES),
      });
    }

    const dashboardDir = getDashboardDir();
    const resolvedPath = path.resolve(dashboardDir, requestedFile);

    // Pastikan path tetap berada di dalam dashboardDir
    if (!resolvedPath.startsWith(path.resolve(dashboardDir))) {
      return res.status(400).json({
        message: 'Akses path tidak sah (Path Traversal terdeteksi).',
      });
    }

    // 2. Periksa Keberadaan Berkas di Disk
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        message: `Data analitik '${requestedFile}' belum digenerate oleh sistem pipeline.`,
      });
    }

    // 3. Baca Data dari Cache atau Disk
    const now = Date.now();
    let data = null;
    const cacheKey = resolvedPath;
    const cachedItem = cache.get(cacheKey);

    if (cachedItem && now - cachedItem.timestamp < CACHE_TTL_MS) {
      data = cachedItem.data;
    } else {
      const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
      data = JSON.parse(rawContent);
      cache.set(cacheKey, { timestamp: now, data });
    }

    const user = req.user || {};
    const role = user.role;

    // 4. Hak Akses & Penyaringan Server-Side (RBAC)
    if (role === 'DIREKTUR') {
      // Direktur melihat seluruh data (Total RS + seluruh Poliklinik)
      return res.status(200).json({
        success: true,
        data,
      });
    }

    if (role === 'KADIV') {
      // Kadiv hanya melihat poliklinik divisinya sendiri
      const divisiMap = loadDivisiMapping();
      const divisiName = resolveDivisiName(user);
      const allowedPolis = (divisiName && divisiMap[divisiName]) || [];

      const filteredData = filterForKadiv(requestedFile, data, allowedPolis, divisiName);

      return res.status(200).json({
        success: true,
        data: filteredData,
      });
    }

    // Role lain ditolak
    return res.status(403).json({
      message: 'Akses ditolak. Jabatan Anda tidak memiliki izin untuk melihat modul analitik kunjungan.',
    });
  } catch (error) {
    console.error('[SM Controller] Terjadi kesalahan:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan pada server saat memproses data analitik kunjungan.',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardData,
  loadDivisiMapping,
  resolveDivisiName,
  filterForKadiv,
  getDashboardDir,
  ALLOWED_FILES,
};
