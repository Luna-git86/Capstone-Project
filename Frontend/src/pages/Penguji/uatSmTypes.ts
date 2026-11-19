// Frontend/src/pages/Penguji/uatSmTypes.ts

export type TabId = 'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5' | 'tab6';

export const RSIA_UAT_COLORS = {
  actual: '#0f5c43',
  forecast: '#f47a45',
  forecastText: '#d95d28',
  nbGlm: '#5a5fe0',
  bandFill: '#d5f0e1',
  bandStroke: '#40916c',
  normal: '#64748b',
  grid: '#e6efe9',
  axis: '#6b7770',
} as const;

export const UAT_CHART_FONT = {
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export function getUatHeatmapCellClass(val: number, maxVal: number): string {
  if (val <= 0 || maxVal <= 0) return 'bg-[#f6f8f7] text-[#98a39d]';
  const ratio = val / maxVal;
  if (ratio >= 0.78) return 'bg-[#0f5c43] text-white font-bold';
  if (ratio >= 0.54) return 'bg-[#2fa56e] text-white font-semibold';
  if (ratio >= 0.30) return 'bg-[#ace2c5] text-[#0f5c43] font-semibold';
  return 'bg-[#edf8f2] text-[#186b46]';
}

export function formatNumId(val: number | null | undefined, digits = 0): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export interface Tab1Data {
  loadSummary: {
    status: string;
    filesExpected: number;
    filesLoaded: number;
    totalRowsLoaded: number;
    totalColumns: number;
    allColumnsMatched: boolean;
    dateStart: string;
    dateEnd: string;
    totalDays: number;
    totalMonths: number;
    preprocessingApplied: boolean;
    hashingApplied: boolean;
    saltingApplied: boolean;
    labelNormalizationApplied: boolean;
  };
  files: Array<{
    fileName: string;
    status: string;
    fileSizeKb?: number | null;
    columnsCount: number;
    rows: number;
    dateMin: string;
    dateMax: string;
    natDates: number;
    nullCells: number;
    columnsVerified: boolean;
  }>;
  rawColumns: Array<{
    name: string;
    dtype: string;
    nullCount: number;
    roleInRaw: string;
    status: string;
  }>;
  rawPoliklinikDistribution: Array<{
    poliklinik: string;
    count: number;
    sharePct: number;
  }>;
  penjaminDistribution: Array<{
    penjamin: string;
    count: number;
    sharePct: number;
  }>;
  visitTypeDistribution: Array<{
    jenis: string;
    count: number;
    sharePct: number;
  }>;
  sampleRawRows: Array<{
    sumberBerkas: string;
    noRawatRaw: string;
    tglReg: string;
    jam: string;
    noRmRaw: string;
    pasienRaw: string;
    dokterRaw: string;
    poliklinikRaw: string;
    penjaminRaw: string;
    jenisKunjungan: string;
  }>;
}

export interface Tab2Data {
  stage2Summary: {
    rowsProcessed: number;
    totalDays: number;
    duplicates: number;
    missingDays: number;
    meanDaily: number;
    maxDaily: number;
    minDaily: number;
    igdMergedCount: number;
    penjaminDashReplacedCount: number;
    uniquePatientsHashed: number;
    uniqueDoctorsAnonymized: number;
    outlierDaysFlagged: number;
    primaryUnitsSharePct: number;
    rareUnitsSharePct: number;
  };
  preprocessingSteps: Array<{
    stepNo: number;
    stepKey: string;
    title: string;
    affectedColumns: string;
    rowsAfter: number;
    resultNote: string;
  }>;
  sampleAnonymizedRows: Array<{
    tanggal: string;
    jam: string;
    rmHashPreview?: string;
    poliklinik: string;
    kodeDokter: string;
    penjamin: string;
    jenisKunjungan: string;
    sumberBerkas: string;
  }>;
  dailySampleRows: Array<{
    date: string;
    dayName: string;
    isWeekend: boolean;
    visitCount: number;
    newPatients: number;
    returningPatients: number;
  }>;
  privacyComparisons: Array<{
    field: string;
    beforeExample: string;
    afterExample: string;
    status: string;
  }>;
  poliklinikLoads: Array<{
    poliklinik: string;
    total_visits: number;
    share_pct: number;
    daily_mean: number;
    daily_max: number;
    zero_days_pct?: number;
  }>;
  chronologicalSplit: Array<{
    phase: string;
    period: string;
    days: number;
    role: string;
  }>;
}

export interface Tab3Data {
  calendarAverages: { workday: number; weekend: number; holiday: number };
  featureCount: number;
  horizonDays: number;
  excludedColumnsNote: string;
  features: Array<{
    no: number;
    code: string;
    label: string;
    group: string;
    desc: string;
  }>;
  sampleEngineeredRows: Array<{
    date: string;
    dayName: string;
    visitCount: number;
    dayOfWeek: number;
    isWeekend: number;
    isHoliday: number;
    isRamadan: number;
    lag7: number | null;
    rollingMean7d: number | null;
    rollingMean28d: number | null;
  }>;
  holidayCountByYear: Record<string, number>;
  holidaysList: Array<{ date: string; year: string; name: string }>;
  heatmapUnits: string[];
  heatmapByUnit: Record<string, Array<{ day_of_week: number; day_name: string; hours: Record<string, number> }>>;
}

export interface Tab4Data {
  bestModel: string;
  testPeriod: { start: string; end: string; total_days: number };
  maeReductionPct: number;
  rmseReductionPct: number;
  leaderboard: Array<{
    model: string;
    key: string;
    role: string;
    mae: number;
    rmse: number;
    wapePct: number;
    bias: number;
    plainMeaning: string;
  }>;
  poliLeaderboard: Array<{
    poliklinik: string;
    bestModel: string;
    histGbMae: number;
    nbGlmMae: number;
    naiveMae: number;
    bestWapePct: number;
  }>;
  testSeriesUnits: string[];
  testSeriesByUnit: Record<
    string,
    Array<{
      date: string;
      actual: number | null;
      histgb: number;
      nbGlm: number;
      naive4w: number;
    }>
  >;
}

export interface Tab5Data {
  hypotheses: Array<{
    code: string;
    title: string;
    claim: string;
    status: string;
    evidence: string;
  }>;
  featureImportance: Array<{
    code: string;
    label: string;
    importance: number;
  }>;
  dayOfWeekMetrics: Array<{
    day: string;
    mae: number;
    wapePct: number;
    daysCount: number;
  }>;
  residualDiagnostics: {
    acfLag1: number;
    meanResidual: number;
    plainInterpretation: string;
  };
  figures: Array<{
    file: string;
    title: string;
    keyInsight: string;
  }>;
  integrityChecklist: Array<{
    id: string;
    label: string;
    description: string;
    passed: boolean;
  }>;
  latestIntegrityTests: Array<{ name: string; status: string }>;
}

export interface Tab6Data {
  projection2026: {
    h1Actual: number;
    h2Projected: number;
    fullYearEst: number;
    dailyMean: number;
    h2Days: number;
  };
  monthlyH2Series: Array<{
    label: string;
    histgb: number;
    nbGlm: number;
    ciLow: number;
    ciHigh: number;
    days: number;
  }>;
  unitH2List: Array<{
    poliklinik: string;
    projectedH2: number;
    dailyMeanH2: number;
  }>;
  dashboardFiles: Array<{
    file: string;
    label: string;
    ready: boolean;
    sizeKb: number;
    updatedAt: string | null;
  }>;
  allDashboardReady: boolean;
  dashboardViews: Array<{
    viewName: string;
    sourceFile: string;
    metricShown: string;
    targetPage: string;
  }>;
}
