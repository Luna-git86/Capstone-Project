#!/usr/bin/env python3
"""
03_feature_engineering.py — Tahap 3: Feature Engineering
=========================================================
Scientific Method pipeline for outpatient visit forecasting at RSIA Qurrata A'yun.

Transforms daily aggregate series into regression-ready feature matrices:
  1. Calendar attributes: day_of_week, day_of_month, month, week_of_year, is_weekend,
     is_month_start, is_month_end.
  2. Cyclic trigonometric encoding: sin_dow, cos_dow (P=7) and sin_month, cos_month (P=12).
  3. Indonesian National Holidays & Cuti Bersama (2023–2026) verified from SKB 3 Menteri,
     plus Hijri Ramadan & Lebaran windows computed dynamically via `hijri_converter`.
  4. Non-leakage Autoregressive Lags & Rolling Statistics:
     - For primary horizon H=7: lag_7, lag_14, lag_21, lag_28, rolling_mean_7d/14d/28d,
       rolling_std_7d, ratio_lag7_to_rolling28 (all shifted by >= 7 days).
     - For sensitivity horizon H=14: rolling_mean_7d_h14, rolling_mean_28d_h14,
       rolling_std_7d_h14 (all shifted by >= 14 days so H=14 evaluation has zero leakage).
  5. Feature ablation / usefulness verification on Training + Validation split (<= 2025-12-31)
     to test each feature group's contribution before touching the Test set.
  6. Export processed feature datasets (`features_total.parquet`, `features_by_poli.parquet`),
     holiday catalog (`holidays_2023_2026.json`), and feature summary (`03_feature_summary.json`).

PRIVACY: No personal identifiable information is processed or generated.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from hijri_converter import Gregorian
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

# Project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config


# ─────────────────────────────────────────────────────────────────────────────
# 1. Verified Indonesian National Holidays & Cuti Bersama (2023 - 2026)
#    Sources:
#    - 2023: SKB 3 Menteri No. 1066/2022, No. 3/2022, No. 3/2022 & Perubahan SKB No. 624/2023
#    - 2024: SKB 3 Menteri No. 855/2023, No. 3/2023, No. 4/2023
#    - 2025: SKB 3 Menteri No. 1017/2024, No. 2/2024, No. 2/2024
#    - 2026: SKB 3 Menteri tentang Hari Libur Nasional & Cuti Bersama 2026 (19 Sep 2025)
# ─────────────────────────────────────────────────────────────────────────────
HOLIDAY_SOURCES = {
    "2023": "SKB 3 Menteri No. 1066/2022, No. 3/2022, No. 3/2022 jo. SKB No. 624/2023",
    "2024": "SKB 3 Menteri No. 855/2023, No. 3/2023, No. 4/2023",
    "2025": "SKB 3 Menteri No. 1017/2024, No. 2/2024, No. 2/2024",
    "2026": "SKB 3 Menteri tentang Hari Libur Nasional dan Cuti Bersama Tahun 2026 (ditetapkan 19 September 2025)",
}

INDONESIAN_HOLIDAYS_MAP: dict[str, str] = {
    # 2023
    "2023-01-01": "Tahun Baru 2023 Masehi",
    "2023-01-22": "Tahun Baru Imlek 2574 Kongzili",
    "2023-01-23": "Cuti Bersama Tahun Baru Imlek",
    "2023-02-18": "Isra Mikraj Nabi Muhammad SAW",
    "2023-03-22": "Hari Suci Nyepi Tahun Baru Saka 1945",
    "2023-03-23": "Cuti Bersama Hari Suci Nyepi",
    "2023-04-07": "Wafat Isa Almasih",
    "2023-04-19": "Cuti Bersama Idulfitri 1444 H",
    "2023-04-20": "Cuti Bersama Idulfitri 1444 H",
    "2023-04-21": "Cuti Bersama Idulfitri 1444 H",
    "2023-04-22": "Hari Raya Idulfitri 1444 H",
    "2023-04-23": "Hari Raya Idulfitri 1444 H",
    "2023-04-24": "Cuti Bersama Idulfitri 1444 H",
    "2023-04-25": "Cuti Bersama Idulfitri 1444 H",
    "2023-05-01": "Hari Buruh Internasional",
    "2023-05-18": "Kenaikan Isa Almasih",
    "2023-06-01": "Hari Lahir Pancasila",
    "2023-06-02": "Cuti Bersama Hari Raya Waisak",
    "2023-06-04": "Hari Raya Waisak 2567 BE",
    "2023-06-28": "Cuti Bersama Hari Raya Iduladha 1444 H",
    "2023-06-29": "Hari Raya Iduladha 1444 H",
    "2023-06-30": "Cuti Bersama Hari Raya Iduladha 1444 H",
    "2023-07-19": "Tahun Baru Islam 1445 H",
    "2023-08-17": "Hari Kemerdekaan RI",
    "2023-09-28": "Maulid Nabi Muhammad SAW",
    "2023-12-25": "Hari Raya Natal",
    "2023-12-26": "Cuti Bersama Hari Raya Natal",
    # 2024
    "2024-01-01": "Tahun Baru 2024 Masehi",
    "2024-02-08": "Isra Mikraj Nabi Muhammad SAW",
    "2024-02-09": "Cuti Bersama Tahun Baru Imlek",
    "2024-02-10": "Tahun Baru Imlek 2575 Kongzili",
    "2024-03-11": "Hari Suci Nyepi Tahun Baru Saka 1946",
    "2024-03-12": "Cuti Bersama Hari Suci Nyepi",
    "2024-03-29": "Wafat Isa Almasih",
    "2024-03-31": "Hari Paskah",
    "2024-04-08": "Cuti Bersama Idulfitri 1445 H",
    "2024-04-09": "Cuti Bersama Idulfitri 1445 H",
    "2024-04-10": "Hari Raya Idulfitri 1445 H",
    "2024-04-11": "Hari Raya Idulfitri 1445 H",
    "2024-04-12": "Cuti Bersama Idulfitri 1445 H",
    "2024-04-15": "Cuti Bersama Idulfitri 1445 H",
    "2024-05-01": "Hari Buruh Internasional",
    "2024-05-09": "Kenaikan Isa Almasih",
    "2024-05-10": "Cuti Bersama Kenaikan Isa Almasih",
    "2024-05-23": "Hari Raya Waisak 2568 BE",
    "2024-05-24": "Cuti Bersama Hari Raya Waisak",
    "2024-06-01": "Hari Lahir Pancasila",
    "2024-06-17": "Hari Raya Iduladha 1445 H",
    "2024-06-18": "Cuti Bersama Hari Raya Iduladha",
    "2024-07-07": "Tahun Baru Islam 1446 H",
    "2024-08-17": "Hari Kemerdekaan RI",
    "2024-09-16": "Maulid Nabi Muhammad SAW",
    "2024-12-25": "Hari Raya Natal",
    "2024-12-26": "Cuti Bersama Hari Raya Natal",
    # 2025
    "2025-01-01": "Tahun Baru 2025 Masehi",
    "2025-01-27": "Isra Mikraj Nabi Muhammad SAW",
    "2025-01-28": "Cuti Bersama Tahun Baru Imlek",
    "2025-01-29": "Tahun Baru Imlek 2576 Kongzili",
    "2025-03-28": "Cuti Bersama Hari Suci Nyepi",
    "2025-03-29": "Hari Suci Nyepi Tahun Baru Saka 1947",
    "2025-03-31": "Hari Raya Idulfitri 1446 H",
    "2025-04-01": "Hari Raya Idulfitri 1446 H",
    "2025-04-02": "Cuti Bersama Idulfitri 1446 H",
    "2025-04-03": "Cuti Bersama Idulfitri 1446 H",
    "2025-04-04": "Cuti Bersama Idulfitri 1446 H",
    "2025-04-07": "Cuti Bersama Idulfitri 1446 H",
    "2025-04-18": "Wafat Yesus Kristus",
    "2025-04-20": "Kebangkitan Yesus Kristus (Paskah)",
    "2025-05-01": "Hari Buruh Internasional",
    "2025-05-12": "Hari Raya Waisak 2569 BE",
    "2025-05-13": "Cuti Bersama Hari Raya Waisak",
    "2025-05-29": "Kenaikan Yesus Kristus",
    "2025-05-30": "Cuti Bersama Kenaikan Yesus Kristus",
    "2025-06-01": "Hari Lahir Pancasila",
    "2025-06-06": "Hari Raya Iduladha 1446 H",
    "2025-06-09": "Cuti Bersama Hari Raya Iduladha",
    "2025-06-27": "1 Muharam Tahun Baru Islam 1447 H",
    "2025-08-17": "Proklamasi Kemerdekaan",
    "2025-08-18": "Cuti Bersama HUT ke-80 RI",
    "2025-09-05": "Maulid Nabi Muhammad SAW",
    "2025-12-25": "Kelahiran Yesus Kristus (Natal)",
    "2025-12-26": "Cuti Bersama Natal",
    # 2026 (Januari s.d. Juni 2026 sesuai SKB 3 Menteri 2026)
    "2026-01-01": "Tahun Baru 2026 Masehi",
    "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
    "2026-02-16": "Cuti Bersama Tahun Baru Imlek 2577 Kongzili",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-18": "Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948",
    "2026-03-19": "Hari Suci Nyepi Tahun Baru Saka 1948",
    "2026-03-20": "Cuti Bersama Idulfitri 1447 H",
    "2026-03-21": "Hari Raya Idulfitri 1447 H",
    "2026-03-22": "Hari Raya Idulfitri 1447 H",
    "2026-03-23": "Cuti Bersama Idulfitri 1447 H",
    "2026-03-24": "Cuti Bersama Idulfitri 1447 H",
    "2026-04-03": "Wafat Yesus Kristus",
    "2026-04-05": "Kebangkitan Yesus Kristus (Paskah)",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Yesus Kristus",
    "2026-05-15": "Cuti Bersama Kenaikan Yesus Kristus",
    "2026-05-27": "Hari Raya Iduladha 1447 H",
    "2026-05-28": "Cuti Bersama Hari Raya Iduladha 1447 H",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "1 Muharam Tahun Baru Islam 1448 H",
    "2026-08-17": "Hari Kemerdekaan RI",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    "2026-12-24": "Cuti Bersama Hari Raya Natal",
    "2026-12-25": "Hari Raya Natal",
}

FEATURE_HYPOTHESES = {
    "day_of_week": "Volume poliklinik terjadwal mengikuti jadwal praktik mingguan dokter (puncak Senin & Rabu, lembah Minggu).",
    "day_of_month": "Menangkap variasi siklus tanggal gajian/administrasi rujukan bulanan.",
    "month": "Menangkap variasi musiman cuaca/penyakit tahunan.",
    "week_of_year": "Menangkap pergeseran gelombang musiman tahunan secara granular.",
    "is_weekend": "Kunjungan poliklinik spesialis turun signifikan pada akhir pekan (Sabtu-Minggu).",
    "is_month_start": "Efek awal bulan pada pembaruan kuota/administrasi penjamin.",
    "is_month_end": "Efek akhir bulan pada penyelesaian kontrol pasien.",
    "sin_dow": "Komponen sinus siklus 7 hari agar transisi Minggu->Senin kontinu bagi model linier.",
    "cos_dow": "Komponen cosinus siklus 7 hari pasangan ortogonal sin_dow.",
    "sin_month": "Komponen sinus siklus 12 bulan agar transisi Des->Jan kontinu.",
    "cos_month": "Komponen cosinus siklus 12 bulan pasangan ortogonal sin_month.",
    "is_holiday": "Hari libur nasional/cuti bersama menurunkan kunjungan poliklinik terjadwal.",
    "is_ramadan": "Bulan puasa Ramadan (bulan ke-9 Hijriah) menggeser pola kunjungan rawat jalan.",
    "is_eid_period": "Periode 1–7 Syawal (Idulfitri & arus mudik/balik) menurunkan drastis kunjungan poliklinik reguler.",
    "days_to_next_holiday": "Mengukur efek antisipasi pasien menjelang libur nasional.",
    "days_from_last_holiday": "Mengukur efek penumpukan kunjungan (rebound) tepat setelah hari libur usai.",
    "lag_7": "Kunjungan pada hari yang sama 1 minggu lalu (ACF lag 7 = 0.577).",
    "lag_14": "Kunjungan pada hari yang sama 2 minggu lalu (ACF lag 14 = 0.566).",
    "lag_21": "Kunjungan pada hari yang sama 3 minggu lalu (ACF lag 21 = 0.531).",
    "lag_28": "Kunjungan pada hari yang sama 4 minggu lalu (ACF lag 28 = 0.532).",
    "rolling_mean_7d": "Tingkat rata-rata kunjungan 7 hari terakhir yang tersedia saat prediksi (t-7 s.d. t-13) untuk menangkap tren lokal.",
    "rolling_mean_14d": "Tingkat rata-rata kunjungan 14 hari (t-7 s.d. t-20) untuk stabilisasi tren menengah.",
    "rolling_mean_28d": "Tingkat rata-rata kunjungan 28 hari (t-7 s.d. t-34) sebagai jangkar rezim volume bulanan.",
    "rolling_std_7d": "Volatilitas lokal kunjungan 7 hari terakhir (t-7 s.d. t-13).",
    "ratio_lag7_to_rolling28": "Rasio hari yang sama minggu lalu terhadap level 28 hari (mengukur kekuatan hari spesifik relatif terhadap tren saat ini).",
    "dow_mean_4w": "Rata-rata kunjungan pada hari kerja yang sama selama 4 minggu terakhir (lag 7, 14, 21, 28).",
    "ratio_dow_to_rm28": "Rasio rata-rata 4 minggu hari yang sama terhadap level rezim 28 hari (indikator kekuatan spesifik hari kerja bebas pergeseran rezim).",
    "is_monday": "Indikator biner hari Senin (jadwal praktik dokter spesialis terbanyak, puncak mingguan).",
    "is_sunday": "Indikator biner hari Minggu (poliklinik spesialis tutup, layanan mayoritas Unit IGD).",
    "sin_dow_2": "Harmonik Fourier orde-2 sinus siklus 7 hari untuk menangkap ketajaman puncak Senin & lembah Minggu.",
    "cos_dow_2": "Harmonik Fourier orde-2 cosinus siklus 7 hari pasangan ortogonal sin_dow_2.",
    "is_holiday_weekday": "Interaksi tanggal merah pada hari kerja (Senin-Jumat), saat poliklinik terjadwal tutup mendadak.",
    "is_post_holiday_workday": "Indikator 1-2 hari kerja pertama setelah hari libur nasional (efek rebound/akumulasi pasien kontrol).",
    "ewma_dow_4w": "Rata-rata tertimbang eksponensial hari yang sama 4 minggu terakhir (40% lag_7 + 30% lag_14 + 20% lag_21 + 10% lag_28).",
    "ratio_ewma_dow_to_rm28": "Rasio EWMA hari yang sama terhadap rata-rata 28 hari untuk adaptasi cepat perubahan tren.",
    "rolling_median_28d": "Median bergulir 28 hari (t-7 s.d. t-34) sebagai jangkar rezim yang tahan terhadap pencilan pekan Lebaran.",
}


def compute_hijri_flags(dates: pd.Series) -> tuple[np.ndarray, np.ndarray]:
    """Use hijri-converter to flag Ramadan (Hijri month 9) and Eid/Syawal week (month 10, days 1-7)."""
    is_ramadan = np.zeros(len(dates), dtype=int)
    is_eid = np.zeros(len(dates), dtype=int)
    for idx, dt in enumerate(dates):
        h = Gregorian(dt.year, dt.month, dt.day).to_hijri()
        if h.month == 9:
            is_ramadan[idx] = 1
        elif h.month == 10 and h.day <= 7:
            is_eid[idx] = 1
    return is_ramadan, is_eid


def create_calendar_features(df_input: pd.DataFrame) -> pd.DataFrame:
    """Add calendar, cyclic, verified holiday, and Hijri features."""
    df = df_input.copy()
    date_col = "date" if "date" in df.columns else "tgl_reg"
    dates = pd.to_datetime(df[date_col])

    df["day_of_week"] = dates.dt.dayofweek
    df["day_of_month"] = dates.dt.day
    df["month"] = dates.dt.month
    df["week_of_year"] = dates.dt.isocalendar().week.astype(int)
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_monday"] = (df["day_of_week"] == 0).astype(int)
    df["is_sunday"] = (df["day_of_week"] == 6).astype(int)
    df["is_month_start"] = (df["day_of_month"] <= 3).astype(int)
    df["is_month_end"] = (df["day_of_month"] >= dates.dt.days_in_month - 2).astype(int)

    # Cyclic encoding (order 1 & order 2 for weekly harmonic)
    df["sin_dow"] = np.sin(2 * np.pi * df["day_of_week"] / 7.0)
    df["cos_dow"] = np.cos(2 * np.pi * df["day_of_week"] / 7.0)
    df["sin_dow_2"] = np.sin(4 * np.pi * df["day_of_week"] / 7.0)
    df["cos_dow_2"] = np.cos(4 * np.pi * df["day_of_week"] / 7.0)
    df["sin_month"] = np.sin(2 * np.pi * (df["month"] - 1) / 12.0)
    df["cos_month"] = np.cos(2 * np.pi * (df["month"] - 1) / 12.0)

    # Verified Indonesian holidays
    holiday_dates = set(INDONESIAN_HOLIDAYS_MAP.keys())
    date_strs = dates.dt.strftime("%Y-%m-%d")
    df["is_holiday"] = date_strs.isin(holiday_dates).astype(int)
    df["is_holiday_weekday"] = (df["is_holiday"] * (1 - df["is_weekend"])).astype(int)

    # Hijri Ramadan & Eid week via hijri_converter
    ramadan_arr, eid_arr = compute_hijri_flags(dates)
    df["is_ramadan"] = ramadan_arr
    df["is_eid_period"] = eid_arr

    # Distance to/from nearest holiday (capped at 30 days)
    all_holidays_dt = pd.to_datetime( sorted(list(holiday_dates)) )
    days_to_next = []
    days_from_last = []
    for cur_dt in dates:
        future_diffs = (all_holidays_dt - cur_dt).total_seconds() / 86400.0
        past_diffs = (cur_dt - all_holidays_dt).total_seconds() / 86400.0

        pos_future = future_diffs[future_diffs >= 0]
        pos_past = past_diffs[past_diffs >= 0]

        next_d = int(pos_future.min()) if len(pos_future) > 0 else 30
        prev_d = int(pos_past.min()) if len(pos_past) > 0 else 30

        days_to_next.append(min(next_d, 30))
        days_from_last.append(min(prev_d, 30))

    df["days_to_next_holiday"] = days_to_next
    df["days_from_last_holiday"] = days_from_last
    df["is_post_holiday_workday"] = (
        (df["days_from_last_holiday"] >= 1)
        & (df["days_from_last_holiday"] <= 2)
        & (df["is_holiday"] == 0)
        & (df["is_weekend"] == 0)
    ).astype(int)

    return df


def create_lag_and_rolling_features(
    df_input: pd.DataFrame, target_col: str = "visit_count"
) -> pd.DataFrame:
    """
    Create lag and rolling features WITHOUT DATA LEAKAGE.
    - Primary horizon H = 7 days: uses shift(7) and lags >= 7.
    - Sensitivity horizon H = 14 days: also computes shift(14) rolling stats (`_h14`)
      so H=14 evaluation only uses information from t-14 and earlier.
    """
    df = df_input.copy()
    s = df[target_col]

    # Lags >= 7 days
    df["lag_7"] = s.shift(7)
    df["lag_14"] = s.shift(14)
    df["lag_21"] = s.shift(21)
    df["lag_28"] = s.shift(28)

    # Horizon H = 7 rolling statistics (shifted by 7 days first!)
    s_shift7 = s.shift(7)
    df["rolling_mean_7d"] = s_shift7.rolling(window=7, min_periods=7).mean()
    df["rolling_mean_14d"] = s_shift7.rolling(window=14, min_periods=14).mean()
    df["rolling_mean_28d"] = s_shift7.rolling(window=28, min_periods=28).mean()
    df["rolling_median_28d"] = s_shift7.rolling(window=28, min_periods=28).median()
    df["rolling_std_7d"] = s_shift7.rolling(window=7, min_periods=7).std()
    df["ratio_lag7_to_rolling28"] = df["lag_7"] / (df["rolling_mean_28d"] + 1e-5)
    df["dow_mean_4w"] = df[["lag_7", "lag_14", "lag_21", "lag_28"]].mean(axis=1)
    df["ratio_dow_to_rm28"] = df["dow_mean_4w"] / (df["rolling_mean_28d"] + 1e-5)
    df["ewma_dow_4w"] = (
        0.40 * df["lag_7"] + 0.30 * df["lag_14"] + 0.20 * df["lag_21"] + 0.10 * df["lag_28"]
    )
    df["ratio_ewma_dow_to_rm28"] = df["ewma_dow_4w"] / (df["rolling_mean_28d"] + 1e-5)

    # Horizon H = 14 rolling statistics (shifted by 14 days first!)
    s_shift14 = s.shift(14)
    df["rolling_mean_7d_h14"] = s_shift14.rolling(window=7, min_periods=7).mean()
    df["rolling_mean_28d_h14"] = s_shift14.rolling(window=28, min_periods=28).mean()
    df["rolling_median_28d_h14"] = s_shift14.rolling(window=28, min_periods=28).median()
    df["rolling_std_7d_h14"] = s_shift14.rolling(window=7, min_periods=7).std()
    df["ratio_lag14_to_rolling28_h14"] = df["lag_14"] / (df["rolling_mean_28d_h14"] + 1e-5)
    df["dow_mean_3w_h14"] = df[["lag_14", "lag_21", "lag_28"]].mean(axis=1)
    df["ratio_dow_to_rm28_h14"] = df["dow_mean_3w_h14"] / (df["rolling_mean_28d_h14"] + 1e-5)
    df["ewma_dow_3w_h14"] = 0.50 * df["lag_14"] + 0.30 * df["lag_21"] + 0.20 * df["lag_28"]
    df["ratio_ewma_dow_to_rm28_h14"] = df["ewma_dow_3w_h14"] / (df["rolling_mean_28d_h14"] + 1e-5)

    return df


def run_feature_ablation(df_feat_total: pd.DataFrame) -> dict:
    """
    Evaluate feature group usefulness via ablation on Train (<=2025-06-30) -> Val (Jul-Dec 2025).
    Test set (2026) is untouched.
    """
    df_clean = df_feat_total.dropna().reset_index(drop=True)
    train_df = df_clean[df_clean["date"] <= config.TRAIN_END]
    val_df = df_clean[(df_clean["date"] > config.TRAIN_END) & (df_clean["date"] <= config.VALIDATION_END)]

    cal_cols = [
        "day_of_week", "day_of_month", "month", "week_of_year",
        "is_weekend", "is_monday", "is_sunday", "is_month_start", "is_month_end",
        "sin_dow", "cos_dow", "sin_dow_2", "cos_dow_2", "sin_month", "cos_month",
    ]
    hol_cols = [
        "is_holiday", "is_holiday_weekday", "is_post_holiday_workday",
        "is_ramadan", "is_eid_period",
        "days_to_next_holiday", "days_from_last_holiday",
    ]
    lag_cols = [
        "lag_7", "lag_14", "lag_21", "lag_28",
        "rolling_mean_7d", "rolling_mean_14d", "rolling_mean_28d", "rolling_median_28d",
        "rolling_std_7d", "ratio_lag7_to_rolling28",
        "dow_mean_4w", "ratio_dow_to_rm28",
        "ewma_dow_4w", "ratio_ewma_dow_to_rm28",
    ]

    configs = {
        "only_calendar": cal_cols,
        "calendar_plus_holiday": cal_cols + hol_cols,
        "only_lags_and_rolling": lag_cols,
        "calendar_plus_lags": cal_cols + lag_cols,
        "all_h7_features": cal_cols + hol_cols + lag_cols,
    }

    results = {}
    y_tr = train_df["visit_count"].values
    y_va = val_df["visit_count"].values
    base_tr = np.maximum(1.0, train_df["rolling_mean_28d"].values)
    base_va = np.maximum(1.0, val_df["rolling_mean_28d"].values)

    for name, cols in configs.items():
        model = HistGradientBoostingRegressor(
            loss="poisson", learning_rate=0.03, max_iter=120,
            max_depth=4, min_samples_leaf=20, l2_regularization=5.0, random_state=config.SEED,
        )
        if "rolling_mean_28d" in cols:
            model.fit(train_df[cols].values, y_tr / base_tr, sample_weight=base_tr)
            preds = model.predict(val_df[cols].values) * base_va
        else:
            model.fit(train_df[cols].values, y_tr)
            preds = model.predict(val_df[cols].values)
        results[name] = {
            "num_features": len(cols),
            "val_mae": round(float(mean_absolute_error(y_va, preds)), 3),
        }
    return results


def run_feature_engineering():
    print("=" * 70)
    print("TAHAP 3: REKAYASA FITUR (FEATURE ENGINEERING)")
    print("=" * 70)

    path_total = config.DATA_PROCESSED / "daily_total.parquet"
    path_by_poli = config.DATA_PROCESSED / "daily_by_poli.parquet"
    if not path_total.exists() or not path_by_poli.exists():
        raise FileNotFoundError("Berkas harian terproses tidak ditemukan. Jalankan 02_preprocessing.py dulu.")

    df_total = pd.read_parquet(path_total)
    date_col = "date" if "date" in df_total.columns else "tgl_reg"
    df_total = df_total.sort_values(date_col).reset_index(drop=True)
    df_poli = pd.read_parquet(path_by_poli).sort_values(["poliklinik", date_col]).reset_index(drop=True)

    print(f"Data harian total : {len(df_total)} baris")
    print(f"Data harian poli  : {len(df_poli)} baris")

    print("\n[1] Menghasilkan fitur untuk Total Kunjungan Rumah Sakit...")
    df_feat_total = create_calendar_features(df_total)
    df_feat_total = create_lag_and_rolling_features(df_feat_total, target_col="visit_count")

    print("[2] Menghasilkan fitur per-Poliklinik (group-by lag)...")
    poli_frames = []
    for _, group in df_poli.groupby("poliklinik"):
        grp = group.sort_values(date_col).reset_index(drop=True)
        grp_cal = create_calendar_features(grp)
        grp_feat = create_lag_and_rolling_features(grp_cal, target_col="visit_count")
        poli_frames.append(grp_feat)
    df_feat_poli = pd.concat(poli_frames, ignore_index=True)

    # Strictly exclude target, metadata, doctor-supply diagnostics, and outlier flags from model features
    non_feature_cols = [
        date_col, "visit_count", "new_patient_count",
        "active_doctors_total", "active_doctors_scheduled",
        "source_file", "day_name", "year", "poliklinik", "is_outlier",
    ]
    h7_feature_cols = list(FEATURE_HYPOTHESES.keys())
    h14_extra_cols = [
        "rolling_mean_7d_h14", "rolling_mean_28d_h14", "rolling_median_28d_h14",
        "rolling_std_7d_h14", "ratio_lag14_to_rolling28_h14",
        "dow_mean_3w_h14", "ratio_dow_to_rm28_h14",
        "ewma_dow_3w_h14", "ratio_ewma_dow_to_rm28_h14",
    ]
    all_engineered_cols = h7_feature_cols + h14_extra_cols

    print("\n[3] Uji Ablasi Kelompok Fitur pada Validation Set (Jul-Des 2025):")
    ablation_results = run_feature_ablation(df_feat_total)
    for k_ab, v_ab in ablation_results.items():
        print(f"  - {k_ab:25s} ({v_ab['num_features']:2d} fitur): Val MAE = {v_ab['val_mae']:.3f}")

    print(f"\n[4] Ringkasan Fitur (H=7: {len(h7_feature_cols)} fitur, +H=14: {len(h14_extra_cols)} fitur):")
    print(f"  Dimensi features_total.parquet   : {df_feat_total.shape[0]} baris x {df_feat_total.shape[1]} kolom")
    print(f"  Dimensi features_by_poli.parquet : {df_feat_poli.shape[0]} baris x {df_feat_poli.shape[1]} kolom")

    out_total = config.DATA_PROCESSED / "features_total.parquet"
    out_poli = config.DATA_PROCESSED / "features_by_poli.parquet"
    out_holidays = config.DATA_PROCESSED / "holidays_2023_2026.json"
    out_summary = config.TABLES_DIR / "03_feature_summary.json"

    df_feat_total.to_parquet(out_total, index=False)
    df_feat_poli.to_parquet(out_poli, index=False)

    with open(out_holidays, "w", encoding="utf-8") as f:
        json.dump(
            {
                "sources": HOLIDAY_SOURCES,
                "total_dates": len(INDONESIAN_HOLIDAYS_MAP),
                "holidays": INDONESIAN_HOLIDAYS_MAP,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    feature_summary = {
        "timestamp": datetime.now().isoformat(),
        "total_days": int(len(df_feat_total)),
        "total_columns_total_df": int(df_feat_total.shape[1]),
        "total_poli_rows": int(len(df_feat_poli)),
        "total_columns_poli_df": int(df_feat_poli.shape[1]),
        "forecast_horizon_default": config.HORIZON,
        "forecast_horizon_sensitivity": config.HORIZON_SENSITIVITY,
        "h7_feature_count": len(h7_feature_cols),
        "h7_features": h7_feature_cols,
        "h14_extra_features": h14_extra_cols,
        "excluded_non_feature_columns": [c for c in non_feature_cols if c in df_feat_total.columns],
        "holiday_sources": HOLIDAY_SOURCES,
        "holiday_dates_count_by_year": {
            yr: sum(1 for dt_s in INDONESIAN_HOLIDAYS_MAP if dt_s.startswith(yr))
            for yr in ["2023", "2024", "2025", "2026"]
        },
        "ablation_study_val_mae": ablation_results,
        "features_detail": {
            col: {
                "dtype": str(df_feat_total[col].dtype),
                "null_count": int(df_feat_total[col].isna().sum()),
                "hypothesis": FEATURE_HYPOTHESES.get(col, "Fitur khusus sensitivitas horizon H=14 (shift >= 14 hari)."),
                "sample_range": [
                    round(float(df_feat_total[col].dropna().min()), 4),
                    round(float(df_feat_total[col].dropna().max()), 4),
                ],
            }
            for col in all_engineered_cols
        },
    }
    with open(out_summary, "w", encoding="utf-8") as f:
        json.dump(feature_summary, f, indent=2, ensure_ascii=False)

    print(f"\n[Output] Tersimpan:")
    print(f"  [OK] {out_total}")
    print(f"  [OK] {out_poli}")
    print(f"  [OK] {out_holidays}")
    print(f"  [OK] {out_summary}")


if __name__ == "__main__":
    run_feature_engineering()
