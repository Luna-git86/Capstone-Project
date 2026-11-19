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
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

from hijri_converter import Gregorian
import numpy as np
import pandas as pd

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

GOOGLE_HOLIDAY_ICS_URL = (
    "https://calendar.google.com/calendar/ical/"
    "id.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics"
)
NAGER_HOLIDAY_API_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/ID"
_OBSERVANCE_EXCLUDE_KEYWORDS = (
    "1 ramadan",
    "malam tahun baru",
    "hari kedua muharram",
    "valentine",
    "hari ibu",
)
_RUNTIME_HOLIDAY_CACHE: dict[str, str] | None = None
_RUNTIME_HOLIDAY_SOURCE_INFO: dict[str, str] = {}


def _fetch_google_calendar_ics(target_years: set[int]) -> dict[str, str]:
    """Fetch Indonesian holidays & Cuti Bersama automatically from Google Calendar public ICS."""
    req = urllib.request.Request(GOOGLE_HOLIDAY_ICS_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        text = resp.read().decode("utf-8", errors="replace")

    events = re.findall(
        r"BEGIN:VEVENT.*?DTSTART;VALUE=DATE:(\d{8}).*?SUMMARY:(.*?)\r?\n.*?END:VEVENT",
        text,
        re.S,
    )
    parsed: dict[str, str] = {}
    for raw_date, raw_summary in events:
        yr = int(raw_date[:4])
        if yr not in target_years:
            continue
        summary = raw_summary.strip()
        if any(kw in summary.lower() for kw in _OBSERVANCE_EXCLUDE_KEYWORDS):
            continue
        iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
        parsed[iso_date] = summary
    return parsed


def _fetch_nager_api(target_years: set[int]) -> dict[str, str]:
    """Fallback public holiday API (date.nager.at) for Indonesia."""
    parsed: dict[str, str] = {}
    for yr in sorted(target_years):
        url = NAGER_HOLIDAY_API_URL.format(year=yr)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            items = json.loads(resp.read().decode("utf-8"))
        for item in items:
            if item.get("date"):
                parsed[item["date"]] = item.get("localName") or item.get("name") or "Hari Libur Nasional"
    return parsed


def get_indonesian_holidays_auto(target_years: list[int] | None = None) -> tuple[dict[str, str], dict[str, str]]:
    """
    Ambil kalender libur nasional & cuti bersama secara otomatis:
      1. Google Calendar Public Indonesian Holidays ICS (otomatis + termasuk Cuti Bersama)
      2. Fallback API date.nager.at (jika Google Calendar gagal)
      3. Cache lokal (`holidays_auto_cache.json`) & baseline SKB 3 Menteri 2023-2026 (jika offline)
    """
    global _RUNTIME_HOLIDAY_CACHE, _RUNTIME_HOLIDAY_SOURCE_INFO
    years_set = set(target_years or [2023, 2024, 2025, 2026])

    if _RUNTIME_HOLIDAY_CACHE is not None and all(
        any(d.startswith(f"{y}-") for d in _RUNTIME_HOLIDAY_CACHE) for y in years_set
    ):
        return _RUNTIME_HOLIDAY_CACHE, _RUNTIME_HOLIDAY_SOURCE_INFO

    cache_path = config.DATA_PROCESSED / "holidays_auto_cache.json"
    merged: dict[str, str] = dict(INDONESIAN_HOLIDAYS_MAP)
    source_info: dict[str, str] = {"baseline_2023_2026": "SKB 3 Menteri (Terverifikasi Offline)"}

    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            if isinstance(cached_data.get("holidays"), dict):
                merged = {**cached_data["holidays"], **merged}
        except Exception:
            pass

    api_holidays: dict[str, str] = {}
    try:
        api_holidays = _fetch_google_calendar_ics(years_set)
        if api_holidays:
            source_info["auto_api_primary"] = "Google Calendar Public ICS (id.indonesian#holiday)"
    except Exception as exc_gcal:
        source_info["auto_api_primary_warning"] = f"Google ICS offline/error: {exc_gcal}"
        try:
            api_holidays = _fetch_nager_api(years_set)
            if api_holidays:
                source_info["auto_api_fallback"] = "Nager.Date Public Holidays API (ID)"
        except Exception as exc_nager:
            source_info["auto_api_fallback_warning"] = f"Nager API offline/error: {exc_nager}"

    if api_holidays:
        # API fills any new/future years automatically, while verified SKB 3 Menteri takes precedence for 2023-2026
        merged = {**api_holidays, **merged}
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "updated_at": datetime.now().isoformat(),
                        "sources": source_info,
                        "holidays": dict(sorted(merged.items())),
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
        except Exception:
            pass

    _RUNTIME_HOLIDAY_CACHE = dict(sorted(merged.items()))
    _RUNTIME_HOLIDAY_SOURCE_INFO = source_info
    return _RUNTIME_HOLIDAY_CACHE, _RUNTIME_HOLIDAY_SOURCE_INFO

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
    "day_of_week": "Hari dalam pekan (0=Senin s.d. 6=Minggu) mengikuti jadwal praktik dokter.",
    "month": "Bulan dalam tahun (1-12) untuk menangkap variasi musiman.",
    "is_weekend": "Penanda akhir pekan (Sabtu-Minggu) saat poliklinik terjadwal berkurang/tutup.",
    "is_holiday": "Hari libur nasional atau cuti bersama menurunkan kunjungan poliklinik terjadwal.",
    "is_ramadan": "Bulan puasa Ramadan menggeser pola kunjungan rawat jalan.",
    "is_eid_period": "Periode 1-7 Syawal (Idulfitri) menurunkan drastis kunjungan reguler.",
    "lag_7": "Jumlah kunjungan pada hari yang sama 1 minggu lalu (t-7).",
    "lag_14": "Jumlah kunjungan pada hari yang sama 2 minggu lalu (t-14).",
    "lag_21": "Jumlah kunjungan pada hari yang sama 3 minggu lalu (t-21).",
    "lag_28": "Jumlah kunjungan pada hari yang sama 4 minggu lalu (t-28).",
    "rolling_mean_7d": "Rata-rata kunjungan 7 hari terakhir yang tersedia saat prediksi (t-7 s.d. t-13).",
    "rolling_mean_28d": "Rata-rata kunjungan 28 hari terakhir (t-7 s.d. t-34) sebagai jangkar tren bulanan.",
    "ewma_dow_4w": "Rata-rata tertimbang hari yang sama 4 minggu terakhir (40% lag_7 + 30% lag_14 + 20% lag_21 + 10% lag_28).",
    "ratio_ewma_dow_to_rm28": "Rasio rata-rata tertimbang hari yang sama terhadap rata-rata 28 hari.",
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
    """Add simplified calendar, automatic holiday, and Hijri features."""
    df = df_input.copy()
    date_col = "date" if "date" in df.columns else "tgl_reg"
    dates = pd.to_datetime(df[date_col])

    df["day_of_week"] = dates.dt.dayofweek
    df["month"] = dates.dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Automatic Indonesian holidays (Google Calendar ICS -> Nager API -> local cache + SKB 3 Menteri fallback)
    target_years = sorted(dates.dt.year.unique().tolist())
    holidays_map, _ = get_indonesian_holidays_auto(target_years)
    holiday_dates = set(holidays_map.keys())
    date_strs = dates.dt.strftime("%Y-%m-%d")
    df["is_holiday"] = date_strs.isin(holiday_dates).astype(int)

    # Hijri Ramadan & Eid week via hijri_converter
    ramadan_arr, eid_arr = compute_hijri_flags(dates)
    df["is_ramadan"] = ramadan_arr
    df["is_eid_period"] = eid_arr

    return df


def create_lag_and_rolling_features(
    df_input: pd.DataFrame, target_col: str = "visit_count"
) -> pd.DataFrame:
    """
    Create core lag and rolling features WITHOUT DATA LEAKAGE (shift >= 7 days).
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
    df["rolling_mean_28d"] = s_shift7.rolling(window=28, min_periods=28).mean()
    df["ewma_dow_4w"] = (
        0.40 * df["lag_7"] + 0.30 * df["lag_14"] + 0.20 * df["lag_21"] + 0.10 * df["lag_28"]
    )
    df["ratio_ewma_dow_to_rm28"] = df["ewma_dow_4w"] / (df["rolling_mean_28d"] + 1e-5)

    return df


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
    all_engineered_cols = h7_feature_cols

    print(f"\n[3] Ringkasan Fitur (Horizon H=7: {len(h7_feature_cols)} fitur):")
    print(f"  Dimensi features_total.parquet   : {df_feat_total.shape[0]} baris x {df_feat_total.shape[1]} kolom")
    print(f"  Dimensi features_by_poli.parquet : {df_feat_poli.shape[0]} baris x {df_feat_poli.shape[1]} kolom")

    out_total = config.DATA_PROCESSED / "features_total.parquet"
    out_poli = config.DATA_PROCESSED / "features_by_poli.parquet"
    out_holidays = config.DATA_PROCESSED / "holidays_2023_2026.json"
    out_summary = config.TABLES_DIR / "03_feature_summary.json"

    df_feat_total.to_parquet(out_total, index=False)
    df_feat_poli.to_parquet(out_poli, index=False)

    all_years = sorted(pd.to_datetime(df_feat_total[date_col]).dt.year.unique().tolist())
    holidays_map, auto_holiday_sources = get_indonesian_holidays_auto(all_years)
    combined_sources = {**HOLIDAY_SOURCES, **auto_holiday_sources}

    with open(out_holidays, "w", encoding="utf-8") as f:
        json.dump(
            {
                "sources": combined_sources,
                "total_dates": len(holidays_map),
                "holidays": holidays_map,
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
        "h7_feature_count": len(h7_feature_cols),
        "h7_features": h7_feature_cols,
        "excluded_non_feature_columns": [c for c in non_feature_cols if c in df_feat_total.columns],
        "holiday_sources": combined_sources,
        "holiday_dates_count_by_year": {
            str(yr): sum(1 for dt_s in holidays_map if dt_s.startswith(str(yr)))
            for yr in all_years
        },
        "features_detail": {
            col: {
                "dtype": str(df_feat_total[col].dtype),
                "null_count": int(df_feat_total[col].isna().sum()),
                "description": FEATURE_HYPOTHESES.get(col, ""),
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
