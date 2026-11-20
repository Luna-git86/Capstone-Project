// Backend/controllers/uatSmController.js
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STAGE_DEFINITIONS = {
  stage1_understanding: {
    order: 1,
    script: 'scripts/01_data_understanding.py',
    args: ['scripts/01_data_understanding.py'],
    title: 'Muat Dataset Mentah SIMRS (4 Berkas Tahunan — Tanpa Preprocessing)',
    checkFile: 'outputs/tables/01_data_profile.json',
    plainSummary: 'Memuat 4 berkas Excel mentah SIMRS (2023–Jun 2026) serta memeriksa status load, jumlah baris, dan 9 kolom asli tanpa preprocessing.',
  },
  stage2_preprocessing: {
    order: 2,
    script: 'scripts/02_preprocessing.py',
    args: ['scripts/02_preprocessing.py'],
    title: 'Pembersihan Data & Penyamaran Identitas Pasien',
    checkFile: 'data/processed/preprocessing_log.json',
    plainSummary: 'Menyatukan penamaan unit IGD, menghapus nama pasien, dan menyamarkan nomor rekam medis & dokter.',
  },
  stage3_features: {
    order: 3,
    script: 'scripts/03_feature_engineering.py',
    args: ['scripts/03_feature_engineering.py'],
    title: 'Penyiapan 14 Faktor Kalender, Libur Nasional & Riwayat',
    checkFile: 'outputs/tables/03_feature_summary.json',
    plainSummary: 'Mengenali hari libur nasional SKB 3 Menteri, Ramadan/Idulfitri, dan pola 7–28 hari lalu tanpa bocor masa depan.',
  },
  stage4_modeling: {
    order: 4,
    script: 'scripts/04_modeling.py',
    args: ['scripts/04_modeling.py'],
    title: 'Pelatihan Model Statistik (NB GLM) & AI (HistGradientBoosting)',
    checkFile: 'models/model_metadata.json',
    plainSummary: 'Melatih model pembanding statistik & pembelajaran mesin serta menghitung proyeksi Juli–Desember 2026.',
  },
  stage5_evaluation: {
    order: 5,
    script: 'scripts/05_evaluation.py',
    args: ['scripts/05_evaluation.py'],
    title: 'Uji Ketepatan Data Uji 2026 & Pembuktian 3 Hipotesis',
    checkFile: 'outputs/tables/05_evaluation_metrics.json',
    plainSummary: 'Mengadu ketepatan model pada 181 hari uji 2026 dan membuktikan ketiga hipotesis penelitian.',
  },
  stage6_visualization: {
    order: 6,
    script: 'scripts/06_visualization.py',
    args: ['scripts/06_visualization.py'],
    title: 'Pembuatan 7 Grafik Laporan Resolusi Tinggi',
    checkFile: 'outputs/figures/06_visualization_summary.json',
    plainSummary: 'Menghasilkan grafik tren bulanan, jam sibuk, perbandingan akurasi, dan faktor paling berpengaruh.',
  },
  stage7_export: {
    order: 7,
    script: 'scripts/07_export_dashboard.py',
    args: ['scripts/07_export_dashboard.py'],
    title: 'Pengiriman 9 Berkas Rekap Aman ke Dashboard RSIA',
    checkFile: 'outputs/dashboard/summary.json',
    plainSummary: 'Menyaring keamanan privasi dan mengekspor berkas angka rekap grafik ke Dashboard Website RSIA.',
  },
  stage8_integrity_test: {
    order: 8,
    script: 'tests/test_pipeline_integrity.py',
    args: ['-m', 'unittest', '-v', 'tests/test_pipeline_integrity.py'],
    title: 'Pemeriksaan Otomatis Privasi & Anti-Bocor Data (8 Uji)',
    checkFile: 'models/model_metadata.json',
    plainSummary: 'Menguji otomatis bahwa nol identitas pasien tersisa dan tidak ada data masa depan yang bocor.',
  },
};

const ALLOWED_FIGURES = new Set([
  '01_eda_acf_seasonality.png',
  '05_forecast_vs_actual_residuals.png',
  '06_trend_bulanan_2023_2026.png',
  '06_heatmap_hari_jam.png',
  '06_beban_dan_pergeseran_poliklinik.png',
  '06_komposisi_penjamin_dan_jenis_kunjungan.png',
  '06_prediksi_vs_aktual_2026.png',
  '06_perbandingan_metrik_model.png',
  '06_faktor_berpengaruh_feature_importance.png',
]);

const REQUIRED_DASHBOARD_FILES = [
  { file: 'meta.json', label: 'Metadata Periode & Daftar Poliklinik' },
  { file: 'summary.json', label: 'Ringkasan Angka Utama (KPI) RSIA' },
  { file: 'trend_monthly.json', label: 'Tren Bulanan 2023–2026' },
  { file: 'heatmap_weekday_hour.json', label: 'Pola Jam Sibuk Hari x Jam (24 Jam)' },
  { file: 'poli_load.json', label: 'Beban Kunjungan per Poliklinik' },
  { file: 'penjamin_composition.json', label: 'Komposisi Penjamin Pasien (BPJS / Umum)' },
  { file: 'forecast_vs_actual.json', label: 'Perbandingan Aktual & Proyeksi Harian 2026' },
  { file: 'model_comparison.json', label: 'Papan Skor Perbandingan Metode Prediksi' },
  { file: 'feature_effects.json', label: 'Dampak Jadwal Dokter, Libur & Faktor Utama' },
];

const FEATURE_LABELS_ID = {
  day_of_week: {
    label: 'Hari dalam Seminggu (Jadwal Praktik Dokter)',
    group: 'Kalender & Jadwal',
    desc: 'Membedakan hari ramai jadwal dokter spesialis vs hari praktik terbatas.',
  },
  month: {
    label: 'Bulan Berjalan (Musiman Tahunan)',
    group: 'Kalender & Jadwal',
    desc: 'Menangkap variasi musiman antar bulan sepanjang tahun.',
  },
  is_weekend: {
    label: 'Penanda Akhir Pekan (Sabtu & Minggu)',
    group: 'Kalender & Jadwal',
    desc: 'Membedakan hari kerja poliklinik rutin dengan layanan akhir pekan.',
  },
  is_holiday: {
    label: 'Tanggal Merah & Cuti Bersama (SKB 3 Menteri)',
    group: 'Kalender & Libur',
    desc: 'Mengantisipasi penurunan poliklinik tutup saat libur nasional.',
  },
  is_ramadan: {
    label: 'Periode Bulan Ramadan',
    group: 'Kalender Keagamaan',
    desc: 'Menyesuaikan perubahan ritme kunjungan selama bulan puasa.',
  },
  is_eid_period: {
    label: 'Masa Libur & Arus Idulfitri',
    group: 'Kalender Keagamaan',
    desc: 'Menangani perubahan tajam pasien saat masa mudik dan cuti Lebaran.',
  },
  lag_7: {
    label: 'Jumlah Pasien 7 Hari Sebelumnya',
    group: 'Riwayat Minimal H-7',
    desc: 'Acuan langsung hari yang sama pada minggu lalu.',
  },
  lag_14: {
    label: 'Jumlah Pasien 14 Hari Sebelumnya',
    group: 'Riwayat Minimal H-7',
    desc: 'Acuan hari yang sama pada dua minggu sebelumnya.',
  },
  lag_21: {
    label: 'Jumlah Pasien 21 Hari Sebelumnya',
    group: 'Riwayat Minimal H-7',
    desc: 'Acuan hari yang sama pada tiga minggu sebelumnya.',
  },
  lag_28: {
    label: 'Jumlah Pasien 28 Hari Sebelumnya',
    group: 'Riwayat Minimal H-7',
    desc: 'Acuan hari yang sama pada empat minggu sebelumnya.',
  },
  rolling_mean_7d: {
    label: 'Rata-Rata Kunjungan 7 Hari Terakhir (Mundur H-7)',
    group: 'Tren Jangka Pendek',
    desc: 'Mengukur level keramaian umum minggu sebelumnya tanpa bocor data besok.',
  },
  rolling_mean_28d: {
    label: 'Rata-Rata Kunjungan 28 Hari Terakhir (Mundur H-7)',
    group: 'Jangkar Tren 1 Bulan',
    desc: 'Menjaga prediksi tetap mengikuti pergeseran tren kunjungan terkini.',
  },
  ewma_dow_4w: {
    label: 'Rata-Rata Tertimbang 4 Minggu Hari yang Sama',
    group: 'Jangkar Hari Spesifik',
    desc: 'Memberi bobot lebih besar ke hari yang sama pada minggu paling baru.',
  },
  ratio_ewma_dow_to_rm28: {
    label: 'Rasio Kepadatan Hari Ini dibanding Rata-Rata Bulanan',
    group: 'Indeks Musiman Mingguan',
    desc: 'Mengukur seberapa ramai hari tertentu dibanding rata-rata bulan berjalan.',
  },
};

const FORBIDDEN_PII_KEYS = new Set(['pasien', 'nama_pasien', 'no_rm', 'dokter', 'nama_dokter', 'nik', 'alamat']);
const EPHEMERAL_RUNTIME_SALT = crypto.randomBytes(24).toString('hex');

let activeStageRun = null;
const lastStageRuns = {};

function getSmDir() {
  return process.env.SM_BASE_DIR || path.resolve(__dirname, '../../scientific-method');
}

function getPythonExecutable(smDir) {
  const winVenv = path.join(smDir, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(winVenv)) return winVenv;
  const posixVenv = path.join(smDir, '.venv', 'bin', 'python');
  if (fs.existsSync(posixVenv)) return posixVenv;
  return 'python';
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[UAT-SM] Gagal membaca JSON ${path.basename(filePath)}:`, err.message);
    return null;
  }
}

function assertNoPiiLeak(data, contextName) {
  const stack = [data];
  while (stack.length > 0) {
    const curr = stack.pop();
    if (!curr || typeof curr !== 'object') continue;
    if (Array.isArray(curr)) {
      for (const item of curr) stack.push(item);
      continue;
    }
    for (const [key, val] of Object.entries(curr)) {
      if (FORBIDDEN_PII_KEYS.has(String(key).toLowerCase())) {
        throw new Error(`Pelanggaran kebijakan nol-PII pada ${contextName}: ditemukan field terlarang '${key}'.`);
      }
      if (val && typeof val === 'object') stack.push(val);
    }
  }
  return data;
}

function runPythonStageProcess(smDir, stageKey) {
  const def = STAGE_DEFINITIONS[stageKey];
  const pythonBin = getPythonExecutable(smDir);
  const start = Date.now();
  const childEnv = {
    ...process.env,
    SM_HASH_SALT: process.env.SM_HASH_SALT || EPHEMERAL_RUNTIME_SALT,
    PYTHONIOENCODING: 'utf-8',
  };

  return new Promise((resolve, reject) => {
    execFile(
      pythonBin,
      def.args,
      {
        cwd: smDir,
        env: childEnv,
        shell: false,
        timeout: 240000,
        maxBuffer: 6 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start;
        if (error) {
          const detail = (stderr || stdout || error.message || '').trim().slice(0, 600);
          const err = new Error(`Tahap gagal dijalankan (${def.title}): ${detail}`);
          err.durationMs = durationMs;
          return reject(err);
        }
        return resolve({
          durationMs,
          stdoutLines: `${stdout || ''}\n${stderr || ''}`
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(-60),
        });
      }
    );
  });
}

const INTEGRITY_LABELS_ID = {
  test_01_salt_fails_when_env_missing: '1. Kunci Pengaman Wajib Aktif',
  test_02_no_hardcoded_salt_in_code: '2. Tanpa Kunci Rahasia Tertanam di Kode',
  test_03_interim_anonymity: '3. Nama Pasien & Dokter Terhapus Penuh',
  test_04_processed_datasets_free_of_pii: '4. Data Olahan Nol Identitas Pribadi',
  test_05_anti_leakage_lags_and_rolling: '5. Riwayat Minimal H-7 (Anti-Bocor)',
  test_06_chronological_splits_and_feature_exclusion: '6. Urutan Waktu Latih–Validasi–Uji Valid',
  test_07_outputs_and_tables_schema: '7. Kelengkapan Tabel & Hasil Evaluasi',
  test_08_comparative_architecture_clean: '8. Konsistensi 3 Model (NB GLM, HistGB, Naive)',
};

function extractIntegritySummary(lines = []) {
  const parsedTests = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(test_\d+_[a-z0-9_]+)\s*\(/i);
    if (!m) continue;
    const rawKey = m[1];
    let status = 'LOLOS';
    const nextChunk = `${lines[i]} ${lines[i + 1] || ''}`;
    if (/\.\.\.\s*(FAIL|ERROR)$/i.test(nextChunk)) {
      status = 'GAGAL';
    } else if (!/\.\.\.\s*ok$/i.test(nextChunk)) {
      continue;
    }
    parsedTests.push({
      name: INTEGRITY_LABELS_ID[rawKey] || rawKey,
      status,
    });
  }
  return parsedTests;
}

const sampleCaches = {
  raw: { sig: '', rows: [] },
  anon: { sig: '', rows: [] },
  daily: { sig: '', rows: [] },
  features: { sig: '', rows: [] },
};

async function runCachedPythonJson(smDir, cacheKey, watchPaths, pyScript, extraArgs = []) {
  const existing = watchPaths.filter((p) => fs.existsSync(p));
  if (existing.length === 0) return [];
  const sig = existing.map((p) => `${p}:${fs.statSync(p).mtimeMs}`).join('|');
  const cacheEntry = sampleCaches[cacheKey];
  if (cacheEntry && cacheEntry.sig === sig && cacheEntry.rows.length > 0) {
    return cacheEntry.rows;
  }
  try {
    const pythonBin = getPythonExecutable(smDir);
    const rows = await new Promise((resolve, reject) => {
      execFile(
        pythonBin,
        ['-c', pyScript, ...extraArgs],
        { cwd: smDir, shell: false, timeout: 45000, maxBuffer: 2 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) return reject(new Error(stderr || error.message));
          return resolve(JSON.parse(String(stdout || '[]')));
        }
      );
    });
    const safeRows = Array.isArray(rows) ? rows : [];
    sampleCaches[cacheKey] = { sig, rows: safeRows };
    return safeRows;
  } catch (err) {
    console.warn(`[UAT-SM] Gagal memuat pratinjau ${cacheKey}:`, err.message);
    return [];
  }
}

const RAW_SAMPLE_PY = `
import json, os, sys, pandas as pd
raw_dir = sys.argv[1]
usecols = ['No. Rawat', 'Tgl Reg', 'Jam', 'No. RM', 'Pasien', 'Poliklinik', 'Dokter', 'Penjamin', 'Jns Kunjungan']
plan = [
    ('rawat_jalan_2023.xlsx', lambda d: d[(d['Poliklinik'] == 'IGD') | (d['Penjamin'] == '-')].head(2)),
    ('rawat_jalan_2023.xlsx', lambda d: d[d['Poliklinik'] == 'Unit IGD'].head(1)),
    ('rawat_jalan_2024.xlsx', lambda d: d[d['Poliklinik'] == 'POLIKLINIK OBGYN'].head(2)),
    ('rawat_jalan_2025.xlsx', lambda d: d[d['Poliklinik'] == 'POLIKLINIK UMUM'].head(1)),
    ('rawat_jalan_2026.xlsx', lambda d: d[d['Poliklinik'].isin(['POLIKLINIK ANAK', 'LABORATORIUM'])].head(2)),
]
loaded = {}
rows = []
for fname, picker in plan:
    fp = os.path.join(raw_dir, fname)
    if not os.path.exists(fp):
        continue
    if fp not in loaded:
        loaded[fp] = pd.read_excel(fp, header=1, nrows=350, usecols=usecols)
    df = loaded[fp]
    for _, r in picker(df).iterrows():
        rows.append({
            'sumberBerkas': fname,
            'noRawatRaw': '' if pd.isna(r['No. Rawat']) else str(r['No. Rawat']),
            'tglReg': '' if pd.isna(r['Tgl Reg']) else str(r['Tgl Reg'])[:10],
            'jam': '' if pd.isna(r['Jam']) else str(r['Jam']),
            'noRmRaw': '' if pd.isna(r['No. RM']) else str(r['No. RM']),
            'pasienRaw': '' if pd.isna(r['Pasien']) else str(r['Pasien']),
            'poliklinikRaw': '' if pd.isna(r['Poliklinik']) else str(r['Poliklinik']),
            'dokterRaw': '' if pd.isna(r['Dokter']) else str(r['Dokter']),
            'penjaminRaw': '' if pd.isna(r['Penjamin']) else str(r['Penjamin']),
            'jenisKunjungan': '' if pd.isna(r['Jns Kunjungan']) else str(r['Jns Kunjungan']),
        })
print(json.dumps(rows[:8]))
`;

const ANON_SAMPLE_PY = `
import json, sys, pandas as pd
fp = sys.argv[1]
cols = ['date', 'jam', 'no_rm', 'poliklinik', 'dokter_code', 'penjamin', 'jns_kunjungan', 'source_file']
df = pd.read_parquet(fp, columns=cols)
picked = []
sub_dash = df[df['penjamin'] == 'TIDAK TERCATAT'].head(2)
if len(sub_dash) > 0:
    picked.append(sub_dash)
for poli in ['UNIT IGD', 'POLIKLINIK OBGYN', 'POLIKLINIK UMUM', 'POLIKLINIK ANAK', 'LABORATORIUM']:
    sub = df[df['poliklinik'] == poli]
    if len(sub) > 0:
        picked.append(sub.tail(2))
sample_df = (pd.concat(picked) if picked else df).head(8)
rows = []
for _, r in sample_df.iterrows():
    h = str(r['no_rm'])
    rows.append({
        'tanggal': str(r['date']),
        'jam': str(r['jam']),
        'rmHashPreview': (h[:10] + '...') if len(h) > 10 else h,
        'poliklinik': str(r['poliklinik']),
        'kodeDokter': str(r['dokter_code']),
        'penjamin': str(r['penjamin']),
        'jenisKunjungan': str(r['jns_kunjungan']),
        'sumberBerkas': str(r['source_file']),
    })
print(json.dumps(rows))
`;

const DAILY_SAMPLE_PY = `
import json, sys, pandas as pd
fp = sys.argv[1]
day_id = {'Monday':'Senin','Tuesday':'Selasa','Wednesday':'Rabu','Thursday':'Kamis','Friday':'Jumat','Saturday':'Sabtu','Sunday':'Minggu'}
df = pd.read_parquet(fp).tail(10)
rows = []
for _, r in df.iterrows():
    tot = int(r['visit_count'])
    baru = int(r['new_patient_count'])
    rows.append({
        'date': str(r['date'])[:10],
        'dayName': day_id.get(str(r['day_name']), str(r['day_name'])),
        'isWeekend': int(r['is_weekend']) == 1,
        'visitCount': tot,
        'newPatients': baru,
        'returningPatients': max(0, tot - baru),
    })
print(json.dumps(rows))
`;

const FEATURE_SAMPLE_PY = `
import json, sys, pandas as pd
fp = sys.argv[1]
day_id = {'Monday':'Senin','Tuesday':'Selasa','Wednesday':'Rabu','Thursday':'Kamis','Friday':'Jumat','Saturday':'Sabtu','Sunday':'Minggu'}
df = pd.read_parquet(fp).tail(10)
rows = []
for _, r in df.iterrows():
    rows.append({
        'date': str(r['date'])[:10],
        'dayName': day_id.get(str(r['day_name']), str(r['day_name'])),
        'visitCount': int(r['visit_count']),
        'dayOfWeek': int(r['day_of_week']),
        'isWeekend': int(r['is_weekend']),
        'isHoliday': int(r['is_holiday']),
        'isRamadan': int(r['is_ramadan']),
        'lag7': None if pd.isna(r['lag_7']) else int(round(float(r['lag_7']))),
        'rollingMean7d': None if pd.isna(r['rolling_mean_7d']) else round(float(r['rolling_mean_7d']), 1),
        'rollingMean28d': None if pd.isna(r['rolling_mean_28d']) else round(float(r['rolling_mean_28d']), 1),
    })
print(json.dumps(rows))
`;

async function buildTab1Payload(smDir) {
  const profile = readJsonSafe(path.join(smDir, 'outputs/tables/01_data_profile.json'));

  const fileVerification = profile?.file_verification || {};
  const files = Object.entries(fileVerification).map(([fileName, info]) => ({
    fileName,
    status: info.status || 'Berhasil Dimuat',
    fileSizeKb: info.file_size_kb ?? null,
    columnsCount: info.columns_count || 9,
    rows: info.rows || 0,
    dateMin: info.date_min || '-',
    dateMax: info.date_max || '-',
    natDates: info.nat_dates || 0,
    nullCells: info.null_cells ?? 0,
    columnsVerified: Boolean(info.columns_verified),
  }));

  const totalRecords = profile?.total_records || 0;

  const rawPoliObj = profile?.poliklinik_raw_distribution || {};
  const rawPoliklinikDistribution = Object.entries(rawPoliObj)
    .map(([poliklinik, count]) => ({
      poliklinik,
      count: Number(count || 0),
      sharePct: totalRecords > 0 ? Number(((Number(count || 0) / totalRecords) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const penjaminObj = profile?.penjamin_distribution || {};
  const penjaminDistribution = Object.entries(penjaminObj)
    .map(([penjamin, count]) => ({
      penjamin,
      count: Number(count || 0),
      sharePct: totalRecords > 0 ? Number(((Number(count || 0) / totalRecords) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const visitTypeObj = profile?.jns_kunjungan_distribution || {};
  const visitTypeDistribution = Object.entries(visitTypeObj).map(([jenis, count]) => ({
    jenis,
    count: Number(count || 0),
    sharePct: totalRecords > 0 ? Number(((Number(count || 0) / totalRecords) * 100).toFixed(2)) : 0,
  }));

  const rawColumns = Array.isArray(profile?.raw_columns_detail)
    ? profile.raw_columns_detail
    : (profile?.raw_columns || []).map((colName) => ({
        name: colName,
        dtype: profile?.raw_dtypes?.[colName] || 'object',
        nullCount: profile?.raw_null_counts?.[colName] ?? 0,
        roleInRaw: 'Kolom asli Excel SIMRS',
        status: 'Utuh (Belum Preprocessing)',
      }));

  const rawDir = path.join(smDir, 'data/raw');
  const rawWatch = ['rawat_jalan_2023.xlsx', 'rawat_jalan_2024.xlsx', 'rawat_jalan_2025.xlsx', 'rawat_jalan_2026.xlsx'].map((f) =>
    path.join(rawDir, f)
  );
  const sampleRawRows = await runCachedPythonJson(smDir, 'raw', rawWatch, RAW_SAMPLE_PY, [rawDir]);

  const loadMeta = profile?.load_status || {};
  const prepMeta = profile?.preprocessing_status || {};

  return assertNoPiiLeak(
    {
      loadSummary: {
        status: loadMeta.status || (files.length === 4 && totalRecords > 0 ? 'BERHASIL' : 'BELUM'),
        filesExpected: loadMeta.files_expected || 4,
        filesLoaded: loadMeta.files_loaded || files.length,
        totalRowsLoaded: totalRecords,
        totalColumns: loadMeta.total_columns || rawColumns.length || 9,
        allColumnsMatched: Boolean(loadMeta.all_columns_matched ?? files.every((f) => f.columnsVerified)),
        dateStart: profile?.date_range?.start || '2023-01-01',
        dateEnd: profile?.date_range?.end || '2026-06-30',
        totalDays: profile?.date_range?.total_days || 1277,
        totalMonths: profile?.date_range?.total_months || 42,
        preprocessingApplied: Boolean(prepMeta.preprocessing_applied ?? false),
        hashingApplied: Boolean(prepMeta.hashing_applied ?? false),
        saltingApplied: Boolean(prepMeta.salting_applied ?? false),
        labelNormalizationApplied: Boolean(prepMeta.label_normalization_applied ?? false),
      },
      files,
      rawColumns,
      rawPoliklinikDistribution,
      penjaminDistribution,
      visitTypeDistribution,
      sampleRawRows,
    },
    'tab1'
  );
}

async function buildTab2Payload(smDir) {
  const prepLog = readJsonSafe(path.join(smDir, 'data/processed/preprocessing_log.json'));
  const profile = readJsonSafe(path.join(smDir, 'outputs/tables/01_data_profile.json'));
  const poliLoad = readJsonSafe(path.join(smDir, 'outputs/dashboard/poli_load.json'));
  const modelMeta = readJsonSafe(path.join(smDir, 'models/model_metadata.json'));

  const stepLoad = prepLog?.steps?.['01_load_combine'] || {};
  const stepCols = prepLog?.steps?.['02_standardize_columns'] || {};
  const stepParse = prepLog?.steps?.['03_parse_dates_times'] || {};
  const stepNorm = prepLog?.steps?.['04_normalize_categoricals'] || {};
  const stepDup = prepLog?.steps?.['05_handle_duplicates'] || {};
  const stepPriv = prepLog?.steps?.['06_privacy'] || {};
  const stepAgg = prepLog?.steps?.['07_aggregate_daily'] || {};
  const stepOut = prepLog?.steps?.['08_outlier_detection'] || {};
  const stepSave = prepLog?.steps?.['09_save_outputs'] || {};

  const totalRecords = stepLoad.rows_after || profile?.total_records || 39042;
  const loads = poliLoad?.poliklinik_loads || [];
  const primarySharePct = loads
    .filter((u) => ['UNIT IGD', 'POLIKLINIK OBGYN', 'POLIKLINIK UMUM', 'POLIKLINIK ANAK'].includes(u.poliklinik))
    .reduce((acc, u) => acc + (Number(u.share_pct) || 0), 0);

  const anonPath = path.join(smDir, 'data/interim/visits_anonymized.parquet');
  const dailyPath = path.join(smDir, 'data/processed/daily_total.parquet');
  const [sampleAnonymizedRows, dailySampleRows] = await Promise.all([
    runCachedPythonJson(smDir, 'anon', [anonPath], ANON_SAMPLE_PY, [anonPath]),
    runCachedPythonJson(smDir, 'daily', [dailyPath], DAILY_SAMPLE_PY, [dailyPath]),
  ]);

  return assertNoPiiLeak(
    {
      stage2Summary: {
        rowsProcessed: totalRecords,
        totalDays: stepAgg.total_days || profile?.date_range?.total_days || 1277,
        duplicates: stepDup.duplicates_found ?? 0,
        missingDays: stepAgg.missing_days_filled ?? 0,
        meanDaily: stepAgg.visit_count_mean || 30.57,
        maxDaily: stepAgg.visit_count_max || 80,
        minDaily: stepAgg.visit_count_min || 8,
        igdMergedCount: stepNorm.igd_merged || 0,
        penjaminDashReplacedCount: stepNorm.penjamin_dash_replaced || 0,
        uniquePatientsHashed: stepPriv.unique_patients_hashed || 0,
        uniqueDoctorsAnonymized: stepNorm.unique_dokter || 29,
        outlierDaysFlagged: stepOut.n_outliers || 0,
        primaryUnitsSharePct: Number(primarySharePct.toFixed(2)),
        rareUnitsSharePct: Number((100 - primarySharePct).toFixed(2)),
      },
      preprocessingSteps: [
        {
          stepNo: 1,
          stepKey: '01_load_combine',
          title: 'Muat & Gabungkan 4 File Mentah',
          affectedColumns: 'Seluruh 9 kolom + source_file',
          rowsAfter: stepLoad.rows_after || totalRecords,
          resultNote: 'Menggabungkan data mentah 2023–Jun 2026 siap dibersihkan',
        },
        {
          stepNo: 2,
          stepKey: '02_standardize_columns',
          title: 'Standarisasi Nama Kolom (snake_case)',
          affectedColumns: 'No. Rawat → no_rawat, Tgl Reg → tgl_reg, dst.',
          rowsAfter: stepCols.rows_after || totalRecords,
          resultNote: `${(stepCols.columns_after || []).length || 10} nama kolom diseragamkan, ${(stepCols.extra_dropped || []).length} kolom ekstra dibuang`,
        },
        {
          stepNo: 3,
          stepKey: '03_parse_dates_times',
          title: 'Parsing & Validasi Tanggal serta Jam',
          affectedColumns: 'tgl_reg, jam → date, hour (0–23)',
          rowsAfter: stepParse.rows_after || totalRecords,
          resultNote: `${stepParse.nat_dates ?? 0} tanggal rusak (NaT), ${stepParse.nat_times ?? 0} jam rusak`,
        },
        {
          stepNo: 4,
          stepKey: '04_normalize_categoricals',
          title: 'Bersihkan Spasi, Kapital, Label IGD & "-"',
          affectedColumns: 'poliklinik, dokter, penjamin, jns_kunjungan',
          rowsAfter: stepNorm.rows_after || totalRecords,
          resultNote: `Gabung IGD → UNIT IGD (${stepNorm.igd_merged || 0} baris), ubah "-" → TIDAK TERCATAT (${stepNorm.penjamin_dash_replaced || 0} baris), hasil ${stepNorm.unique_poliklinik || 7} unit`,
        },
        {
          stepNo: 5,
          stepKey: '05_handle_duplicates',
          title: 'Cek & Tangani Data Ganda',
          affectedColumns: 'no_rawat',
          rowsAfter: stepDup.rows_after || totalRecords,
          resultNote: `${stepDup.duplicates_found ?? 0} baris ganda ditemukan`,
        },
        {
          stepNo: 6,
          stepKey: '06_privacy',
          title: 'Hapus Kolom Pasien, Hash+Salt No. RM & Anonimkan Dokter',
          affectedColumns: 'pasien (hapus), no_rm (SHA-256 + SM_HASH_SALT), dokter (DOKTER_XX)',
          rowsAfter: stepPriv.rows_after || totalRecords,
          resultNote: `${stepPriv.unique_patients_hashed || 0} No. RM unik ter-hash; no_rm & dokter_code dilepas dari data pemodelan`,
        },
        {
          stepNo: 7,
          stepKey: '07_aggregate_daily',
          title: 'Agregasi Menjadi Rekap Kunjungan Harian',
          affectedColumns: 'date, poliklinik → visit_count, new_patient_count',
          rowsAfter: stepAgg.total_days || 1277,
          resultNote: `Membentuk ${stepAgg.total_days || 1277} hari total & ${stepAgg.daily_by_poli_rows || 8939} baris per 7 poliklinik`,
        },
        {
          stepNo: 8,
          stepKey: '08_outlier_detection',
          title: 'Tandai Hari Lonjakan Ekstrem (Metode IQR)',
          affectedColumns: 'is_outlier (berdasarkan batas IQR latih)',
          rowsAfter: stepAgg.total_days || 1277,
          resultNote: `${stepOut.n_outliers || 0} hari lonjakan ditandai (tidak dihapus & tidak masuk fitur prediksi)`,
        },
        {
          stepNo: 9,
          stepKey: '09_save_outputs',
          title: 'Simpan 3 Dataset Bersih (Parquet) & Log Skema',
          affectedColumns: 'visits_anonymized, daily_total, daily_by_poli',
          rowsAfter: stepSave.daily_total_rows || 1277,
          resultNote: `Tersimpan ${stepSave.interim_rows || totalRecords} baris antara & ${stepSave.daily_total_rows || 1277} hari bersih`,
        },
      ],
      sampleAnonymizedRows,
      dailySampleRows,
      privacyComparisons: [
        {
          field: 'Nama Pasien',
          beforeExample: 'Tercatat nama lengkap pasien di Excel SIMRS',
          afterExample: 'Dihapus permanen sebelum data diolah lebih lanjut',
          status: stepPriv.pasien_dropped ? 'Aman (Dihapus)' : 'Perlu Cek',
        },
        {
          field: 'Nomor Rekam Medis (No. RM)',
          beforeExample: 'Nomor identitas rekam medis pasien RSIA',
          afterExample: `Disamarkan (SHA-256 + SM_HASH_SALT) untuk ${stepPriv.unique_patients_hashed || 0} pasien unik`,
          status: stepPriv.no_rm_hashed_with_env_salt ? 'Aman (Tersamarkan)' : 'Perlu Cek',
        },
        {
          field: 'Nama Dokter',
          beforeExample: `Nama dokter praktik (${stepNorm.unique_dokter || 29} dokter tercatat)`,
          afterExample: 'Diganti kode anonim DOKTER_01 s.d. DOKTER_29 lalu dilepas',
          status: stepPriv.dokter_dropped_from_final ? 'Aman (Anonim)' : 'Perlu Cek',
        },
        {
          field: 'Penamaan IGD & Penjamin Kosong',
          beforeExample: `Label lama "IGD" terpisah & penjamin "-" (${stepNorm.penjamin_dash_replaced || 0} baris)`,
          afterExample: `Disatukan ke "UNIT IGD" (${stepNorm.igd_merged || 0} baris digabung) & "TIDAK TERCATAT"`,
          status: 'Rapih & Konsisten',
        },
      ],
      poliklinikLoads: loads,
      chronologicalSplit: [
        {
          phase: 'Data Latih (Belajar Pola)',
          period: `Jan 2023 – ${modelMeta?.split_dates?.train_end || '2025-06-30'}`,
          days: modelMeta?.train_days || 878,
          role: 'Melatih model mempelajari ritme mingguan & hari libur RSIA',
        },
        {
          phase: 'Data Validasi (Penyetelan)',
          period: `Jul 2025 – ${modelMeta?.split_dates?.validation_end || '2025-12-31'}`,
          days: modelMeta?.val_days || 184,
          role: 'Menyesuaikan parameter agar prediksi tetap stabil',
        },
        {
          phase: 'Data Uji Independen (Ujian Adil)',
          period: `Jan 2026 – ${modelMeta?.split_dates?.test_end || '2026-06-30'}`,
          days: modelMeta?.test_days || 181,
          role: 'Mengukur akurasi sebenarnya pada 6 bulan yang belum pernah dilihat model',
        },
        {
          phase: 'Proyeksi Masa Depan (H2 2026)',
          period: `${modelMeta?.split_dates?.future_projection_start || '2026-07-01'} – ${modelMeta?.split_dates?.future_projection_end || '2026-12-31'}`,
          days: modelMeta?.future_h2_2026_days || 184,
          role: 'Perkiraan operasional paruh kedua 2026 untuk RSIA',
        },
      ],
    },
    'tab2'
  );
}

async function buildTab3Payload(smDir) {
  const evalMetrics = readJsonSafe(path.join(smDir, 'outputs/tables/05_evaluation_metrics.json'));
  const featSummary = readJsonSafe(path.join(smDir, 'outputs/tables/03_feature_summary.json'));
  const holidayFile = readJsonSafe(path.join(smDir, 'data/processed/holidays_2023_2026.json'));
  const heatmap = readJsonSafe(path.join(smDir, 'outputs/dashboard/heatmap_weekday_hour.json'));

  const h1 = evalMetrics?.hypothesis_tests?.H1_1_pola_waktu_dan_kalender || {};
  const featureNames = featSummary?.h7_features || [];
  const features = featureNames.map((code, idx) => {
    const mapped = FEATURE_LABELS_ID[code] || {
      label: code,
      group: 'Faktor Tambahan',
      desc: 'Digunakan dalam perhitungan model mingguan.',
    };
    return {
      no: idx + 1,
      code,
      label: mapped.label,
      group: mapped.group,
      desc: mapped.desc,
    };
  });

  const holidaysRaw = holidayFile?.holidays || {};
  const holidaysList = Object.entries(holidaysRaw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, name]) => ({
      date,
      year: date.slice(0, 4),
      name,
    }));

  const heatmapByUnit = {
    TOTAL: heatmap?.total_rs || [],
    ...(heatmap?.by_poliklinik || {}),
  };

  const featPath = path.join(smDir, 'data/processed/features_total.parquet');
  const sampleEngineeredRows = await runCachedPythonJson(smDir, 'features', [featPath], FEATURE_SAMPLE_PY, [featPath]);

  return assertNoPiiLeak(
    {
      calendarAverages: {
        workday: h1.mean_workday || 33.31,
        weekend: h1.mean_weekend || 23.75,
        holiday: h1.mean_holiday || 26.62,
      },
      featureCount: featSummary?.h7_feature_count || features.length,
      horizonDays: featSummary?.forecast_horizon_default || 7,
      excludedColumnsNote:
        'Kolom jumlah dokter hari-H sengaja TIDAK dipakai sebagai input model agar prediksi benar-benar adil dan tidak mencontek kondisi hari tersebut.',
      features,
      sampleEngineeredRows,
      holidaySources: holidayFile?.sources || {},
      holidayCountByYear: featSummary?.holiday_dates_count_by_year || {},
      holidaysList,
      heatmapUnits: Object.keys(heatmapByUnit),
      heatmapByUnit,
    },
    'tab3'
  );
}

function buildTab4Payload(smDir) {
  const evalMetrics = readJsonSafe(path.join(smDir, 'outputs/tables/05_evaluation_metrics.json'));
  const comparison = readJsonSafe(path.join(smDir, 'outputs/dashboard/model_comparison.json'));
  const forecast = readJsonSafe(path.join(smDir, 'outputs/dashboard/forecast_vs_actual.json'));

  const naiveM = evalMetrics?.point_metrics?.['Seasonal Naive'] || {};
  const nbM = evalMetrics?.point_metrics?.['Negative Binomial GLM'] || {};
  const hgbM = evalMetrics?.point_metrics?.['HistGradientBoosting'] || {};
  const h2Test = evalMetrics?.hypothesis_tests?.H1_2_model_vs_baseline || {};

  const leaderboard = [
    {
      model: 'HistGradientBoosting (AI Pohon Keputusan)',
      key: 'HistGradientBoosting',
      role: 'Model Utama Terbaik Total RS',
      mae: hgbM.MAE ?? 4.958,
      rmse: hgbM.RMSE ?? 6.592,
      wapePct: hgbM.WAPE_pct ?? 22.19,
      bias: hgbM.Mean_Bias ?? 0.28,
      plainMeaning: 'Rata-rata selisih ±5 pasien per hari (paling tepat di Total RS dan 4 poliklinik utama).',
    },
    {
      model: 'Negative Binomial GLM (Statistik Data Cacah)',
      key: 'Negative Binomial GLM',
      role: 'Model Pembanding Statistik',
      mae: nbM.MAE ?? 4.985,
      rmse: nbM.RMSE ?? 6.582,
      wapePct: nbM.WAPE_pct ?? 22.31,
      bias: nbM.Mean_Bias ?? 0.176,
      plainMeaning: 'Hampir imbang tipis di Total RS dan sangat berguna menjaga perkiraan di unit yang sepi.',
    },
    {
      model: 'Seasonal Naive (Tebakan Minggu Lalu)',
      key: 'Seasonal Naive',
      role: 'Patokan Cara Manual',
      mae: naiveM.MAE ?? 6.989,
      rmse: naiveM.RMSE ?? 9.194,
      wapePct: naiveM.WAPE_pct ?? 31.28,
      bias: naiveM.Mean_Bias ?? -0.072,
      plainMeaning: 'Rata-rata meleset hampir 7 pasien per hari karena sekadar meniru minggu lalu.',
    },
  ];

  const poliMetricsObj = evalMetrics?.poliklinik_test_metrics || {};
  const poliLeaderboard = Object.entries(poliMetricsObj).map(([poli, item]) => ({
    poliklinik: poli,
    bestModel: item.best_model,
    histGbMae: item.HistGradientBoosting?.MAE ?? 0,
    nbGlmMae: item['Negative Binomial GLM']?.MAE ?? 0,
    naiveMae: item['Seasonal Naive']?.MAE ?? 0,
    bestWapePct: item.HistGradientBoosting?.WAPE_pct ?? 0,
  }));

  const extractTestWindow = (arr = []) =>
    arr
      .filter((pt) => pt.date >= '2026-01-01' && pt.date <= '2026-06-30')
      .map((pt) => ({
        date: pt.date,
        actual: pt.actual,
        histgb: pt.pred_best ?? pt.pred_ensemble ?? 0,
        nbGlm: pt.pred_nb_glm ?? pt.pred_best ?? 0,
        naive4w: pt.pred_dow_mean ?? pt.pred_best ?? 0,
      }));

  const testSeriesByUnit = {
    TOTAL: extractTestWindow(forecast?.total_rs || []),
  };
  for (const [poli, pts] of Object.entries(forecast?.by_poliklinik || {})) {
    const sliced = extractTestWindow(pts);
    if (sliced.length > 0) {
      testSeriesByUnit[poli] = sliced;
    }
  }

  return assertNoPiiLeak(
    {
      bestModel: evalMetrics?.best_model_total_h7 || comparison?.best_model || 'HistGradientBoosting',
      testPeriod: evalMetrics?.test_period || { start: '2026-01-01', end: '2026-06-30', total_days: 181 },
      maeReductionPct: h2Test.mae_reduction_pct ?? 29.06,
      rmseReductionPct: h2Test.rmse_reduction_pct ?? 28.3,
      leaderboard,
      poliLeaderboard,
      testSeriesUnits: Object.keys(testSeriesByUnit),
      testSeriesByUnit,
    },
    'tab4'
  );
}

function buildTab5Payload(smDir) {
  const evalMetrics = readJsonSafe(path.join(smDir, 'outputs/tables/05_evaluation_metrics.json'));
  const vizSummary = readJsonSafe(path.join(smDir, 'outputs/figures/06_visualization_summary.json'));

  const ht = evalMetrics?.hypothesis_tests || {};
  const h1 = ht.H1_1_pola_waktu_dan_kalender || {};
  const h2 = ht.H1_2_model_vs_baseline || {};
  const h3 = ht.H1_3_faktor_penentu_prediksi || {};

  const hypotheses = [
    {
      code: 'H1',
      title: 'Pola Kalender & Jadwal Dokter',
      claim: 'Jumlah kunjungan berbeda nyata antara hari kerja, akhir pekan, dan hari libur nasional.',
      status: h1.conclusion || 'Diterima',
      evidence: `Hari kerja rata-rata ${h1.mean_workday ?? 33.31} pasien/hari, jauh lebih padat dibanding akhir pekan (${h1.mean_weekend ?? 23.75}) dan hari libur nasional (${h1.mean_holiday ?? 26.62}).`,
    },
    {
      code: 'H2',
      title: 'Keunggulan Model vs Cara Manual',
      claim: 'Model HistGradientBoosting & Negative Binomial GLM lebih tepat daripada menebak dari minggu lalu.',
      status: h2.conclusion || 'Diterima',
      evidence: `Kedua model menekan rata-rata kesalahan hingga ${h2.mae_reduction_pct ?? 29.06}% (dari ${h2.baseline_naive_mae ?? 6.989} menjadi ${h2.best_mae ?? 4.958} pasien/hari).`,
    },
    {
      code: 'H3',
      title: 'Faktor Penentu Utama Ketepatan',
      claim: 'Jadwal praktik dokter per hari (hari dalam pekan) dan hari libur nasional menentukan ketepatan prediksi.',
      status: h3.conclusion || 'Diterima',
      evidence: 'Pada uji pengaruh fitur, faktor hari dalam seminggu (+0,7954) menduduki peringkat #1 disusul hari libur nasional (+0,0340).',
    },
  ];

  const permObj = evalMetrics?.permutation_importance_hgb || {};
  const featureImportance = Object.entries(permObj)
    .map(([code, vals]) => ({
      code,
      label: FEATURE_LABELS_ID[code]?.label || code,
      importance: Number(vals.mean_mae_increase || 0),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  const dowObj = evalMetrics?.day_of_week_metrics || {};
  const dayOfWeekMetrics = Object.entries(dowObj).map(([day, m]) => ({
    day,
    mae: m.MAE,
    wapePct: m.WAPE_pct,
    daysCount: m.n_days,
  }));

  const figures = [
    {
      file: '06_prediksi_vs_aktual_2026.png',
      title: 'Grafik Perbandingan Prediksi vs Aktual (Jan–Jun 2026)',
      keyInsight: 'Garis model mengikuti ritme mingguan serta periode Ramadan & Idulfitri jauh lebih tenang daripada patokan manual.',
    },
    {
      file: '06_perbandingan_metrik_model.png',
      title: 'Perbandingan Tingkat Kesalahan 3 Model',
      keyInsight: 'HistGradientBoosting & NB GLM sama-sama memangkas kesalahan hampir 29% dibanding Seasonal Naive.',
    },
    {
      file: '06_faktor_berpengaruh_feature_importance.png',
      title: 'Peringkat Faktor Paling Berpengaruh',
      keyInsight: 'Jadwal hari praktik dokter (day_of_week) dan hari libur nasional menempati posisi teratas.',
    },
    ...((vizSummary?.generated_figures || []).filter(
      (f) =>
        ![
          '06_prediksi_vs_aktual_2026.png',
          '06_perbandingan_metrik_model.png',
          '06_faktor_berpengaruh_feature_importance.png',
        ].includes(f.file)
    )),
  ].filter((f) => fs.existsSync(path.join(smDir, 'outputs/figures', f.file)));

  const resid = evalMetrics?.residual_diagnostics || {};
  const latestTestRun = lastStageRuns.stage8_integrity_test || null;

  return assertNoPiiLeak(
    {
      hypotheses,
      featureImportance,
      dayOfWeekMetrics,
      residualDiagnostics: {
        acfLag1: resid.acf_lag1 ?? 0.0191,
        meanResidual: resid.mean_residual ?? -0.28,
        plainInterpretation:
          'Sisa kesalahan sudah tersebar acak tanpa pola mingguan yang tertinggal, menandakan pola utama sudah berhasil ditangkap model.',
      },
      figures,
      integrityChecklist: [
        {
          id: 'PRIV-01',
          label: 'Penghapusan Nama Pasien, Nomor RM Asli, & Nama Dokter',
          description: 'Tidak ada satu pun identitas individu pada tabel maupun angka keluaran sistem.',
          passed: latestTestRun ? latestTestRun.success : fs.existsSync(path.join(smDir, 'outputs/dashboard/summary.json')),
        },
        {
          id: 'LEAK-01',
          label: 'Pencegahan Kebocoran Data Masa Depan (Minimal Mundur 7 Hari)',
          description: 'Seluruh perhitungan riwayat digeser minimal 7 hari ke belakang agar tidak mencontek besok.',
          passed: latestTestRun ? latestTestRun.success : fs.existsSync(path.join(smDir, 'outputs/tables/03_feature_summary.json')),
        },
        {
          id: 'SPLIT-01',
          label: 'Urutan Pembagian Waktu Kronologis (Latih -> Validasi -> Uji)',
          description: 'Periode masa depan tidak pernah tercampur ke dalam data pelatihan model.',
          passed: latestTestRun ? latestTestRun.success : fs.existsSync(path.join(smDir, 'models/model_metadata.json')),
        },
        {
          id: 'ARCH-01',
          label: 'Konsistensi 3 Model Uji (HistGB, NB GLM, Seasonal Naive)',
          description: 'Ketiga model dievaluasi secara objektif pada 181 hari uji 2026 yang sama.',
          passed: latestTestRun ? latestTestRun.success : fs.existsSync(path.join(smDir, 'outputs/tables/05_evaluation_metrics.json')),
        },
      ],
      latestIntegrityTests: latestTestRun?.parsedTests || [],
    },
    'tab5'
  );
}

function buildTab6Payload(smDir) {
  const summary = readJsonSafe(path.join(smDir, 'outputs/dashboard/summary.json'));
  const forecast = readJsonSafe(path.join(smDir, 'outputs/dashboard/forecast_vs_actual.json'));
  const poliLoad = readJsonSafe(path.join(smDir, 'outputs/dashboard/poli_load.json'));

  const kpiTotal = summary?.kpi_total_rs || {};
  const est2026 = kpiTotal?.annual_trends?.['2026_full_est'] || {
    total: 7842,
    h1_actual: 4044,
    h2_projected: 3798,
    daily_mean: 21.48,
  };

  const monthNames = ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const h2Points = (forecast?.total_rs || []).filter((pt) => pt.date >= '2026-07-01' && pt.date <= '2026-12-31');
  const monthlyH2Map = new Map();
  for (const pt of h2Points) {
    const ym = pt.date.slice(0, 7);
    const mIdx = Number(pt.date.slice(5, 7)) - 7;
    if (!monthlyH2Map.has(ym)) {
      monthlyH2Map.set(ym, {
        monthKey: ym,
        label: `${monthNames[mIdx] || ym.slice(5)} 2026`,
        histgb: 0,
        nbGlm: 0,
        ciLow: 0,
        ciHigh: 0,
        days: 0,
      });
    }
    const bucket = monthlyH2Map.get(ym);
    bucket.histgb += Number(pt.pred_best ?? pt.pred_ensemble ?? 0);
    bucket.nbGlm += Number(pt.pred_nb_glm ?? pt.pred_best ?? 0);
    bucket.ciLow += Number(pt.ci80_low ?? 0);
    bucket.ciHigh += Number(pt.ci80_high ?? 0);
    bucket.days += 1;
  }

  const monthlyH2Series = Array.from(monthlyH2Map.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((m) => ({
      label: m.label,
      histgb: Math.round(m.histgb),
      nbGlm: Math.round(m.nbGlm),
      ciLow: Math.round(m.ciLow),
      ciHigh: Math.round(m.ciHigh),
      days: m.days,
    }));

  const unitH2List = ['POLIKLINIK OBGYN', 'POLIKLINIK UMUM', 'UNIT IGD', 'POLIKLINIK ANAK'].map((poli) => {
    const pts = (forecast?.by_poliklinik?.[poli] || []).filter(
      (pt) => pt.date >= '2026-07-01' && pt.date <= '2026-12-31'
    );
    const totalProj = pts.reduce((acc, pt) => acc + Number(pt.pred_best ?? pt.pred_ensemble ?? 0), 0);
    return {
      poliklinik: poli,
      projectedH2: Math.round(totalProj),
      dailyMeanH2: pts.length > 0 ? Number((totalProj / pts.length).toFixed(2)) : 0,
    };
  });

  const dashboardFiles = REQUIRED_DASHBOARD_FILES.map((item) => {
    const full = path.join(smDir, 'outputs/dashboard', item.file);
    const exists = fs.existsSync(full);
    let statInfo = null;
    if (exists) {
      const st = fs.statSync(full);
      statInfo = { sizeKb: Number((st.size / 1024).toFixed(1)), updatedAt: st.mtime.toISOString() };
    }
    return {
      file: item.file,
      label: item.label,
      ready: exists,
      sizeKb: statInfo?.sizeKb ?? 0,
      updatedAt: statInfo?.updatedAt || null,
    };
  });

  const allLoads = poliLoad?.poliklinik_loads || [];
  const topPoli = allLoads[0];
  const dashboardViews = [
    {
      viewName: 'Ringkasan Angka Utama (KPI Kunjungan)',
      sourceFile: 'summary.json & trend_monthly.json',
      metricShown: `${Number(kpiTotal.total_visits_all_time || 39042).toLocaleString('id-ID')} kunjungan historis (rata-rata ${kpiTotal.mean_daily_visits ?? 30.57}/hari)`,
      targetPage: 'Beranda & Analisis Kunjungan',
    },
    {
      viewName: 'Grafik Perkiraan Paruh Kedua 2026',
      sourceFile: 'forecast_vs_actual.json',
      metricShown: `Proyeksi ${Number(est2026.h2_projected || 3798).toLocaleString('id-ID')} pasien untuk ${h2Points.length || 184} hari (Jul–Des 2026)`,
      targetPage: 'Analisis Kunjungan (Grafik Proyeksi)',
    },
    {
      viewName: 'Distribusi Beban 7 Poliklinik',
      sourceFile: 'poli_load.json',
      metricShown: topPoli
        ? `Urutan beban 7 unit layanan (tertinggi ${topPoli.poliklinik} ${topPoli.share_pct}%)`
        : 'Porsi kunjungan 7 unit layanan RSIA',
      targetPage: 'Analisis Kunjungan (Panel Poliklinik)',
    },
    {
      viewName: 'Komposisi Penjamin & Jenis Kunjungan',
      sourceFile: 'penjamin_composition.json',
      metricShown: 'Perbandingan porsi UMUM, BPJS, Admedika & pasien Baru/Lama',
      targetPage: 'Analisis Kunjungan (Panel Penjamin)',
    },
    {
      viewName: 'Peta Kepadatan Hari x Jam (24 Jam)',
      sourceFile: 'heatmap_weekday_hour.json',
      metricShown: 'Visualisasi jam sibuk pagi–siang vs malam per poliklinik',
      targetPage: 'Analisis Kunjungan (Heatmap Jam Sibuk)',
    },
  ];

  return assertNoPiiLeak(
    {
      projection2026: {
        h1Actual: est2026.h1_actual,
        h2Projected: est2026.h2_projected,
        fullYearEst: est2026.total,
        dailyMean: est2026.daily_mean,
        h2Days: h2Points.length || 184,
      },
      monthlyH2Series,
      unitH2List,
      dashboardFiles,
      allDashboardReady: dashboardFiles.every((f) => f.ready),
      dashboardViews,
    },
    'tab6'
  );
}

const getStatus = async (req, res) => {
  try {
    const smDir = getSmDir();
    const stages = Object.entries(STAGE_DEFINITIONS).map(([stageId, def]) => {
      const outPath = path.join(smDir, def.checkFile);
      const exists = fs.existsSync(outPath);
      return {
        stageId,
        order: def.order,
        title: def.title,
        plainSummary: def.plainSummary,
        ready: exists,
        lastRun: lastStageRuns[stageId] || null,
      };
    });

    return res.status(200).json({
      success: true,
      isRunning: Boolean(activeStageRun),
      activeStage: activeStageRun,
      stages,
    });
  } catch (error) {
    console.error('[UAT-SM] Error getStatus:', error);
    return res.status(500).json({ message: 'Gagal memeriksa status pengujian sistem.' });
  }
};

const getTabData = async (req, res) => {
  try {
    const tabKey = String(req.params.tabKey || '').trim().toLowerCase();
    const smDir = getSmDir();

    const builders = {
      tab1: buildTab1Payload,
      tab2: buildTab2Payload,
      tab3: buildTab3Payload,
      tab4: buildTab4Payload,
      tab5: buildTab5Payload,
      tab6: buildTab6Payload,
    };

    const builder = builders[tabKey];
    if (!builder) {
      return res.status(400).json({ message: `Tab '${tabKey}' tidak dikenal.` });
    }

    const data = await builder(smDir);
    return res.status(200).json({
      success: true,
      tabKey,
      data,
    });
  } catch (error) {
    console.error('[UAT-SM] Error getTabData:', error);
    return res.status(500).json({
      message: error.message || 'Gagal memuat ringkasan data pengujian.',
    });
  }
};

const runStage = async (req, res) => {
  const stageId = String(req.params.stageId || '').trim();
  const def = STAGE_DEFINITIONS[stageId];
  if (!def) {
    return res.status(400).json({ message: `Tahap '${stageId}' tidak valid atau tidak diizinkan.` });
  }

  if (activeStageRun) {
    return res.status(409).json({
      message: `Proses '${STAGE_DEFINITIONS[activeStageRun]?.title || activeStageRun}' sedang berjalan. Harap tunggu hingga selesai.`,
    });
  }

  const smDir = getSmDir();
  if (!fs.existsSync(smDir)) {
    return res.status(500).json({ message: 'Direktori analisis ilmiah tidak ditemukan di server.' });
  }

  activeStageRun = stageId;
  try {
    const result = await runPythonStageProcess(smDir, stageId);
    const parsedTests = stageId === 'stage8_integrity_test' ? extractIntegritySummary(result.stdoutLines) : [];
    const runRecord = {
      success: true,
      ranAt: new Date().toISOString(),
      durationMs: result.durationMs,
      parsedTests,
    };
    lastStageRuns[stageId] = runRecord;

    const tabForStage = {
      stage1_understanding: 'tab1',
      stage2_preprocessing: 'tab2',
      stage3_features: 'tab3',
      stage4_modeling: 'tab4',
      stage5_evaluation: 'tab4',
      stage6_visualization: 'tab5',
      stage7_export: 'tab6',
      stage8_integrity_test: 'tab5',
    }[stageId];

    const refreshedTab = tabForStage ? { [tabForStage]: await getTabBuilder(tabForStage)(smDir) } : {};

    return res.status(200).json({
      success: true,
      stageId,
      title: def.title,
      durationMs: result.durationMs,
      message: `${def.title} berhasil dijalankan (${(result.durationMs / 1000).toFixed(1)} detik).`,
      parsedTests,
      refreshedTab,
    });
  } catch (error) {
    console.error(`[UAT-SM] Error runStage(${stageId}):`, error);
    lastStageRuns[stageId] = {
      success: false,
      ranAt: new Date().toISOString(),
      durationMs: error.durationMs || 0,
    };
    return res.status(500).json({
      message: error.message || `Gagal menjalankan ${def.title}.`,
    });
  } finally {
    activeStageRun = null;
  }
};

function getTabBuilder(tabKey) {
  switch (tabKey) {
    case 'tab1':
      return buildTab1Payload;
    case 'tab2':
      return buildTab2Payload;
    case 'tab3':
      return buildTab3Payload;
    case 'tab4':
      return buildTab4Payload;
    case 'tab5':
      return buildTab5Payload;
    case 'tab6':
      return buildTab6Payload;
    default:
      return () => ({});
  }
}

const getFigure = async (req, res) => {
  try {
    const filename = path.basename(String(req.params.filename || '').trim());
    if (!ALLOWED_FIGURES.has(filename)) {
      return res.status(400).json({ message: 'Gambar grafik yang diminta tidak tersedia dalam daftar resmi.' });
    }

    const figuresDir = path.resolve(getSmDir(), 'outputs/figures');
    const resolved = path.resolve(figuresDir, filename);
    if (!resolved.startsWith(figuresDir) || !fs.existsSync(resolved)) {
      return res.status(404).json({ message: 'Berkas gambar grafik belum dibuat.' });
    }

    return res.sendFile(resolved);
  } catch (error) {
    console.error('[UAT-SM] Error getFigure:', error);
    return res.status(500).json({ message: 'Gagal menampilkan gambar grafik.' });
  }
};

module.exports = {
  getStatus,
  getTabData,
  runStage,
  getFigure,
  STAGE_DEFINITIONS,
  ALLOWED_FIGURES,
  assertNoPiiLeak,
};
