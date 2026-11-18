import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import api from '../services/api';
import { getAuthRole, getAuthDivisiNama } from '../utils/authStorage';

interface MetaData {
  data_period: {
    start_date: string;
    end_date: string;
    future_forecast_end_date?: string;
    total_days: number;
  };
  poliklinik_list: string[];
}

interface SummaryData {
  kpi_total_rs?: {
    total_visits_all_time: number;
    mean_daily_visits: number;
    peak_day: { date: string; visits: number; day_name: string };
    annual_trends: Record<
      string,
      { total: number; daily_mean: number; h1_actual?: number; h2_projected?: number }
    >;
  };
  by_poliklinik: Record<
    string,
    {
      total_visits: number;
      mean_daily: number;
      share_pct: number;
      peak_day: { date: string; visits: number };
    }
  >;
}

interface ForecastPoint {
  date: string;
  is_future?: boolean;
  actual: number | null;
  pred_best?: number;
  pred_ensemble?: number;
  pred_nb_glm?: number;
  pred_dow_mean?: number;
  ci80_low: number;
  ci80_high: number;
}

interface ForecastData {
  total_rs?: ForecastPoint[];
  by_poliklinik: Record<string, ForecastPoint[]>;
}

interface PoliLoadData {
  poliklinik_loads: Array<{
    poliklinik: string;
    total_visits: number;
    share_pct: number;
    daily_mean: number;
    daily_max: number;
  }>;
}

interface PenjaminData {
  total_rs?: Array<{ penjamin: string; count: number; share_pct: number }>;
  by_poliklinik: Record<string, Array<{ penjamin: string; count: number; share_pct: number }>>;
}

interface HeatmapData {
  total_rs?: Array<{ day_of_week: number; day_name: string; hours: Record<string, number> }>;
  by_poliklinik: Record<
    string,
    Array<{ day_of_week: number; day_name: string; hours: Record<string, number> }>
  >;
}

type LayerKey = 'actual' | 'ensemble' | 'nb_glm' | 'ci80' | 'dow_mean';
type TimeframeResolution = 'monthly' | 'weekly' | 'daily' | 'yearly';
type QuickPeriodPreset = 'all' | '2026' | '2025' | '2024' | '2023' | 'h1_2026' | 'h2_2026' | 'custom';
type FocusedPanel = 'chart' | 'units' | 'heatmap';

interface ChartDataPoint {
  label: string;
  fullLabel: string;
  periodTag: string;
  is_future: boolean;
  is_yearly?: boolean;
  actual: number | null;
  ensemble: number | null;
  nb_glm: number | null;
  dow_mean: number | null;
  ci80_low: number | null;
  ci80_high: number | null;
  ci80_range?: [number, number] | null;
}

const MONTH_FULL_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const DAY_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const WEEK_OF_MONTH_OPTIONS = [
  { value: 'ALL', label: 'Semua Minggu di Bulan Ini' },
  { value: '1', label: 'Minggu ke-1 (Tgl 1–7)' },
  { value: '2', label: 'Minggu ke-2 (Tgl 8–14)' },
  { value: '3', label: 'Minggu ke-3 (Tgl 15–21)' },
  { value: '4', label: 'Minggu ke-4 (Tgl 22–28)' },
  { value: '5', label: 'Minggu ke-5 (Tgl 29–Akhir)' },
];

const RSIA_GREEN = {
  actual: '#0f5c43', // Hijau hutan pekat RSIA (kontras tinggi untuk data aktual)
  forecast: '#f47a45', // Oranye cerah merek RSIA (prediksi utama HistGB, kontras tajam vs hijau)
  forecastText: '#d95d28', // Oranye gelap kontras tinggi untuk teks angka/label prediksi
  nbGlm: '#5a5fe0', // Periwinkle klinis (prediksi pembanding NB GLM)
  bandFill: '#d5f0e1', // Hijau mint tipis (area rentang wajar CI 80%)
  bandStroke: '#40916c', // Hijau sedang (tepi area & dot penanda rentang wajar)
  normal: '#64748b', // Abu-abu slate netral (baseline rata-rata normal 4 minggu)
  marker: '#0f5c43', // Garis vertikal hijau pekat penanda mulai proyeksi
  grid: '#e6efe9', // Garis bantu grafik hijau sangat pucat
  axis: '#6b7770', // Label sumbu abu-abu netral bernuansa hijau
  penjaminScale: ['#0f5c43', '#1e8455', '#2fa56e', '#4cc38a', '#93d1ae'],
} as const;

const CHART_FONT_STYLE = {
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

const LAYER_CONFIG: Array<{
  key: LayerKey;
  label: string;
  colorVar: string;
  desc: string;
}> = [
  {
    key: 'actual',
    label: 'Kunjungan Aktual (Data RS)',
    colorVar: RSIA_GREEN.actual,
    desc: 'Jumlah pasien nyata yang tercatat di SIMRS',
  },
  {
    key: 'ensemble',
    label: 'Prediksi Kunjungan (HistGB)',
    colorVar: RSIA_GREEN.forecast,
    desc: 'Estimasi kunjungan pasien dari model terbaik (HistGradientBoosting)',
  },
  {
    key: 'nb_glm',
    label: 'Prediksi NB GLM',
    colorVar: RSIA_GREEN.nbGlm,
    desc: 'Estimasi kunjungan pembanding dari model Negative Binomial GLM',
  },
  {
    key: 'ci80',
    label: 'Rentang Wajar (Batas Atas–Bawah)',
    colorVar: RSIA_GREEN.bandStroke,
    desc: 'Kisaran fluktuasi normal harian untuk kesiapan kapasitas',
  },
  {
    key: 'dow_mean',
    label: 'Rata-Rata Normal 4 Minggu',
    colorVar: RSIA_GREEN.normal,
    desc: 'Garis pembanding kebiasaan kunjungan 4 minggu terakhir',
  },
];

function formatNum(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDateID(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTH_SHORT_ID[m - 1]} ${y}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMondayOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

const CustomExecutiveTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  checkedLayers: Record<LayerKey, boolean>;
  resolution: TimeframeResolution;
}> = ({ active, payload, checkedLayers, resolution }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const dec = resolution === 'daily' ? 1 : 0;

  return (
    <div className="font-sans bg-white text-[#18201c] border border-[#ace2c5] rounded-2xl shadow-lg shadow-[#0f5c43]/10 px-3.5 py-2.5 text-xs min-w-56.25 max-w-72.5">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8efe9] pb-1.5 mb-2">
        <span className="font-bold text-[#18201c]">{pt.fullLabel}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            pt.is_future
              ? 'bg-[#fff3ec] text-[#d95d28] border border-[#ffd0b5]'
              : 'bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]'
          }`}
        >
          {pt.periodTag}
        </span>
      </div>

      <div className="space-y-1.5">
        {checkedLayers.actual && pt.actual !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#3c4641]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RSIA_GREEN.actual }}
              />
              {pt.is_yearly && pt.label === '2026' ? 'Aktual (Jan–Jun)' : 'Kunjungan Aktual'}
            </span>
            <span className="font-bold text-[#0f5c43] tabular-nums">
              {formatNum(pt.actual, 0)} pasien
            </span>
          </div>
        )}

        {checkedLayers.ensemble && pt.ensemble !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#3c4641]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RSIA_GREEN.forecast }}
              />
              Prediksi Kunjungan
            </span>
            <span className="font-bold text-[#d95d28] tabular-nums">
              {formatNum(pt.ensemble, dec)} pasien
            </span>
          </div>
        )}

        {checkedLayers.nb_glm && pt.nb_glm !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#3c4641]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RSIA_GREEN.nbGlm }}
              />
              Prediksi NB GLM
            </span>
            <span className="font-bold text-[#5a5fe0] tabular-nums">
              {formatNum(pt.nb_glm, dec)} pasien
            </span>
          </div>
        )}

        {checkedLayers.dow_mean && pt.dow_mean !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#3c4641]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RSIA_GREEN.normal }}
              />
              Rata-Rata 4 Minggu
            </span>
            <span className="font-bold text-[#475569] tabular-nums">
              {formatNum(pt.dow_mean, dec)} pasien
            </span>
          </div>
        )}

        {checkedLayers.ci80 && pt.ci80_low !== null && pt.ci80_high !== null && (
          <div className="mt-1 pt-1.5 border-t border-[#e8efe9] flex items-center justify-between gap-3 text-[11px]">
            <span className="text-[#6b7770]">Rentang Wajar</span>
            <span className="font-semibold text-[#3c4641] tabular-nums">
              {formatNum(pt.ci80_low, 0)} – {formatNum(pt.ci80_high, 0)} pasien
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SmBundleCache {
  scopeKey: string;
  meta: MetaData | null;
  summary: SummaryData | null;
  forecast: ForecastData | null;
  poliLoad: PoliLoadData | null;
  penjamin: PenjaminData | null;
  heatmap: HeatmapData | null;
}

// Cache memori per sesi agar perpindahan antar menu terasa instan tanpa lintas-akun
let smBundleCache: SmBundleCache | null = null;

interface KpiCardsData {
  totalActual: number | null;
  actualDaysCount: number;
  totalPred: number;
  totalDaysCount: number;
  avgDaily: number;
  peakLabel: string;
  peakValue: number;
}

const KpiStripMemo = memo<{ kpiCards: KpiCardsData; selectedPoli: string }>(
  ({ kpiCards, selectedPoli }) => (
    <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      <div className="tvlk-card rounded-2xl px-4 py-3 flex items-start justify-between gap-2.5 transition-all">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7770]">
            Total Kunjungan Aktual
          </p>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#0f5c43] tabular-nums mt-0.5">
            {kpiCards.totalActual !== null ? `${formatNum(kpiCards.totalActual)} pasien` : 'Periode Proyeksi'}
          </p>
          <p className="text-[11px] font-medium text-[#6b7770] truncate mt-0.5">
            {kpiCards.totalActual !== null
              ? `Tercatat ${formatNum(kpiCards.actualDaysCount)} hari di SIMRS`
              : 'Belum ada kunjungan tercatat (Jul–Des 2026)'}
          </p>
        </div>
        <span className="hidden sm:inline-flex w-9 h-9 rounded-2xl bg-[#edf8f2] text-[#0f5c43] items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
      </div>

      <div className="tvlk-card border-[#93d1ae]! bg-linear-to-br from-[#edf8f2] via-[#f7fcfa] to-white rounded-2xl px-4 py-3 flex items-start justify-between gap-2.5 transition-all">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#186b46]">
            Total Prediksi Kunjungan
          </p>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#d95d28] tabular-nums mt-0.5">
            {formatNum(kpiCards.totalPred)} pasien
          </p>
          <p className="text-[11px] font-medium text-[#3c4641] truncate mt-0.5">
            Estimasi total dalam {formatNum(kpiCards.totalDaysCount)} hari terpilih
          </p>
        </div>
        <span className="hidden sm:inline-flex w-9 h-9 rounded-2xl bg-[#f47a45] text-white items-center justify-center shrink-0 shadow-xs shadow-[#f47a45]/25">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </span>
      </div>

      <div className="tvlk-card rounded-2xl px-4 py-3 flex items-start justify-between gap-2.5 transition-all">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7770]">
            Rata-Rata Harian
          </p>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#18201c] tabular-nums mt-0.5">
            {formatNum(kpiCards.avgDaily)}{' '}
            <span className="text-xs font-semibold text-[#515c56]">pasien / hari</span>
          </p>
          <p className="text-[11px] font-medium text-[#6b7770] truncate mt-0.5">
            {selectedPoli === 'TOTAL' ? 'Semua unit rawat jalan RSIA' : selectedPoli}
          </p>
        </div>
        <span className="hidden sm:inline-flex w-9 h-9 rounded-2xl bg-[#edf8f2] text-[#1e8455] items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </span>
      </div>

      <div className="tvlk-card rounded-2xl px-4 py-3 flex items-start justify-between gap-2.5 transition-all">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7770]">
            Puncak Kunjungan Periode Ini
          </p>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#18201c] tabular-nums mt-0.5">
            {formatNum(kpiCards.peakValue)} pasien
          </p>
          <p className="text-[11px] font-medium text-[#6b7770] truncate mt-0.5" title={kpiCards.peakLabel}>
            {kpiCards.peakLabel}
          </p>
        </div>
        <span className="hidden sm:inline-flex w-9 h-9 rounded-2xl bg-[#ffe3d4] text-[#f47a45] items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </span>
      </div>
    </div>
  )
);

const ChartCanvasMemo = memo<{
  chartSeriesData: ChartDataPoint[];
  resolution: TimeframeResolution;
  checkedLayers: Record<LayerKey, boolean>;
  isChartFocused: boolean;
  isDenseDailyRange: boolean;
  projectionStartLabel: string | null;
  onHoverPoint: (pt: ChartDataPoint | null) => void;
}>(({
  chartSeriesData,
  resolution,
  checkedLayers,
  isChartFocused,
  isDenseDailyRange,
  projectionStartLabel,
  onHoverPoint,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let rafId = 0;
    const measureNow = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      if (w > 40 && h > 40) {
        setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      } else {
        setSize((prev) => (prev.width === 0 && prev.height === 0 ? prev : { width: 0, height: 0 }));
      }
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measureNow);
    };

    measureNow();
    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(rafId);
    }

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [resolution, isChartFocused]);

  const readyToDraw = size.width >= 80 && size.height >= 80;

  return (
    <div ref={hostRef} className="w-full h-full min-h-65">
      {!readyToDraw || chartSeriesData.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6b7770]">
          {chartSeriesData.length === 0 ? 'Memuat seri grafik...' : ''}
        </div>
      ) : resolution === 'yearly' ? (
        <ComposedChart
          width={size.width}
          height={size.height}
          data={chartSeriesData}
          accessibilityLayer={false}
          margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = Number(state?.activeTooltipIndex);
            if (Number.isInteger(idx) && idx >= 0 && chartSeriesData[idx]) {
              onHoverPoint(chartSeriesData[idx]);
            }
          }}
          onMouseLeave={() => onHoverPoint(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={RSIA_GREEN.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...CHART_FONT_STYLE, fontSize: 12, fill: RSIA_GREEN.axis, fontWeight: 600 }}
          />
          <YAxis
            width={isChartFocused ? 44 : 32}
            tick={{ ...CHART_FONT_STYLE, fontSize: 11, fill: RSIA_GREEN.axis }}
            tickFormatter={(v) => formatNum(v)}
          />
          <Tooltip
            wrapperStyle={{ pointerEvents: 'none' }}
            content={<CustomExecutiveTooltip checkedLayers={checkedLayers} resolution={resolution} />}
          />
          {isChartFocused && (
            <Legend
              iconSize={12}
              formatter={(value) => (
                <span style={{ ...CHART_FONT_STYLE, color: '#18201c', fontWeight: 600 }}>
                  {value}
                </span>
              )}
              wrapperStyle={{ ...CHART_FONT_STYLE, fontSize: 11, paddingTop: 4 }}
            />
          )}

          {checkedLayers.actual && (
            <Bar
              dataKey="actual"
              name="Kunjungan Aktual (Tercatat RS)"
              fill={RSIA_GREEN.actual}
              radius={[6, 6, 0, 0]}
              barSize={isChartFocused ? 34 : 16}
              isAnimationActive={false}
            />
          )}
          {checkedLayers.ensemble && (
            <Bar
              dataKey="ensemble"
              name="Prediksi Kunjungan (Model)"
              fill={RSIA_GREEN.forecast}
              radius={[6, 6, 0, 0]}
              barSize={isChartFocused ? 34 : 16}
              isAnimationActive={false}
            />
          )}
          {checkedLayers.nb_glm && (
            <Bar
              dataKey="nb_glm"
              name="Prediksi NB GLM"
              fill={RSIA_GREEN.nbGlm}
              radius={[6, 6, 0, 0]}
              barSize={isChartFocused ? 34 : 16}
              isAnimationActive={false}
            />
          )}
          {checkedLayers.dow_mean && (
            <Bar
              dataKey="dow_mean"
              name="Rata-Rata Normal 4 Minggu"
              fill={RSIA_GREEN.normal}
              radius={[6, 6, 0, 0]}
              barSize={isChartFocused ? 34 : 16}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      ) : (
        <ComposedChart
          width={size.width}
          height={size.height}
          data={chartSeriesData}
          accessibilityLayer={false}
          margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = Number(state?.activeTooltipIndex);
            if (Number.isInteger(idx) && idx >= 0 && chartSeriesData[idx]) {
              onHoverPoint(chartSeriesData[idx]);
            }
          }}
          onMouseLeave={() => onHoverPoint(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={RSIA_GREEN.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ ...CHART_FONT_STYLE, fontSize: 11, fill: RSIA_GREEN.axis }}
            minTickGap={24}
          />
          <YAxis
            width={isChartFocused ? 44 : 32}
            tick={{ ...CHART_FONT_STYLE, fontSize: 11, fill: RSIA_GREEN.axis }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => formatNum(v)}
          />
          <Tooltip
            wrapperStyle={{ pointerEvents: 'none' }}
            content={<CustomExecutiveTooltip checkedLayers={checkedLayers} resolution={resolution} />}
          />
          {isChartFocused && (
            <Legend
              iconSize={12}
              formatter={(value) => (
                <span style={{ ...CHART_FONT_STYLE, color: '#18201c', fontWeight: 600 }}>
                  {value}
                </span>
              )}
              wrapperStyle={{ ...CHART_FONT_STYLE, fontSize: 11, paddingTop: 4 }}
            />
          )}

          {projectionStartLabel && (
            <ReferenceLine
              x={projectionStartLabel}
              stroke={RSIA_GREEN.marker}
              strokeDasharray="4 4"
              strokeWidth={1.6}
              label={
                isChartFocused
                  ? {
                      value: 'Mulai Proyeksi',
                      position: 'insideTopRight',
                      fill: RSIA_GREEN.marker,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: CHART_FONT_STYLE.fontFamily,
                    }
                  : undefined
              }
            />
          )}

          {checkedLayers.ci80 && (
            <Area
              type="monotone"
              dataKey="ci80_range"
              name="Rentang Wajar"
              stroke={RSIA_GREEN.bandStroke}
              strokeWidth={0.8}
              strokeDasharray="2 2"
              fill={RSIA_GREEN.bandFill}
              fillOpacity={0.34}
              isAnimationActive={false}
            />
          )}

          {checkedLayers.dow_mean && (
            <Line
              type="monotone"
              dataKey="dow_mean"
              name="Rata-Rata Normal 4 Minggu"
              stroke={RSIA_GREEN.normal}
              strokeWidth={1.8}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          )}

          {checkedLayers.ensemble && (
            <Line
              type="monotone"
              dataKey="ensemble"
              name="Prediksi Kunjungan"
              stroke={RSIA_GREEN.forecast}
              strokeWidth={isDenseDailyRange ? 1.8 : 2.5}
              dot={chartSeriesData.length <= 35 && isChartFocused ? { r: 3 } : false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          )}

          {checkedLayers.nb_glm && (
            <Line
              type="monotone"
              dataKey="nb_glm"
              name="Prediksi NB GLM"
              stroke={RSIA_GREEN.nbGlm}
              strokeWidth={isDenseDailyRange ? 1.6 : 2.0}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          )}

          {checkedLayers.actual && (
            <Line
              type="monotone"
              dataKey="actual"
              name="Kunjungan Aktual (Data RS)"
              stroke={RSIA_GREEN.actual}
              strokeWidth={isDenseDailyRange ? 1.8 : 2.5}
              dot={chartSeriesData.length <= 35 && isChartFocused ? { r: 3.2 } : false}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      )}
    </div>
  );
});

const ChartStagePanelMemo = memo<{
  focusedPanel: FocusedPanel;
  slotClass: string;
  onFocusChart: () => void;
  activeDateLabel: string;
  chartSeriesData: ChartDataPoint[];
  resolution: TimeframeResolution;
  checkedLayers: Record<LayerKey, boolean>;
  isDenseDailyRange: boolean;
  projectionStartLabel: string | null;
  onSwitchToMonthly: () => void;
}>(({
  focusedPanel,
  slotClass,
  onFocusChart,
  activeDateLabel,
  chartSeriesData,
  resolution,
  checkedLayers,
  isDenseDailyRange,
  projectionStartLabel,
  onSwitchToMonthly,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const handleHoverPoint = useCallback((pt: ChartDataPoint | null) => {
    setHoveredPoint((prev) => (prev === pt ? prev : pt));
  }, []);

  const isChartFocused = focusedPanel === 'chart';
  const latestDataPoint = chartSeriesData.length > 0 ? chartSeriesData[chartSeriesData.length - 1] : null;
  const readoutCandidate =
    hoveredPoint && chartSeriesData.includes(hoveredPoint) ? hoveredPoint : latestDataPoint;

  return (
    <section
      data-active={isChartFocused}
      className={`${
        isChartFocused ? 'flex' : 'hidden lg:flex'
      } ${slotClass} w-full h-112.5 sm:h-120 lg:h-full lg:min-h-0 lg:shrink lg:basis-0 min-w-0 tvlk-stage-panel rounded-2xl flex-col overflow-hidden`}
    >
      {/* Header Informasi Kursor Aktif + Tombol Fokus Grafik (Fixed 1 baris di desktop agar anti-flicker saat hover) */}
      <div
        data-testid="live-crosshair-bar"
        onClick={() => {
          if (!isChartFocused) onFocusChart();
        }}
        className={`shrink-0 px-3.5 py-2 lg:h-10 bg-[#f6f8f7] border-b border-[#e1e6e3] flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 text-xs ${
          !isChartFocused ? 'cursor-pointer hover:bg-[#edf8f2] transition-colors' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-[#18201c] truncate">
            {isChartFocused
              ? readoutCandidate
                ? readoutCandidate.fullLabel
                : activeDateLabel
              : 'Grafik Tren Kunjungan'}
          </span>
          {isChartFocused && readoutCandidate && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${
                readoutCandidate.is_future
                  ? 'bg-[#fff3ec] text-[#d95d28] border border-[#ffd0b5]'
                  : 'bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]'
              }`}
            >
              {readoutCandidate.periodTag}
            </span>
          )}
          {!isChartFocused && (
            <span className="hidden lg:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0f5c43] text-white shrink-0">
              Perbesar ⤢
            </span>
          )}
        </div>

        {isChartFocused && (
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-1 tabular-nums shrink-0 whitespace-nowrap">
            {checkedLayers.actual && (
              <span className="flex items-center gap-1.5 text-[#3c4641]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RSIA_GREEN.actual }}
                />
                Aktual:{' '}
                <strong className="font-bold text-[#0f5c43] tabular-nums">
                  {readoutCandidate && readoutCandidate.actual !== null
                    ? formatNum(readoutCandidate.actual, 0)
                    : '-'}
                </strong>
              </span>
            )}
            {checkedLayers.ensemble && (
              <span className="flex items-center gap-1.5 text-[#3c4641]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RSIA_GREEN.forecast }}
                />
                Prediksi:{' '}
                <strong className="font-bold text-[#d95d28] tabular-nums">
                  {readoutCandidate && readoutCandidate.ensemble !== null
                    ? formatNum(readoutCandidate.ensemble, resolution === 'daily' ? 1 : 0)
                    : '-'}
                </strong>
              </span>
            )}
            {checkedLayers.ci80 &&
              readoutCandidate?.ci80_low !== null &&
              readoutCandidate?.ci80_high !== null &&
              readoutCandidate !== null && (
                <span className="hidden sm:inline text-[#6b7770]">
                  Rentang Wajar:{' '}
                  <strong className="font-bold text-[#3c4641] tabular-nums">
                    {formatNum(readoutCandidate.ci80_low, 0)}–{formatNum(readoutCandidate.ci80_high, 0)}
                  </strong>
                </span>
              )}
          </div>
        )}
      </div>

      {isChartFocused && isDenseDailyRange && (
        <div className="shrink-0 px-3.5 py-1.5 bg-[#edf8f2] text-[#145639] border-b border-[#bce4ce] text-[11px] font-medium flex flex-wrap items-center justify-between gap-2">
          <span>
            Rentang waktu lebih dari 4 bulan: tampilan <strong>Bulanan</strong> atau <strong>Mingguan</strong> lebih mudah dibaca tanpa gelombang rapat.
          </span>
          <button
            type="button"
            onClick={onSwitchToMonthly}
            className="px-2.5 py-0.5 rounded-lg bg-white border border-[#93d1ae] text-[#0f5c43] hover:bg-[#d5f0e1]/60 font-bold transition"
          >
            Ubah ke Bulanan
          </button>
        </div>
      )}

      {/* Area Grafik Terukur Langsung via ResizeObserver (Bebas Warning 0x0 & Smooth Line Draw) */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden touch-pan-x lg:overflow-hidden tvlk-scroll bg-white">
        <div
          className={`h-77.5 sm:h-full lg:h-full ${
            resolution === 'yearly' ? 'w-full' : 'w-170 sm:w-full'
          } lg:w-full p-2.5 sm:p-3 bg-white`}
        >
          <ChartCanvasMemo
            chartSeriesData={chartSeriesData}
            resolution={resolution}
            checkedLayers={checkedLayers}
            isChartFocused={isChartFocused}
            isDenseDailyRange={isDenseDailyRange}
            projectionStartLabel={projectionStartLabel}
            onHoverPoint={handleHoverPoint}
          />
        </div>
      </div>

      <div className="shrink-0 px-3.5 py-1.5 bg-[#f6f8f7] border-t border-[#e1e6e3] flex items-center justify-between gap-2 text-[11px] text-[#6b7770]">
        <span className="truncate font-medium">
          {isChartFocused
            ? 'Data Aktual SIMRS: Jan 2023 – Jun 2026 • Proyeksi Model Aktif: Jan 2023 – 31 Des 2026'
            : 'Klik header panel di atas untuk memperbesar grafik kembali'}
        </span>
        {isChartFocused && (
          <span className="hidden sm:inline shrink-0 font-medium">
            Geser / arahkan kursor ke grafik untuk melihat rincian
          </span>
        )}
      </div>
    </section>
  );
});

const AnalisiKunjungan: React.FC = () => {
  const userRole = getAuthRole() || 'STAF';
  const userDivisiNama = getAuthDivisiNama('');
  const isKadiv = userRole === 'KADIV';
  const currentScopeKey = `${userRole}|${userDivisiNama}`;
  const validScopedCache = smBundleCache?.scopeKey === currentScopeKey ? smBundleCache : null;

  // State data API (/api/sm/*) dengan initial value dari cache sesi jika scope cocok
  const [meta, setMeta] = useState<MetaData | null>(() => validScopedCache?.meta || null);
  const [summary, setSummary] = useState<SummaryData | null>(() => validScopedCache?.summary || null);
  const [forecast, setForecast] = useState<ForecastData | null>(() => validScopedCache?.forecast || null);
  const [poliLoad, setPoliLoad] = useState<PoliLoadData | null>(() => validScopedCache?.poliLoad || null);
  const [penjamin, setPenjamin] = useState<PenjaminData | null>(() => validScopedCache?.penjamin || null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(() => validScopedCache?.heatmap || null);

  const [loading, setLoading] = useState<boolean>(() => !validScopedCache);
  const [error, setError] = useState<string>('');
  const [reloadToken, setReloadToken] = useState<number>(0);

  // State Kontrol Utama
  const [selectedPoli, setSelectedPoli] = useState<string>(() => {
    if (isKadiv) {
      const accessible = Object.keys(validScopedCache?.summary?.by_poliklinik || {});
      return accessible[0] || '';
    }
    return 'TOTAL';
  });
  const [resolution, setResolution] = useState<TimeframeResolution>('monthly');

  // Filter Periode & Tanggal Fleksibel
  const [quickPreset, setQuickPreset] = useState<QuickPeriodPreset>('all');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedWeekOfMonth, setSelectedWeekOfMonth] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('2023-01-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-12-31');

  // Checklist Garis Grafik
  const [checkedLayers, setCheckedLayers] = useState<Record<LayerKey, boolean>>({
    actual: true,
    ensemble: true,
    nb_glm: true,
    ci80: true,
    dow_mean: false,
  });

  // UI Interactive States
  const [openPopover, setOpenPopover] = useState<'period' | 'layers' | 'guide' | null>(null);
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>('chart');
  const [showAllHours, setShowAllHours] = useState<boolean>(true);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (validScopedCache && reloadToken === 0) return;

    let cancelled = false;
    const loadAnalyticsBundle = async () => {
      try {
        const forecastPromise = api.get('/sm/forecast_vs_actual');
        const [resMeta, resSummary, resPoliLoad, resPenjamin, resHeatmap] =
          await Promise.all([
            api.get('/sm/meta'),
            api.get('/sm/summary'),
            api.get('/sm/poli_load'),
            api.get('/sm/penjamin_composition'),
            api.get('/sm/heatmap_weekday_hour'),
          ]);

        if (cancelled) return;

        const nextMeta = resMeta.data?.data || null;
        const nextSummary = resSummary.data?.data || null;
        const nextPoliLoad = resPoliLoad.data?.data || null;
        const nextPenjamin = resPenjamin.data?.data || null;
        const nextHeatmap = resHeatmap.data?.data || null;

        setMeta(nextMeta);
        setSummary(nextSummary);
        setPoliLoad(nextPoliLoad);
        setPenjamin(nextPenjamin);
        setHeatmap(nextHeatmap);

        const accessiblePolis = Object.keys(nextSummary?.by_poliklinik || {});
        if (isKadiv) {
          setSelectedPoli((prev) =>
            prev && accessiblePolis.includes(prev) ? prev : accessiblePolis[0] || ''
          );
        } else {
          setSelectedPoli((prev) =>
            prev && (prev === 'TOTAL' || accessiblePolis.includes(prev)) ? prev : 'TOTAL'
          );
        }
        setError('');
        setLoading(false);

        const resForecast = await forecastPromise;
        if (cancelled) return;
        const nextForecast = resForecast.data?.data || null;
        setForecast(nextForecast);

        smBundleCache = {
          scopeKey: currentScopeKey,
          meta: nextMeta,
          summary: nextSummary,
          forecast: nextForecast,
          poliLoad: nextPoliLoad,
          penjamin: nextPenjamin,
          heatmap: nextHeatmap,
        };
      } catch (err: unknown) {
        if (cancelled) return;
        const apiErr = err as { response?: { data?: { message?: string } } };
        setError(
          apiErr.response?.data?.message ||
            'Gagal memuat data analitik kunjungan dari server.'
        );
        setLoading(false);
      }
    };

    void loadAnalyticsBundle();
    return () => {
      cancelled = true;
    };
  }, [isKadiv, reloadToken, validScopedCache, currentScopeKey]);

  // Tutup popover saat klik luar atau tekan Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const kadivPoliklinikList = useMemo(
    () => Object.keys(summary?.by_poliklinik || {}),
    [summary]
  );

  // Deret harian penuh (2023-01-01 s.d. 2026-12-31 = 1.461 hari) sesuai unit terpilih
  const fullUnitDailyPoints = useMemo<ForecastPoint[]>(() => {
    if (!forecast) return [];
    if (selectedPoli === 'TOTAL' && forecast.total_rs) {
      return forecast.total_rs;
    }
    return forecast.by_poliklinik?.[selectedPoli] || [];
  }, [forecast, selectedPoli]);

  // Rentang tanggal aktif [startIso, endIso] berdasarkan filter Tahun/Bulan/Minggu ke-N atau Rentang Tanggal Bebas
  const activeDateBounds = useMemo<{ start: string; end: string; label: string }>(() => {
    if (quickPreset === 'custom') {
      const s = customStartDate || '2023-01-01';
      const e = customEndDate || '2026-12-31';
      const [minIso, maxIso] = s <= e ? [s, e] : [e, s];
      return {
        start: minIso,
        end: maxIso,
        label: `${formatDateID(minIso)} – ${formatDateID(maxIso)}`,
      };
    }
    if (quickPreset === 'h1_2026') {
      return { start: '2026-01-01', end: '2026-06-30', label: 'Jan–Jun 2026' };
    }
    if (quickPreset === 'h2_2026') {
      return { start: '2026-07-01', end: '2026-12-31', label: 'Proyeksi Jul–Des 2026' };
    }

    if (selectedYear === 'ALL') {
      return {
        start: '2023-01-01',
        end: '2026-12-31',
        label: 'Semua Tahun (2023–2026)',
      };
    }

    const yrNum = Number(selectedYear);
    if (selectedMonth === 'ALL') {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-31`,
        label: `Tahun ${selectedYear} (Jan–Des)`,
      };
    }

    const mNum = Number(selectedMonth);
    const mPad = String(mNum).padStart(2, '0');
    const maxDay = getDaysInMonth(yrNum, mNum);
    const monthName = MONTH_FULL_ID[mNum - 1];

    if (selectedWeekOfMonth === 'ALL') {
      return {
        start: `${selectedYear}-${mPad}-01`,
        end: `${selectedYear}-${mPad}-${String(maxDay).padStart(2, '0')}`,
        label: `${monthName} ${selectedYear}`,
      };
    }

    const wkNum = Number(selectedWeekOfMonth);
    const dStart = (wkNum - 1) * 7 + 1;
    const dEnd = wkNum === 5 ? maxDay : Math.min(wkNum * 7, maxDay);
    if (dStart > maxDay) {
      return {
        start: `${selectedYear}-${mPad}-22`,
        end: `${selectedYear}-${mPad}-${String(maxDay).padStart(2, '0')}`,
        label: `Minggu ke-4, ${monthName} ${selectedYear}`,
      };
    }

    return {
      start: `${selectedYear}-${mPad}-${String(dStart).padStart(2, '0')}`,
      end: `${selectedYear}-${mPad}-${String(dEnd).padStart(2, '0')}`,
      label: `Minggu ke-${wkNum}, ${monthName} ${selectedYear} (${dStart}–${dEnd})`,
    };
  }, [quickPreset, customStartDate, customEndDate, selectedYear, selectedMonth, selectedWeekOfMonth]);

  // Data harian hasil filter tanggal aktif
  const filteredDailyPoints = useMemo<ForecastPoint[]>(() => {
    const { start, end } = activeDateBounds;
    return fullUnitDailyPoints.filter((pt) => pt.date >= start && pt.date <= end);
  }, [fullUnitDailyPoints, activeDateBounds]);

  const handleFocusPanel = useCallback((next: FocusedPanel) => {
    setFocusedPanel(next);
  }, []);

  const handleSwitchToMonthly = useCallback(() => {
    setResolution('monthly');
  }, []);

  // Handlers pemilih waktu yang sinkron & otomatis mencegah gelombang semrawut
  const handleSelectQuickPreset = (preset: 'all' | '2026' | '2025' | '2024' | '2023' | 'h1_2026' | 'h2_2026') => {
    setOpenPopover(null);
    setQuickPreset(preset);

    if (preset === 'all') {
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
      setSelectedWeekOfMonth('ALL');
      setCustomStartDate('2023-01-01');
      setCustomEndDate('2026-12-31');
      if (resolution === 'daily') setResolution('monthly');
    } else if (preset === 'h1_2026' || preset === 'h2_2026') {
      setSelectedYear('2026');
      setSelectedMonth('ALL');
      setSelectedWeekOfMonth('ALL');
      setCustomStartDate(preset === 'h1_2026' ? '2026-01-01' : '2026-07-01');
      setCustomEndDate(preset === 'h1_2026' ? '2026-06-30' : '2026-12-31');
      if (resolution === 'daily' || resolution === 'yearly') setResolution('monthly');
    } else {
      setSelectedYear(preset);
      setSelectedMonth('ALL');
      setSelectedWeekOfMonth('ALL');
      setCustomStartDate(`${preset}-01-01`);
      setCustomEndDate(`${preset}-12-31`);
      if (resolution === 'daily' || resolution === 'yearly') setResolution('monthly');
    }
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    setQuickPreset(val === 'ALL' ? 'all' : (val as QuickPeriodPreset));
    if (val === 'ALL') {
      setSelectedMonth('ALL');
      setSelectedWeekOfMonth('ALL');
      setCustomStartDate('2023-01-01');
      setCustomEndDate('2026-12-31');
      if (resolution === 'daily') setResolution('monthly');
    } else {
      if (selectedMonth === 'ALL') {
        setCustomStartDate(`${val}-01-01`);
        setCustomEndDate(`${val}-12-31`);
        if (resolution === 'daily' || resolution === 'yearly') setResolution('monthly');
      } else {
        const mNum = Number(selectedMonth);
        const mPad = String(mNum).padStart(2, '0');
        const maxD = getDaysInMonth(Number(val), mNum);
        setCustomStartDate(`${val}-${mPad}-01`);
        setCustomEndDate(`${val}-${mPad}-${String(maxD).padStart(2, '0')}`);
        setResolution('daily');
      }
    }
  };

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    setSelectedWeekOfMonth('ALL');
    const targetYear = selectedYear === 'ALL' ? '2026' : selectedYear;
    if (selectedYear === 'ALL') setSelectedYear('2026');
    setQuickPreset(targetYear as QuickPeriodPreset);

    if (val === 'ALL') {
      setCustomStartDate(`${targetYear}-01-01`);
      setCustomEndDate(`${targetYear}-12-31`);
      if (resolution === 'daily' || resolution === 'yearly') setResolution('monthly');
    } else {
      const mNum = Number(val);
      const mPad = String(mNum).padStart(2, '0');
      const maxD = getDaysInMonth(Number(targetYear), mNum);
      setCustomStartDate(`${targetYear}-${mPad}-01`);
      setCustomEndDate(`${targetYear}-${mPad}-${String(maxD).padStart(2, '0')}`);
      setResolution('daily');
    }
  };

  const handleWeekOfMonthChange = (val: string) => {
    setSelectedWeekOfMonth(val);
    if (val !== 'ALL' && selectedYear !== 'ALL' && selectedMonth !== 'ALL') {
      const yrNum = Number(selectedYear);
      const mNum = Number(selectedMonth);
      const mPad = String(mNum).padStart(2, '0');
      const maxD = getDaysInMonth(yrNum, mNum);
      const wkNum = Number(val);
      const dStart = Math.min((wkNum - 1) * 7 + 1, maxD);
      const dEnd = wkNum === 5 ? maxD : Math.min(wkNum * 7, maxD);
      setCustomStartDate(`${selectedYear}-${mPad}-${String(dStart).padStart(2, '0')}`);
      setCustomEndDate(`${selectedYear}-${mPad}-${String(dEnd).padStart(2, '0')}`);
      setResolution('daily');
    }
  };

  const handleApplyCustomRange = () => {
    setOpenPopover(null);
    setQuickPreset('custom');
    const [s, e] =
      customStartDate <= customEndDate
        ? [customStartDate, customEndDate]
        : [customEndDate, customStartDate];
    const diffDays =
      Math.round((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays <= 45) {
      setResolution('daily');
    } else if (diffDays <= 180) {
      setResolution('weekly');
    } else {
      setResolution('monthly');
    }
  };

  // Transformasi seri grafik berdasarkan resolusi waktu (`monthly`, `weekly`, `daily`, `yearly`)
  const chartSeriesData = useMemo<ChartDataPoint[]>(() => {
    if (resolution === 'yearly') {
      const yearBuckets = new Map<string, ForecastPoint[]>();
      for (const pt of fullUnitDailyPoints) {
        const yr = pt.date.slice(0, 4);
        if (!yearBuckets.has(yr)) yearBuckets.set(yr, []);
        yearBuckets.get(yr)!.push(pt);
      }

      return Array.from(yearBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([yr, items]) => {
          const actItems = items.filter((i) => i.actual !== null);
          const actSum =
            actItems.length > 0 ? actItems.reduce((acc, i) => acc + (i.actual || 0), 0) : null;
          const ensSum = Math.round(items.reduce((acc, i) => acc + (i.pred_best ?? i.pred_ensemble ?? 0), 0));
          const nbGlmSum = Math.round(items.reduce((acc, i) => acc + (i.pred_nb_glm ?? i.pred_best ?? i.pred_ensemble ?? 0), 0));
          const dowSum = Math.round(items.reduce((acc, i) => acc + (i.pred_dow_mean ?? i.pred_best ?? i.pred_ensemble ?? 0), 0));
          const lowSum = Math.round(items.reduce((acc, i) => acc + i.ci80_low, 0));
          const highSum = Math.round(items.reduce((acc, i) => acc + i.ci80_high, 0));

          const hasFuture = items.some((i) => i.is_future);
          return {
            label: yr,
            fullLabel: yr === '2026' ? 'Tahun 2026 (Aktual Jan–Jun & Proyeksi Jul–Des)' : `Tahun ${yr}`,
            periodTag: hasFuture ? 'AKTUAL + PROYEKSI' : 'DATA HISTORIS',
            is_future: hasFuture,
            is_yearly: true,
            actual: actSum,
            ensemble: ensSum,
            nb_glm: nbGlmSum,
            dow_mean: dowSum,
            ci80_low: lowSum,
            ci80_high: highSum,
            ci80_range: [lowSum, highSum],
          };
        });
    }

    if (filteredDailyPoints.length === 0) return [];

    if (resolution === 'daily') {
      return filteredDailyPoints.map((pt) => {
        const [yStr, mStr, dStr] = pt.date.split('-');
        const dtObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
        const dayShort = DAY_SHORT_ID[dtObj.getDay()];
        const mShort = MONTH_SHORT_ID[Number(mStr) - 1];
        const shortLbl =
          filteredDailyPoints.length <= 35
            ? `${dayShort}, ${Number(dStr)} ${mShort}`
            : `${Number(dStr)} ${mShort} '${yStr.slice(2)}`;

        return {
          label: shortLbl,
          fullLabel: `${dayShort}, ${Number(dStr)} ${MONTH_FULL_ID[Number(mStr) - 1]} ${yStr}`,
          periodTag: pt.is_future ? 'PROYEKSI' : 'AKTUAL RS',
          is_future: Boolean(pt.is_future),
          actual: pt.actual,
          ensemble: pt.pred_best ?? pt.pred_ensemble ?? 0,
          nb_glm: pt.pred_nb_glm ?? pt.pred_best ?? pt.pred_ensemble ?? 0,
          dow_mean: pt.pred_dow_mean ?? pt.pred_best ?? pt.pred_ensemble ?? 0,
          ci80_low: pt.ci80_low,
          ci80_high: pt.ci80_high,
          ci80_range: [pt.ci80_low, pt.ci80_high],
        };
      });
    }

    if (resolution === 'weekly') {
      const weekBuckets = new Map<string, { label: string; fullLabel: string; items: ForecastPoint[] }>();
      const singleMonthView = selectedYear !== 'ALL' && selectedMonth !== 'ALL' && quickPreset !== 'custom';

      for (const pt of filteredDailyPoints) {
        if (singleMonthView) {
          const dayNum = Number(pt.date.slice(8, 10));
          const mNum = Number(pt.date.slice(5, 7));
          const wk = Math.min(5, Math.floor((dayNum - 1) / 7) + 1);
          const key = `${pt.date.slice(0, 7)}-W${wk}`;
          if (!weekBuckets.has(key)) {
            weekBuckets.set(key, {
              label: `Minggu ${wk}`,
              fullLabel: `Minggu ke-${wk} • ${MONTH_FULL_ID[mNum - 1]} ${pt.date.slice(0, 4)}`,
              items: [],
            });
          }
          weekBuckets.get(key)!.items.push(pt);
        } else {
          const monIso = getMondayOfWeek(pt.date);
          if (!weekBuckets.has(monIso)) {
            const [, mStr, dStr] = monIso.split('-');
            weekBuckets.set(monIso, {
              label: `${Number(dStr)} ${MONTH_SHORT_ID[Number(mStr) - 1]} '${monIso.slice(2, 4)}`,
              fullLabel: `Pekan mulai ${formatDateID(monIso)}`,
              items: [],
            });
          }
          weekBuckets.get(monIso)!.items.push(pt);
        }
      }

      return Array.from(weekBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, grp]) => {
          const items = grp.items;
          const actItems = items.filter((i) => i.actual !== null);
          const hasFuture = items.some((i) => i.is_future);
          const lowSum = Math.round(items.reduce((acc, i) => acc + i.ci80_low, 0));
          const highSum = Math.round(items.reduce((acc, i) => acc + i.ci80_high, 0));
          const firstDate = items[0]?.date;
          const lastDate = items[items.length - 1]?.date;

          return {
            label: grp.label,
            fullLabel:
              firstDate && lastDate
                ? `${grp.fullLabel} (${formatDateID(firstDate)} – ${formatDateID(lastDate)})`
                : grp.fullLabel,
            periodTag: hasFuture ? 'PROYEKSI' : 'AKTUAL RS',
            is_future: hasFuture,
            actual:
              actItems.length === items.length && actItems.length > 0
                ? actItems.reduce((acc, i) => acc + (i.actual || 0), 0)
                : actItems.length > 0
                ? actItems.reduce((acc, i) => acc + (i.actual || 0), 0)
                : null,
            ensemble: Math.round(items.reduce((acc, i) => acc + (i.pred_best ?? i.pred_ensemble ?? 0), 0)),
            nb_glm: Math.round(items.reduce((acc, i) => acc + (i.pred_nb_glm ?? i.pred_best ?? i.pred_ensemble ?? 0), 0)),
            dow_mean: Math.round(items.reduce((acc, i) => acc + (i.pred_dow_mean ?? i.pred_best ?? i.pred_ensemble ?? 0), 0)),
            ci80_low: lowSum,
            ci80_high: highSum,
            ci80_range: [lowSum, highSum],
          };
        });
    }

    // Default: 'monthly' (Bulanan)
    const monthBuckets = new Map<string, ForecastPoint[]>();
    for (const pt of filteredDailyPoints) {
      const ym = pt.date.slice(0, 7);
      if (!monthBuckets.has(ym)) monthBuckets.set(ym, []);
      monthBuckets.get(ym)!.push(pt);
    }

    return Array.from(monthBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, items]) => {
        const [yStr, mStr] = ym.split('-');
        const mIdx = Number(mStr) - 1;
        const actItems = items.filter((i) => i.actual !== null);
        const hasFuture = items.some((i) => i.is_future);
        const lowSum = Math.round(items.reduce((acc, i) => acc + i.ci80_low, 0));
        const highSum = Math.round(items.reduce((acc, i) => acc + i.ci80_high, 0));

        return {
          label: `${MONTH_SHORT_ID[mIdx]} '${yStr.slice(2)}`,
          fullLabel: `${MONTH_FULL_ID[mIdx]} ${yStr}`,
          periodTag: hasFuture ? 'PROYEKSI' : 'AKTUAL RS',
          is_future: hasFuture,
          actual: actItems.length > 0 ? actItems.reduce((acc, i) => acc + (i.actual || 0), 0) : null,
          ensemble: Math.round(items.reduce((acc, i) => acc + (i.pred_best ?? i.pred_ensemble ?? 0), 0)),
          nb_glm: Math.round(items.reduce((acc, i) => acc + (i.pred_nb_glm ?? i.pred_best ?? i.pred_ensemble ?? 0), 0)),
          dow_mean: Math.round(items.reduce((acc, i) => acc + (i.pred_dow_mean ?? i.pred_best ?? i.pred_ensemble ?? 0), 0)),
          ci80_low: lowSum,
          ci80_high: highSum,
          ci80_range: [lowSum, highSum],
        };
      });
  }, [resolution, filteredDailyPoints, fullUnitDailyPoints, selectedYear, selectedMonth, quickPreset]);

  // Titik referensi batas proyeksi masa depan (Jul 2026 ke atas)
  const projectionStartLabel = useMemo(() => {
    if (resolution === 'yearly') return null;
    const firstFut = chartSeriesData.find((p) => p.is_future);
    return firstFut ? firstFut.label : null;
  }, [chartSeriesData, resolution]);

  // 4 Kartu Ringkasan Eksekutif (Dinamis mengikuti Unit & Periode Terpilih)
  const kpiCards = useMemo(() => {
    const pts = filteredDailyPoints;
    const actPts = pts.filter((p) => p.actual !== null);
    const totalActual =
      actPts.length > 0 ? actPts.reduce((acc, p) => acc + (p.actual || 0), 0) : null;
    const totalPred = Math.round(pts.reduce((acc, p) => acc + (p.pred_best ?? p.pred_ensemble ?? 0), 0));

    const avgDaily =
      actPts.length > 0
        ? Math.round((totalActual || 0) / actPts.length)
        : pts.length > 0
        ? Math.round(totalPred / pts.length)
        : 0;

    let peakLabel = '-';
    let peakValue = 0;
    for (const pt of chartSeriesData) {
      const v = pt.actual !== null ? pt.actual : pt.ensemble || 0;
      if (v >= peakValue) {
        peakValue = Math.round(v);
        peakLabel = pt.fullLabel;
      }
    }

    return {
      totalActual,
      actualDaysCount: actPts.length,
      totalPred,
      totalDaysCount: pts.length,
      avgDaily,
      peakLabel,
      peakValue,
    };
  }, [filteredDailyPoints, chartSeriesData]);

  // Peringatan halus jika memilih mode Harian di rentang > 120 hari
  const isDenseDailyRange = resolution === 'daily' && filteredDailyPoints.length > 120;

  // Data Heatmap & Penjamin untuk Dock Kanan
  const currentHeatmapData = useMemo(() => {
    if (!heatmap) return [];
    if (selectedPoli === 'TOTAL' && heatmap.total_rs) return heatmap.total_rs;
    return heatmap.by_poliklinik?.[selectedPoli] || [];
  }, [heatmap, selectedPoli]);

  const displayedHours = useMemo(
    () => (showAllHours ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 15 }, (_, i) => i + 7)),
    [showAllHours]
  );

  const heatmapMaxVal = useMemo(() => {
    let maxV = 1;
    for (const r of currentHeatmapData) {
      for (const h of displayedHours) {
        const val = r.hours[String(h)] || 0;
        if (val > maxV) maxV = val;
      }
    }
    return maxV;
  }, [currentHeatmapData, displayedHours]);

  const peakHourStats = useMemo(() => {
    const hourTotals = Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0 }));
    let busiestSlot = { day: '-', hour: 0, count: 0 };

    for (const row of currentHeatmapData) {
      for (let h = 0; h < 24; h++) {
        const v = row.hours[String(h)] || 0;
        hourTotals[h].total += v;
        if (v > busiestSlot.count) {
          busiestSlot = { day: row.day_name, hour: h, count: v };
        }
      }
    }

    const sortedHours = [...hourTotals].sort((a, b) => b.total - a.total);
    const maxHourTotal = Math.max(1, sortedHours[0]?.total || 1);
    return {
      busiestSlot,
      topHours: sortedHours.slice(0, 5),
      maxHourTotal,
    };
  }, [currentHeatmapData]);

  const currentPenjaminList = useMemo(() => {
    if (!penjamin) return [];
    if (selectedPoli === 'TOTAL' && penjamin.total_rs) return penjamin.total_rs;
    return penjamin.by_poliklinik?.[selectedPoli] || [];
  }, [penjamin, selectedPoli]);

  const toggleLayer = (key: LayerKey) => {
    setCheckedLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeLayerCount = Object.values(checkedLayers).filter(Boolean).length;

  const getHeatmapCellClass = (val: number, maxVal: number) => {
    if (val === 0) return 'bg-[#f6f8f7] text-[#98a39d]';
    const ratio = val / maxVal;
    if (ratio < 0.25) return 'bg-[#edf8f2] text-[#145639]';
    if (ratio < 0.5) return 'bg-[#ace2c5] text-[#0f3d2b] font-medium';
    if (ratio < 0.75) return 'bg-[#2fa56e] text-white font-semibold';
    return 'bg-[#0f5c43] text-white font-bold';
  };

  if (loading) {
    return (
      <div className="flex-1 h-full w-full flex flex-col gap-2.5 p-2.5 sm:p-3 bg-[#f4f7f5] font-sans">
        <div className="shrink-0 bg-white border border-[#dce7e0] rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-44 rounded-xl bg-[#edf8f2]" />
            <div className="h-8 w-36 rounded-xl bg-[#edf8f2]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-56 rounded-xl bg-[#eef1ef]" />
            <div className="h-8 w-44 rounded-xl bg-[#eef1ef]" />
          </div>
        </div>
        <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-[#dce7e0] rounded-2xl px-4 py-3 space-y-2 shadow-xs"
            >
              <div className="h-3 w-28 rounded bg-[#eef1ef]" />
              <div className="h-6 w-32 rounded bg-[#d5f0e1]" />
              <div className="h-2.5 w-36 rounded bg-[#f6f8f7]" />
            </div>
          ))}
        </div>
        <div className="flex-1 min-h-85 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-7 bg-white border border-[#dce7e0] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="h-4 w-52 rounded bg-[#edf8f2]" />
            <div className="flex-1 my-4 rounded-xl bg-[#f6f8f7] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#6b7770]">
                Menyiapkan analitik kunjungan RSIA...
              </span>
            </div>
            <div className="h-3 w-64 rounded bg-[#eef1ef]" />
          </div>
          <div className="hidden lg:block lg:col-span-3 bg-white border border-[#dce7e0] rounded-2xl p-3 space-y-2.5 shadow-xs">
            <div className="h-4 w-28 rounded bg-[#edf8f2]" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-[#f6f8f7]" />
            ))}
          </div>
          <div className="hidden lg:block lg:col-span-2 bg-white border border-[#dce7e0] rounded-2xl p-3 space-y-2.5 shadow-xs">
            <div className="h-4 w-24 rounded bg-[#edf8f2]" />
            <div className="h-20 rounded-xl bg-[#edf8f2]" />
            <div className="h-32 rounded-xl bg-[#f6f8f7]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#f4f7f5] font-sans p-4">
        <div className="max-w-md w-full bg-white border border-[#dce7e0] rounded-3xl p-6 text-center space-y-3 shadow-sm">
          <h2 className="text-base font-extrabold text-[#18201c]">Data Belum Dapat Dimuat</h2>
          <p className="text-xs text-[#515c56] leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => {
              smBundleCache = null;
              setLoading(true);
              setError('');
              setReloadToken((n) => n + 1);
            }}
            className="px-4 py-2 bg-[#0f5c43] hover:bg-[#0b4a36] text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Muat Ulang Data
          </button>
        </div>
      </div>
    );
  }

  if (isKadiv && kadivPoliklinikList.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#f4f7f5] font-sans p-4">
        <div className="max-w-md w-full bg-white border border-[#dce7e0] rounded-3xl p-6 text-center space-y-2 shadow-sm">
          <h2 className="text-base font-extrabold text-[#18201c]">Tidak Ada Unit Poliklinik</h2>
          <p className="text-xs text-[#515c56] leading-relaxed">
            Divisi Anda ({userDivisiNama || 'Non-Klinis'}) tidak membawahi poliklinik rawat jalan secara langsung.
          </p>
        </div>
      </div>
    );
  }

  const renderUnitsBlock = (isExpanded = false) => (
    <div
      className={
        isExpanded
          ? 'grid grid-cols-1 xl:grid-cols-2 gap-3'
          : 'space-y-3'
      }
    >
      <div className="tvlk-card rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#18201c]">Kunjungan per Poliklinik</p>
            {isExpanded && (
              <p className="text-[11px] text-[#6b7770]">
                Klik salah satu poliklinik untuk memfilter grafik & pola jam sibuk
              </p>
            )}
          </div>
          {!isKadiv && selectedPoli !== 'TOTAL' ? (
            <button
              type="button"
              onClick={() => setSelectedPoli('TOTAL')}
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0f5c43] text-white hover:bg-[#0b4a36] shrink-0 transition"
            >
              Semua Unit ✕
            </button>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#edf8f2] text-[#1e8455] shrink-0">
              Pilih unit
            </span>
          )}
        </div>

        <div className={isExpanded ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-1.5'}>
          {(poliLoad?.poliklinik_loads || [])
            .filter((u) => !isKadiv || kadivPoliklinikList.includes(u.poliklinik))
            .map((u) => {
              const isActive = selectedPoli === u.poliklinik;
              return (
                <button
                  key={u.poliklinik}
                  type="button"
                  onClick={() => setSelectedPoli(u.poliklinik)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#edf8f2] border-[#1e8455]/60 shadow-xs ring-1 ring-[#1e8455]/20'
                      : 'bg-[#f6f8f7] border-[#e1e6e3] hover:bg-[#edf8f2]/70 hover:border-[#ace2c5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-bold truncate ${isActive ? 'text-[#0f5c43]' : 'text-[#18201c]'}`}>
                      {u.poliklinik}
                    </span>
                    <span className="font-extrabold text-[#18201c] tabular-nums shrink-0">
                      {formatNum(u.total_visits)}
                    </span>
                  </div>
                  <div className="mt-1.5 w-full bg-[#e3f2ea] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(4, u.share_pct))}%`,
                        backgroundColor: isActive ? RSIA_GREEN.actual : '#4cc38a',
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#6b7770]">
                    <span>Puncak {u.daily_max} / hari</span>
                    <span className="font-semibold tabular-nums">{u.share_pct}% porsi</span>
                  </div>
                  {isExpanded && (
                    <div className="mt-1 text-[10px] text-[#1e8455] font-semibold">
                      Rata-rata {formatNum(u.daily_mean, 1)} pasien / hari
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      <div className="tvlk-card rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#18201c]">Proporsi Penjamin Pasien</p>
          <span className="text-[11px] text-[#6b7770] truncate">
            {selectedPoli === 'TOTAL' ? 'Semua Unit RSIA' : selectedPoli}
          </span>
        </div>
        <div className="space-y-2.5">
          {currentPenjaminList.map((pj, idx) => (
            <div key={pj.penjamin} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#3c4641] truncate">{pj.penjamin}</span>
                <span className="font-bold text-[#18201c] tabular-nums">
                  {formatNum(pj.count)} ({pj.share_pct}%)
                </span>
              </div>
              <div className="w-full bg-[#edf8f2] rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, pj.share_pct)}%`,
                    backgroundColor: RSIA_GREEN.penjaminScale[idx % RSIA_GREEN.penjaminScale.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHeatmapBlock = (isExpanded = false) => {
    if (!isExpanded) {
      return (
        <div className="space-y-3">
          <div className="bg-[#edf8f2] border border-[#ace2c5] rounded-2xl p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1e8455]">
              Jam Paling Padat (24 Jam)
            </p>
            <p className="text-sm font-extrabold text-[#0f5c43]">
              {peakHourStats.busiestSlot.day}, Pukul {String(peakHourStats.busiestSlot.hour).padStart(2, '0')}:00
            </p>
            <p className="text-[11px] font-semibold text-[#3c4641] tabular-nums">
              {formatNum(peakHourStats.busiestSlot.count)} total kunjungan
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[#18201c]">5 Jam Tersibuk (Akumulasi 24 Jam)</p>
            {peakHourStats.topHours.map((item, idx) => (
              <div key={item.hour} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#3c4641] tabular-nums">
                    {String(item.hour).padStart(2, '0')}:00
                  </span>
                  <span className="font-extrabold text-[#18201c] tabular-nums">
                    {formatNum(item.total)}
                  </span>
                </div>
                <div className="w-full bg-[#edf8f2] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(8, Math.round((item.total / peakHourStats.maxHourTotal) * 100))}%`,
                      backgroundColor: RSIA_GREEN.penjaminScale[idx % RSIA_GREEN.penjaminScale.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleFocusPanel('heatmap')}
            className="w-full py-2 px-3 rounded-xl tvlk-btn-primary text-xs font-bold transition shadow-xs"
          >
            Buka Matriks 24 Jam →
          </button>
        </div>
      );
    }

    return (
      <div className="tvlk-card rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#18201c]">Pola Jam Sibuk Kunjungan (24 Jam)</p>
            <p className="text-[11px] text-[#6b7770] truncate">
              {selectedPoli === 'TOTAL' ? 'Semua Unit RSIA' : selectedPoli} • Puncak:{' '}
              <strong className="text-[#0f5c43]">
                {peakHourStats.busiestSlot.day} {String(peakHourStats.busiestSlot.hour).padStart(2, '0')}:00
              </strong>{' '}
              ({formatNum(peakHourStats.busiestSlot.count)})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllHours((prev) => !prev)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg tvlk-btn-soft shrink-0 transition"
          >
            {showAllHours ? 'Fokus Jam 07–21' : 'Tampilkan 24 Jam Penuh'}
          </button>
        </div>

        <div className="overflow-x-auto touch-pan-x tvlk-scroll pb-1">
          <table className="w-full border-collapse text-center min-w-160">
            <thead>
              <tr>
                <th className="p-1 text-[10px] font-bold text-[#6b7770] text-left sticky left-0 bg-white z-10">
                  Hari / Jam
                </th>
                {displayedHours.map((h) => (
                  <th key={h} className="p-1 text-[10px] font-bold text-[#6b7770] tabular-nums">
                    {String(h).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {currentHeatmapData.map((row) => (
                <tr key={row.day_name}>
                  <td className="p-1 pr-2 text-[11px] font-bold text-[#18201c] text-left bg-white sticky left-0 z-10 whitespace-nowrap">
                    {row.day_name}
                  </td>
                  {displayedHours.map((h) => {
                    const val = row.hours[String(h)] || 0;
                    return (
                      <td
                        key={h}
                        title={`${row.day_name} Pukul ${String(h).padStart(2, '0')}:00 — ${formatNum(val)} kunjungan`}
                        className={`p-1 text-[10px] border border-white rounded-xs tabular-nums transition-colors hover:ring-1 hover:ring-[#0f5c43]/40 cursor-default ${getHeatmapCellClass(
                          val,
                          heatmapMaxVal
                        )}`}
                      >
                        {val > 0 ? val : '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6b7770] pt-1.5 border-t border-[#e8efe9]">
          <span>Warna hijau semakin pekat menandakan jam kedatangan pasien paling padat (00:00–23:00).</span>
          <div className="flex items-center gap-1 text-[10px] font-medium">
            <span>Sepi</span>
            <span className="w-3 h-3 rounded-xs bg-[#f6f8f7] border border-[#dce7e0]" />
            <span className="w-3 h-3 rounded-xs bg-[#edf8f2]" />
            <span className="w-3 h-3 rounded-xs bg-[#ace2c5]" />
            <span className="w-3 h-3 rounded-xs bg-[#2fa56e]" />
            <span className="w-3 h-3 rounded-xs bg-[#0f5c43]" />
            <span>Padat</span>
          </div>
        </div>
      </div>
    );
  };

  const desktopSlotClasses: Record<'chart' | 'units' | 'heatmap', string> =
    focusedPanel === 'units'
      ? {
          units: 'lg:order-1 lg:flex-[6]',
          chart: 'lg:order-2 lg:flex-[2.2]',
          heatmap: 'lg:order-3 lg:flex-[1.8]',
        }
      : focusedPanel === 'heatmap'
      ? {
          chart: 'lg:order-1 lg:flex-[2]',
          units: 'lg:order-2 lg:flex-[2]',
          heatmap: 'lg:order-3 lg:flex-[6]',
        }
      : {
          chart: 'lg:order-1 lg:flex-[6]',
          units: 'lg:order-2 lg:flex-[2.2]',
          heatmap: 'lg:order-3 lg:flex-[1.8]',
        };

  const monthOptionsAvailable = selectedYear !== 'ALL' && quickPreset !== 'custom';
  const weekOptionsAvailable =
    selectedYear !== 'ALL' && selectedMonth !== 'ALL' && quickPreset !== 'custom';

  return (
    <div
      ref={toolbarRef}
      className="flex-none lg:flex-1 h-auto min-h-full lg:h-full lg:min-h-0 w-full flex flex-col gap-2.5 p-2.5 sm:p-3 tvlk-shell overflow-x-hidden lg:overflow-hidden"
    >
      {/* Mobile Click-away Backdrop saat Popover terbuka */}
      {openPopover && (
        <div
          className="fixed inset-0 z-80 bg-[#0f3d2b]/30 backdrop-blur-[1px] sm:hidden"
          onClick={() => setOpenPopover(null)}
          aria-hidden="true"
        />
      )}

      {/* BARIS 1: HEADER KONTROL & FILTER WAKTU FLEKSIBEL */}
      <div className="shrink-0 bg-white border border-[#dce7e0] rounded-2xl px-3.5 py-2.5 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
        {/* Kiri: Pemilih Unit & Label Periode Aktif */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 w-full xl:w-auto">
          <div className="flex items-center gap-2 min-w-37.5 flex-1 sm:flex-none">
            <label htmlFor="exec-unit-select" className="text-xs font-bold text-[#6b7770] hidden sm:inline">
              Unit:
            </label>
            <select
              id="exec-unit-select"
              data-testid="unit-selector"
              value={selectedPoli}
              onChange={(e) => setSelectedPoli(e.target.value)}
              className="w-full sm:w-auto text-xs font-bold text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e8455] focus:border-[#1e8455] max-w-full sm:max-w-62.5 truncate transition"
            >
              {!isKadiv && <option value="TOTAL">Semua Unit RSIA (Total)</option>}
              {Object.keys(summary?.by_poliklinik || {}).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Popover Pilih Periode & Tanggal */}
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <button
              type="button"
              data-testid="btn-period-popover"
              onClick={() => setOpenPopover((prev) => (prev === 'period' ? null : 'period'))}
              className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold max-w-full transition ${
                openPopover === 'period'
                  ? 'bg-[#0f5c43] text-white border-[#0f5c43] shadow-xs'
                  : 'bg-[#f6f8f7] text-[#18201c] border-[#dce7e0] hover:bg-[#edf8f2] hover:border-[#ace2c5]'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="truncate">{activeDateBounds.label}</span>
              <svg
                className={`w-3.5 h-3.5 shrink-0 opacity-75 transition-transform ${
                  openPopover === 'period' ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openPopover === 'period' && (
              <div
                data-testid="popover-period"
                className="fixed inset-x-3 top-20 z-90 w-auto max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-[#ace2c5] rounded-2xl shadow-2xl shadow-[#0f5c43]/15 p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-[#18201c]">Atur Periode & Rentang Tanggal</p>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="text-xs text-[#1e8455] hover:text-[#0f5c43] font-bold px-1.5 py-0.5 rounded-md"
                  >
                    Tutup
                  </button>
                </div>

                {/* Pilihan Cepat */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#6b7770]">Pilihan Cepat</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Semua (2023–2026)' },
                        { id: '2026', label: '2026' },
                        { id: '2025', label: '2025' },
                        { id: '2024', label: '2024' },
                        { id: '2023', label: '2023' },
                        { id: 'h1_2026', label: 'Jan–Jun 2026' },
                        { id: 'h2_2026', label: 'Proyeksi Jul–Des 2026' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`preset-period-${item.id}`}
                        onClick={() => handleSelectQuickPreset(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          quickPreset === item.id && selectedMonth === 'ALL'
                            ? 'bg-[#0f5c43] text-white border-[#0f5c43]'
                            : 'bg-[#f6f8f7] text-[#3c4641] border-[#dce7e0] hover:bg-[#edf8f2] hover:border-[#ace2c5]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Bertingkat: Tahun -> Bulan -> Minggu ke-N */}
                <div className="border-t border-[#e8efe9] pt-3 space-y-2.5">
                  <p className="text-[11px] font-bold text-[#6b7770]">
                    Pilih Spesifik (Tahun, Bulan, atau Minggu ke-Berapa)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="filter-year" className="block text-[11px] font-semibold text-[#3c4641] mb-1">
                        Tahun
                      </label>
                      <select
                        id="filter-year"
                        data-testid="select-filter-year"
                        value={quickPreset === 'custom' ? 'ALL' : selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="w-full text-xs font-bold text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e8455]"
                      >
                        <option value="ALL">Semua Tahun (2023–2026)</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="filter-month" className="block text-[11px] font-semibold text-[#3c4641] mb-1">
                        Bulan
                      </label>
                      <select
                        id="filter-month"
                        data-testid="select-filter-month"
                        value={monthOptionsAvailable ? selectedMonth : 'ALL'}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="w-full text-xs font-bold text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e8455]"
                      >
                        <option value="ALL">Semua Bulan (Jan–Des)</option>
                        {MONTH_FULL_ID.map((mName, idx) => (
                          <option key={mName} value={String(idx + 1)}>
                            {mName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="filter-week" className="block text-[11px] font-semibold text-[#3c4641] mb-1">
                      Minggu ke- (dalam bulan terpilih)
                    </label>
                    <select
                      id="filter-week"
                      data-testid="select-filter-week"
                      disabled={!weekOptionsAvailable}
                      value={weekOptionsAvailable ? selectedWeekOfMonth : 'ALL'}
                      onChange={(e) => handleWeekOfMonthChange(e.target.value)}
                      className="w-full text-xs font-bold text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1.5 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1e8455]"
                    >
                      {WEEK_OF_MONTH_OPTIONS.map((wOpt) => (
                        <option key={wOpt.value} value={wOpt.value}>
                          {wOpt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rentang Tanggal Bebas (Dari -> Sampai) */}
                <div className="border-t border-[#e8efe9] pt-3 space-y-2">
                  <p className="text-[11px] font-bold text-[#6b7770]">
                    Atau Pilih Rentang Tanggal Bebas (2023–2026)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="custom-start-date" className="block text-[11px] font-semibold text-[#3c4641] mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        id="custom-start-date"
                        data-testid="input-start-date"
                        type="date"
                        min={meta?.data_period.start_date || '2023-01-01'}
                        max={meta?.data_period.future_forecast_end_date || '2026-12-31'}
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-xs font-semibold tabular-nums text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e8455]"
                      />
                    </div>
                    <div>
                      <label htmlFor="custom-end-date" className="block text-[11px] font-semibold text-[#3c4641] mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        id="custom-end-date"
                        data-testid="input-end-date"
                        type="date"
                        min={meta?.data_period.start_date || '2023-01-01'}
                        max={meta?.data_period.future_forecast_end_date || '2026-12-31'}
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-xs font-semibold tabular-nums text-[#18201c] bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e8455]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-apply-date-range"
                    onClick={handleApplyCustomRange}
                    className="w-full py-2 rounded-xl bg-[#0f5c43] hover:bg-[#0b4a36] text-white text-xs font-bold transition shadow-xs"
                  >
                    Terapkan Rentang Tanggal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kanan: Segmented Control Resolusi Waktu + Garis Grafik + Switcher Panel */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
          <div
            role="group"
            aria-label="Tampilan Resolusi Waktu"
            className="inline-flex items-center bg-[#eef1ef] border border-[#dce7e0] rounded-xl p-0.5 gap-0.5"
          >
            {(
              [
                { id: 'monthly', label: 'Bulanan' },
                { id: 'weekly', label: 'Mingguan' },
                { id: 'daily', label: 'Harian' },
                { id: 'yearly', label: 'Tahunan' },
              ] as const
            ).map((opt) => {
              const isSelected = resolution === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`timeframe-${opt.id}`}
                  onClick={() => setResolution(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    isSelected
                      ? 'bg-[#0f5c43] text-white shadow-xs'
                      : 'text-[#515c56] hover:text-[#18201c] hover:bg-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Popover Garis Grafik */}
          <div className="relative">
            <button
              type="button"
              data-testid="btn-layer-popover"
              onClick={() => setOpenPopover((prev) => (prev === 'layers' ? null : 'layers'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                openPopover === 'layers'
                  ? 'bg-[#0f5c43] text-white border-[#0f5c43] shadow-xs'
                  : 'bg-white text-[#3c4641] border-[#dce7e0] hover:bg-[#edf8f2] hover:border-[#ace2c5]'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <span>Garis ({activeLayerCount})</span>
            </button>

            {openPopover === 'layers' && (
              <div
                data-testid="popover-layers"
                className="fixed inset-x-3 top-20 z-90 w-auto max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white border border-[#ace2c5] rounded-2xl shadow-2xl shadow-[#0f5c43]/15 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-[#18201c]">Tampilan Garis Grafik</p>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="text-xs text-[#1e8455] hover:text-[#0f5c43] font-bold"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-1.5">
                  {LAYER_CONFIG.map((layer) => {
                    const checked = checkedLayers[layer.key];
                    return (
                      <label
                        key={layer.key}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                          checked
                            ? 'bg-[#edf8f2] border-[#1e8455]/45'
                            : 'bg-[#f6f8f7] border-[#e1e6e3] opacity-75 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          data-testid={`chk-layer-${layer.key}`}
                          checked={checked}
                          onChange={() => toggleLayer(layer.key)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#93d1ae] accent-[#0f5c43]"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#18201c]">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: layer.colorVar }}
                            />
                            <span className="truncate">{layer.label}</span>
                          </div>
                          <p className="text-[11px] text-[#6b7770] leading-snug mt-0.5">{layer.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Popover Panduan Fungsi Tombol (Membantu Pengguna Awam & Penguji) */}
          <div className="relative">
            <button
              type="button"
              data-testid="btn-guide-popover"
              title="Lihat fungsi setiap tombol di halaman Analisis Kunjungan"
              onClick={() => setOpenPopover((prev) => (prev === 'guide' ? null : 'guide'))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                openPopover === 'guide'
                  ? 'bg-[#0f5c43] text-white border-[#0f5c43] shadow-xs'
                  : 'bg-[#edf8f2] text-[#0f5c43] border-[#ace2c5] hover:bg-[#d5f0e1]'
              }`}
            >
              <span>? Panduan</span>
            </button>

            {openPopover === 'guide' && (
              <div
                data-testid="popover-guide"
                className="fixed inset-x-3 top-20 z-90 w-auto max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-[#ace2c5] rounded-2xl shadow-2xl shadow-[#0f5c43]/15 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#eef1ef] pb-2">
                  <p className="text-xs font-extrabold text-[#0f5c43]">
                    Panduan Fungsi Tombol Analisis Kunjungan
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="text-xs text-[#1e8455] hover:text-[#0f5c43] font-bold"
                  >
                    Tutup
                  </button>
                </div>
                <ul className="space-y-1.5 text-[11px] text-[#3c4641] leading-relaxed">
                  <li>
                    <strong className="text-[#18201c]">1. Kotak &quot;Unit:&quot;:</strong> Pilih seluruh RS (khusus Direktur) atau poliklinik tertentu (seperti OBGYN, IGD, Anak, Umum). Semua angka dan grafik langsung menyesuaikan.
                  </li>
                  <li>
                    <strong className="text-[#18201c]">2. Tombol Rentang Tanggal:</strong> Pilih cepat tahun 2023–2026, periode <span className="font-semibold">Jan–Jun 2026</span>, <span className="font-semibold">Proyeksi Jul–Des 2026</span>, atau atur tanggal sendiri lalu klik <span className="font-semibold">Terapkan Rentang Tanggal</span>.
                  </li>
                  <li>
                    <strong className="text-[#18201c]">3. Bulanan / Mingguan / Harian / Tahunan:</strong> Mengubah detail sumbu waktu grafik dari ringkas per tahun hingga rinci per hari.
                  </li>
                  <li>
                    <strong className="text-[#18201c]">4. Garis ({activeLayerCount}):</strong> Menyalakan atau mematikan garis data asli SIMRS, garis proyeksi HistGB, NB GLM, dan batas kisaran atas–bawah.
                  </li>
                  <li>
                    <strong className="text-[#18201c]">5. Grafik / Poliklinik / Jam Sibuk 24J:</strong> Memperbesar salah satu panel agar daftar poliklinik, proporsi penjamin, atau tabel jam kedatangan 24 jam lebih mudah dibaca.
                  </li>
                </ul>
                <p className="text-[10px] font-semibold text-[#6b7770] pt-1.5 border-t border-[#eef1ef]">
                  Akses terbatas hanya untuk Direktur RSIA dan Kepala Divisi Pelayanan Medis.
                </p>
              </div>
            )}
          </div>

          {/* Stage Focus Switcher Mobile & Desktop (Grafik / Poliklinik / Jam Sibuk 24 Jam) */}
          <div
            role="group"
            aria-label="Fokus Tampilan Panel"
            className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex items-center bg-[#eef1ef] border border-[#dce7e0] rounded-xl p-0.5 gap-0.5"
          >
            {(
              [
                { id: 'chart', label: 'Grafik' },
                { id: 'units', label: 'Poliklinik' },
                { id: 'heatmap', label: 'Jam Sibuk 24J' },
              ] as const
            ).map((panel) => {
              const isFocused = focusedPanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  data-testid={`focus-panel-${panel.id}`}
                  onClick={() => handleFocusPanel(panel.id)}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold text-center transition-colors ${
                    isFocused
                      ? 'bg-[#0f5c43] text-white shadow-xs'
                      : 'text-[#515c56] hover:text-[#18201c] hover:bg-white/80'
                  }`}
                >
                  {panel.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BARIS 2: 4 KARTU RINGKASAN EKSEKUTIF DINAMIS (MEMOIZED PRO UI) */}
      <KpiStripMemo kpiCards={kpiCards} selectedPoli={selectedPoli} />

      {/* BARIS 3: 3 PANEL INTERAKTIF STABIL TANPA GEPENG (GRAFIK <-> POLIKLINIK <-> JAM SIBUK 24 JAM) */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:flex-row gap-2.5 lg:overflow-hidden">
        {/* PANEL 1: GRAFIK TREN & PROYEKSI */}
        <ChartStagePanelMemo
          focusedPanel={focusedPanel}
          slotClass={desktopSlotClasses.chart}
          onFocusChart={() => handleFocusPanel('chart')}
          activeDateLabel={activeDateBounds.label}
          chartSeriesData={chartSeriesData}
          resolution={resolution}
          checkedLayers={checkedLayers}
          isDenseDailyRange={isDenseDailyRange}
          projectionStartLabel={projectionStartLabel}
          onSwitchToMonthly={handleSwitchToMonthly}
        />

        {/* PANEL 2: POLIKLINIK & PENJAMIN */}
        <aside
          data-active={focusedPanel === 'units'}
          className={`${
            focusedPanel === 'units' ? 'flex' : 'hidden lg:flex'
          } ${desktopSlotClasses.units} w-full min-h-105 lg:h-full lg:min-h-0 lg:shrink lg:basis-0 min-w-0 tvlk-stage-panel rounded-2xl flex-col overflow-hidden`}
        >
          <button
            type="button"
            data-testid="dock-tab-units"
            onClick={() => handleFocusPanel(focusedPanel === 'units' ? 'chart' : 'units')}
            className={`shrink-0 px-3.5 py-2 border-b border-[#e1e6e3] flex items-center justify-between gap-2 text-left transition-colors ${
              focusedPanel === 'units'
                ? 'bg-[#0f5c43] text-white'
                : 'bg-[#f6f8f7] text-[#18201c] hover:bg-[#edf8f2]'
            }`}
          >
            <span className="text-xs font-extrabold truncate">Poliklinik</span>
            <span
              className={`hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                focusedPanel === 'units'
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-[#0f5c43] border border-[#ace2c5]'
              }`}
            >
              {focusedPanel === 'units' ? 'Kecilkan ↙' : 'Perbesar ⤢'}
            </span>
          </button>

          <div className="flex-1 min-h-0 overflow-y-auto tvlk-scroll p-3 bg-white">
            {renderUnitsBlock(focusedPanel === 'units')}
          </div>
        </aside>

        {/* PANEL 3: POLA JAM SIBUK 24 JAM */}
        <aside
          data-active={focusedPanel === 'heatmap'}
          className={`${
            focusedPanel === 'heatmap' ? 'flex' : 'hidden lg:flex'
          } ${desktopSlotClasses.heatmap} w-full min-h-115 lg:h-full lg:min-h-0 lg:shrink lg:basis-0 min-w-0 tvlk-stage-panel rounded-2xl flex-col overflow-hidden`}
        >
          <button
            type="button"
            data-testid="dock-tab-heatmap"
            onClick={() => handleFocusPanel(focusedPanel === 'heatmap' ? 'chart' : 'heatmap')}
            className={`shrink-0 px-3.5 py-2 border-b border-[#e1e6e3] flex items-center justify-between gap-2 text-left transition-colors ${
              focusedPanel === 'heatmap'
                ? 'bg-[#0f5c43] text-white'
                : 'bg-[#f6f8f7] text-[#18201c] hover:bg-[#edf8f2]'
            }`}
          >
            <span className="text-xs font-extrabold truncate">Jam Sibuk 24J</span>
            <span
              className={`hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                focusedPanel === 'heatmap'
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-[#0f5c43] border border-[#ace2c5]'
              }`}
            >
              {focusedPanel === 'heatmap' ? 'Kecilkan ↙' : 'Perbesar ⤢'}
            </span>
          </button>

          <div className="flex-1 min-h-0 overflow-y-auto tvlk-scroll p-3 bg-white">
            {renderHeatmapBlock(focusedPanel === 'heatmap')}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnalisiKunjungan;
