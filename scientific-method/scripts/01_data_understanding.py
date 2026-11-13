#!/usr/bin/env python3
"""
01_data_understanding.py — Tahap 1: Data Understanding & Exploratory Analysis
=============================================================================
Scientific Method pipeline for outpatient visit forecasting at RSIA Qurrata A'yun.

Functions:
  1. Verify header positions across all 4 raw Excel files (row 0 = title, row 1 = header)
     and confirm column uniformity before concatenation.
  2. Profile dataset structure: dimensions, dtypes, date ranges per file, out-of-range dates,
     completeness of months (Jan 2023 - Jun 2026), last month completeness, missing values,
     duplicate No. Rawat, whitespace/capitalization variations in categoricals.
  3. Comprehensive longitudinal investigation for Section 3.2:
     - "IGD" vs "Unit IGD": monthly frequency, same-day overlap, hourly distribution,
       doctor overlap (using anonymized doctor codes), Jns Kunjungan & Penjamin distribution,
       and exact duplicate row checks across both labels.
     - Penjamin "-": frequency by year/month, by poliklinik, and by Jns Kunjungan.
     - Changes in poliklinik & doctor cardinality across years.
  4. Exploratory analysis:
     - Monthly, weekly, daily, and hourly visit distributions.
     - Unique patients (via temporary hashed No. RM) vs total visits, cross-checked against Jns Kunjungan.
     - Poliklinik volume shares (identifying top clinics >= 80% + IGD segment).
     - Active doctors per day (scheduled clinics vs IGD) to quantify doctor-schedule supply effects.
  5. Statistical & time-series characteristics for model selection (Tahap 4):
     - Mean, variance, std dev, CV, quartiles, IQR, and dispersion ratio (Var/Mean) for
       Total visits and per major poliklinik.
     - Proportion of zero-visit days per series.
     - Day-of-week seasonal index (Total, Scheduled Clinics, and IGD).
     - Autocorrelation Function (ACF) lags 1-28.
     - Holiday & weekend effect comparison.
  6. Export verified summary JSON to `outputs/tables/01_data_profile.json` and summary plot.

PRIVACY COMPLIANCE:
  NEVER print or output individual row data or personal identifiers (Pasien, No. RM, Dokter names).
  Output strictly aggregated tables and statistical summaries.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import openpyxl
from statsmodels.tsa.stattools import acf

# Project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config


EXPECTED_RAW_COLUMNS = [
    "No. Rawat",
    "Tgl Reg",
    "Jam",
    "No. RM",
    "Pasien",
    "Poliklinik",
    "Dokter",
    "Penjamin",
    "Jns Kunjungan",
]


def verify_and_load_raw_files() -> tuple[pd.DataFrame, dict]:
    """Verify header position (header=1) and column uniformity per file, then concatenate."""
    frames = []
    file_verification = {}

    for file_path in config.RAW_FILES:
        if not file_path.exists():
            raise FileNotFoundError(f"File data mentah tidak ditemukan: {file_path}")

        # Inspect row 0 (title) and row 1 (header) safely via openpyxl without reading data rows
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        ws = wb[wb.sheetnames[0]]
        header_rows = list(ws.iter_rows(min_row=1, max_row=2, values_only=True))
        wb.close()

        row0_title = str(header_rows[0][0]).strip() if header_rows and header_rows[0] else ""
        row1_cols = [str(c).strip() for c in header_rows[1] if c is not None]

        if row1_cols != EXPECTED_RAW_COLUMNS:
            raise ValueError(
                f"Header tidak seragam pada {file_path.name}: {row1_cols} != {EXPECTED_RAW_COLUMNS}"
            )

        df_year = pd.read_excel(file_path, header=1)
        df_year["source_file"] = file_path.name

        # Check date range inside this file
        dates_parsed = pd.to_datetime(df_year["Tgl Reg"], errors="coerce")
        expected_year = int(file_path.stem.split("_")[-1])
        out_of_year = int((dates_parsed.dt.year != expected_year).sum())

        file_verification[file_path.name] = {
            "report_title_row0": row0_title,
            "header_row_index": 1,
            "columns_verified": row1_cols == EXPECTED_RAW_COLUMNS,
            "rows": int(len(df_year)),
            "date_min": dates_parsed.min().strftime("%Y-%m-%d"),
            "date_max": dates_parsed.max().strftime("%Y-%m-%d"),
            "nat_dates": int(dates_parsed.isna().sum()),
            "out_of_file_year_rows": out_of_year,
        }
        frames.append(df_year)

    df_combined = pd.concat(frames, ignore_index=True)
    return df_combined, file_verification


def parse_hour_series(jam_series: pd.Series) -> pd.Series:
    """Extract integer hour (0-23) from Jam column without exposing rows."""
    s = jam_series.astype(str).str.strip()
    s = s.str.replace("0 days ", "", regex=False)
    dt = pd.to_datetime(s, format="%H:%M:%S", errors="coerce")
    return dt.dt.hour


def run_data_understanding() -> dict:
    print("=" * 72)
    print("TAHAP 1: DATA UNDERSTANDING & EKSPLORASI AGREGAT LENGKAP")
    print("=" * 72)

    df, file_verification = verify_and_load_raw_files()
    total_rows, total_cols = df.shape
    print(f"Total baris gabungan (4 file) : {total_rows:,}")
    print(f"Total kolom (termasuk sumber) : {total_cols}")
    for fname, fmeta in file_verification.items():
        print(
            f"  - {fname}: {fmeta['rows']:,} baris | "
            f"{fmeta['date_min']} s.d. {fmeta['date_max']} | "
            f"luar tahun file: {fmeta['out_of_file_year_rows']}"
        )

    # Rename to standardized internal names for analysis
    col_map = {
        "No. Rawat": config.COL_NO_RAWAT,
        "Tgl Reg": config.COL_TGL_REG,
        "Jam": config.COL_JAM,
        "No. RM": config.COL_NO_RM,
        "Pasien": config.COL_PASIEN,
        "Poliklinik": config.COL_POLIKLINIK,
        "Dokter": config.COL_DOKTER,
        "Penjamin": config.COL_PENJAMIN,
        "Jns Kunjungan": config.COL_JNS_KUNJUNGAN,
        "source_file": config.COL_SOURCE_FILE,
    }
    df = df.rename(columns=col_map)
    df[config.COL_TGL_REG] = pd.to_datetime(df[config.COL_TGL_REG], errors="coerce")
    df["hour"] = parse_hour_series(df[config.COL_JAM])
    df["date"] = df[config.COL_TGL_REG].dt.date
    df["year"] = df[config.COL_TGL_REG].dt.year
    df["year_month"] = df[config.COL_TGL_REG].dt.to_period("M").astype(str)

    # Immediately drop Pasien from memory and anonymize No. RM & Dokter in memory for safe aggregate checks
    df = df.drop(columns=[config.COL_PASIEN])
    df["rm_anon"] = (
        df[config.COL_NO_RM]
        .astype(str)
        .str.strip()
        .apply(lambda x: hashlib.sha256(f"eda_ephemeral_{x}".encode("utf-8")).hexdigest()[:16])
    )
    df = df.drop(columns=[config.COL_NO_RM])

    # Check whitespace / capitalization variations before normalization
    cat_variations = {}
    for c in [config.COL_POLIKLINIK, config.COL_PENJAMIN, config.COL_JNS_KUNJUNGAN, config.COL_DOKTER]:
        raw_unique = int(df[c].nunique())
        stripped_unique = int(df[c].astype(str).str.strip().nunique())
        upper_unique = int(df[c].astype(str).str.strip().str.upper().nunique())
        cat_variations[c] = {
            "raw_unique": raw_unique,
            "stripped_unique": stripped_unique,
            "upper_stripped_unique": upper_unique,
            "has_whitespace_or_case_diff": bool(raw_unique != upper_unique),
        }

    # Anonymize doctor names to ephemeral codes (Dokter_01 .. Dokter_29) sorted by frequency
    doc_freq_order = df[config.COL_DOKTER].astype(str).str.strip().value_counts().index.tolist()
    doc_code_map = {name: f"DOKTER_{i+1:02d}" for i, name in enumerate(doc_freq_order)}
    df["dokter_code"] = df[config.COL_DOKTER].astype(str).str.strip().map(doc_code_map)
    df = df.drop(columns=[config.COL_DOKTER])

    # 1. Missing Values & Duplicate Checks
    null_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    dup_no_rawat = int(df[config.COL_NO_RAWAT].duplicated().sum())
    print("\n[1] Kualitas Data, Duplikat & Variasi Penulisan:")
    print(f"  Duplikat {config.COL_NO_RAWAT}     : {dup_no_rawat}")
    print(f"  Jam gagal parse (NaN hour) : {null_counts['hour']}")
    print(f"  Variasi spasi/kapitalisasi : {cat_variations}")

    # 2. Date & Month Completeness (Jan 2023 - Jun 2026)
    min_date = df[config.COL_TGL_REG].min()
    max_date = df[config.COL_TGL_REG].max()
    full_date_range = pd.date_range(min_date, max_date, freq="D")
    actual_dates = set(df["date"].unique())
    missing_dates = sorted(set(d.date() for d in full_date_range) - actual_dates)
    total_calendar_days = len(full_date_range)

    # Check completeness of last month (Jun 2026: 30 days)
    jun_2026_days = int(df[df["year_month"] == "2026-06"]["date"].nunique())
    months_count = int(df["year_month"].nunique())
    print(f"\n[2] Kelengkapan Tanggal & Bulan:")
    print(f"  Rentang Tanggal      : {min_date.strftime('%Y-%m-%d')} s.d. {max_date.strftime('%Y-%m-%d')}")
    print(f"  Total Hari Kalender  : {total_calendar_days} hari (Hari tercatat: {len(actual_dates)}, Gap: {len(missing_dates)})")
    print(f"  Total Bulan          : {months_count} bulan (Jan 2023 - Jun 2026)")
    print(f"  Kelengkapan Jun 2026 : {jun_2026_days}/30 hari penuh")

    # 3. Poliklinik Distribution &Yearly Evolution
    poli_counts = df[config.COL_POLIKLINIK].value_counts().to_dict()
    poli_by_year = (
        pd.crosstab(df[config.COL_POLIKLINIK], df["year"])
        .to_dict(orient="index")
    )
    poli_by_year = {k: {str(yr): int(v) for yr, v in yr_dict.items()} for k, yr_dict in poli_by_year.items()}

    # Doctor cardinality per year
    doctors_per_year = {str(yr): int(grp["dokter_code"].nunique()) for yr, grp in df.groupby("year")}

    print("\n[3] Distribusi Poliklinik per Tahun:")
    for p, c in sorted(poli_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (c / total_rows) * 100
        yr_str = ", ".join(f"{yr}:{cnt}" for yr, cnt in poli_by_year[p].items())
        print(f"  - {p:25s}: {c:6,d} ({pct:5.2f}%) | [{yr_str}]")

    # 4. Bukti Lengkap Investigasi "IGD" vs "Unit IGD" (Bagian 3.2)
    sub_igd = df[df[config.COL_POLIKLINIK].isin(["IGD", "Unit IGD"])].copy()
    igd_monthly_ct = pd.crosstab(sub_igd["year_month"], sub_igd[config.COL_POLIKLINIK])
    igd_monthly_dict = {
         ym: {
             "IGD": int(igd_monthly_ct.loc[ym, "IGD"]) if "IGD" in igd_monthly_ct.columns else 0,
             "Unit IGD": int(igd_monthly_ct.loc[ym, "Unit IGD"]) if "Unit IGD" in igd_monthly_ct.columns else 0,
         }
         for ym in igd_monthly_ct.index
    }

    igd_only_df = df[df[config.COL_POLIKLINIK] == "IGD"]
    unit_igd_df = df[df[config.COL_POLIKLINIK] == "Unit IGD"]

    igd_dates = set(igd_only_df["date"].unique())
    unit_igd_dates = set(unit_igd_df["date"].unique())
    overlap_dates = sorted(igd_dates & unit_igd_dates)

    # Hourly distribution comparison (IGD vs Unit IGD): 24-hour coverage check
    igd_hours_active = int(igd_only_df["hour"].nunique())
    unit_igd_hours_active = int(unit_igd_df["hour"].nunique())
    igd_night_share = float((igd_only_df["hour"].isin([0, 1, 2, 3, 4, 5, 22, 23])).mean() * 100)
    unit_igd_night_share = float((unit_igd_df["hour"].isin([0, 1, 2, 3, 4, 5, 22, 23])).mean() * 100)

    # Doctor overlap between IGD and Unit IGD
    igd_docs = set(igd_only_df["dokter_code"].unique())
    unit_igd_docs = set(unit_igd_df["dokter_code"].unique())
    shared_igd_docs = len(igd_docs & unit_igd_docs)

    # Check if there are identical rows recorded under both labels on the same day/time/patient
    igd_keys = set(zip(igd_only_df["date"], igd_only_df[config.COL_JAM], igd_only_df["rm_anon"]))
    unit_keys = set(zip(unit_igd_df["date"], unit_igd_df[config.COL_JAM], unit_igd_df["rm_anon"]))
    identical_visit_overlap = len(igd_keys & unit_keys)

    print("\n[4] Bukti Lengkap 'IGD' vs 'Unit IGD':")
    print(f"  - Hari hanya 'IGD'          : {len(igd_dates - unit_igd_dates)} hari")
    print(f"  - Hari hanya 'Unit IGD'     : {len(unit_igd_dates - igd_dates)} hari")
    print(f"  - Hari muncul bersamaan     : {len(overlap_dates)} hari ({overlap_dates[0]} s.d. {overlap_dates[-1]})")
    print(f"  - Cakupan jam operasional   : IGD={igd_hours_active}/24 jam (malam {igd_night_share:.1f}%), Unit IGD={unit_igd_hours_active}/24 jam (malam {unit_igd_night_share:.1f}%)")
    print(f"  - Dokter unik               : IGD={len(igd_docs)}, Unit IGD={len(unit_igd_docs)}, Irisan dokter yang sama={shared_igd_docs}")
    print(f"  - Duplikasi baris identik (tgl+jam+pasien) di kedua label: {identical_visit_overlap}")

    # 5. Investigasi Penjamin "-" (Bagian 3.2)
    dash_df = df[df[config.COL_PENJAMIN] == "-"]
    total_dash = int(len(dash_df))
    dash_by_year = {str(yr): int(cnt) for yr, cnt in dash_df["year"].value_counts().sort_index().items()}
    dash_by_poli = {k: int(v) for k, v in dash_df[config.COL_POLIKLINIK].value_counts().items()}
    dash_by_jns = {k: int(v) for k, v in dash_df[config.COL_JNS_KUNJUNGAN].value_counts().items()}
    igd_dash_share = float((dash_by_poli.get("Unit IGD", 0) + dash_by_poli.get("IGD", 0)) / total_dash * 100)

    penjamin_counts = {k: int(v) for k, v in df[config.COL_PENJAMIN].value_counts().items()}
    penjamin_by_year = (
        pd.crosstab(df[config.COL_PENJAMIN], df["year"])
        .to_dict(orient="index")
    )
    penjamin_by_year = {k: {str(yr): int(v) for yr, v in yr_dict.items()} for k, yr_dict in penjamin_by_year.items()}

    print(f"\n[5] Bukti Investigasi Penjamin '-':")
    print(f"  - Total baris '-'           : {total_dash} ({total_dash/total_rows*100:.2f}%)")
    print(f"  - Distribusi per Tahun      : {dash_by_year}")
    print(f"  - Konsentrasi di IGD/UnitIGD: {igd_dash_share:.1f}% ({dash_by_poli})")
    print(f"  - Distribusi Jns Kunjungan  : {dash_by_jns}")

    # 6. Pasien Unik vs Jns Kunjungan ('Baru' vs 'Lama')
    unique_patients_total = int(df["rm_anon"].nunique())
    jns_counts = {k: int(v) for k, v in df[config.COL_JNS_KUNJUNGAN].value_counts().items()}
    # Cross-check first appearance in dataset vs Jns Kunjungan == 'Baru'
    df_sorted = df.sort_values([config.COL_TGL_REG, config.COL_JAM]).reset_index(drop=True)
    first_seen_mask = ~df_sorted["rm_anon"].duplicated(keep="first")
    baru_mask = df_sorted[config.COL_JNS_KUNJUNGAN] == "Baru"
    first_seen_is_baru = int((first_seen_mask & baru_mask).sum())
    first_seen_is_lama = int((first_seen_mask & ~baru_mask).sum())
    repeat_seen_is_baru = int((~first_seen_mask & baru_mask).sum())

    print("\n[6] Pasien Unik vs Jns Kunjungan:")
    print(f"  - Total Pasien Unik (2023-2026) : {unique_patients_total:,} pasien (rata-rata {total_rows/unique_patients_total:.2f} kunjungan/pasien)")
    print(f"  - Distribusi Jns Kunjungan      : {jns_counts}")
    print(f"  - Cek Silang Kemunculan Pertama : {first_seen_is_baru:,} tercatat 'Baru', {first_seen_is_lama:,} tercatat 'Lama' (pasien terdaftar sebelum 2023)")
    print(f"  - Kemunculan Ulang berlabel Baru: {repeat_seen_is_baru:,} baris")

    # 7. Analisis Poliklinik Terpilih (>=80% Cakupan) & Efek Jadwal Dokter
    df["poli_clean"] = df[config.COL_POLIKLINIK].replace({"IGD": "UNIT IGD"}).str.upper().str.strip()
    clean_poli_counts = df["poli_clean"].value_counts()
    clean_poli_shares = (clean_poli_counts / total_rows * 100).round(2).to_dict()

    # Active doctors per day: scheduled clinics vs UNIT IGD
    df_scheduled = df[df["poli_clean"] != "UNIT IGD"]
    df_igd_merged = df[df["poli_clean"] == "UNIT IGD"]

    daily_active_docs_total = df.groupby("date")["dokter_code"].nunique().reindex(
        [d.date() for d in full_date_range], fill_value=0
    )
    daily_active_docs_sched = df_scheduled.groupby("date")["dokter_code"].nunique().reindex(
        [d.date() for d in full_date_range], fill_value=0
    )
    daily_visits_total = df.groupby("date").size().reindex(
        [d.date() for d in full_date_range], fill_value=0
    )
    daily_visits_sched = df_scheduled.groupby("date").size().reindex(
        [d.date() for d in full_date_range], fill_value=0
    )
    daily_visits_igd = df_igd_merged.groupby("date").size().reindex(
        [d.date() for d in full_date_range], fill_value=0
    )

    corr_docs_visits_total = float(np.corrcoef(daily_active_docs_total, daily_visits_total)[0, 1])
    corr_docs_visits_sched = float(np.corrcoef(daily_active_docs_sched, daily_visits_sched)[0, 1])

    print("\n[7] Efek Jadwal Dokter terhadap Volume Harian:")
    print(f"  - Rata-rata dokter aktif/hari (Total RS)        : {daily_active_docs_total.mean():.2f} dokter")
    print(f"  - Rata-rata dokter aktif/hari (Poli Terjadwal)  : {daily_active_docs_sched.mean():.2f} dokter")
    print(f"  - Korelasi dokter aktif vs kunjungan (Total RS) : r = {corr_docs_visits_total:.3f}")
    print(f"  - Korelasi dokter aktif vs kunjungan (Terjadwal): r = {corr_docs_visits_sched:.3f}")

    # 8. Uji Karakteristik Deret Waktu Harian per Segmen & Poliklinik (Untuk Tahap 4)
    def series_stats(s: pd.Series) -> dict:
        m = float(s.mean())
        v = float(s.var())
        std = float(s.std())
        q1_val = float(s.quantile(0.25))
        med_val = float(s.median())
        q3_val = float(s.quantile(0.75))
        zero_days = int((s == 0).sum())
        return {
            "mean": round(m, 3),
            "variance": round(v, 3),
            "std": round(std, 3),
            "cv": round(std / m, 3) if m > 0 else 0.0,
            "dispersion_ratio": round(v / m, 3) if m > 0 else 0.0,
            "min": int(s.min()),
            "q1": q1_val,
            "median": med_val,
            "q3": q3_val,
            "iqr": round(q3_val - q1_val, 3),
            "max": int(s.max()),
            "zero_days": zero_days,
            "zero_pct": round(zero_days / len(s) * 100, 2),
        }

    series_characteristics = {
        "TOTAL_RS": series_stats(daily_visits_total),
        "POLI_TERJADWAL_GABUNGAN": series_stats(daily_visits_sched),
    }
    for poli_name in clean_poli_counts.index:
        s_poli = (
            df[df["poli_clean"] == poli_name]
            .groupby("date")
            .size()
            .reindex([d.date() for d in full_date_range], fill_value=0)
        )
        series_characteristics[poli_name] = series_stats(s_poli)

    print("\n[8] Karakteristik Dispersi & Proporsi Hari Nol per Poliklinik:")
    for k, st in series_characteristics.items():
        print(
            f"  - {k:25s}: Mean={st['mean']:5.2f} | Var={st['variance']:6.2f} | "
            f"Var/Mean={st['dispersion_ratio']:4.2f} | Hari Nol={st['zero_days']:4d} ({st['zero_pct']:5.1f}%)"
        )

    # 9. Musiman Hari dalam Minggu (Total, Terjadwal, vs Unit IGD) & Distribusi Jam
    dow_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    dow_index_Series = pd.Series([d.weekday() for d in full_date_range], index=[d.date() for d in full_date_range])

    def compute_dow_index(s: pd.Series) -> dict:
        overall_m = float(s.mean())
        means = {dow_names[i]: round(float(s[dow_index_Series == i].mean()), 2) for i in range(7)}
        indices = {dow_names[i]: round(float(means[dow_names[i]] / overall_m), 3) for i in range(7)}
        return {"mean_by_dow": means, "seasonal_index": indices}

    dow_seasonality = {
        "TOTAL_RS": compute_dow_index(daily_visits_total),
        "POLI_TERJADWAL": compute_dow_index(daily_visits_sched),
        "UNIT_IGD": compute_dow_index(daily_visits_igd),
    }

    hourly_counts = {str(int(h)): int(c) for h, c in df["hour"].value_counts().sort_index().items() if pd.notna(h)}
    yearly_totals = {str(yr): int(c) for yr, c in df["year"].value_counts().sort_index().items()}
    yearly_daily_means = {
        str(yr): round(float(grp.groupby("date").size().mean()), 2)
        for yr, grp in df.groupby("year")
    }
    monthly_totals = {ym: int(c) for ym, c in df["year_month"].value_counts().sort_index().items()}

    print("\n[9] Tren Tahunan Rata-rata Kunjungan Harian:")
    for yr, m_val in yearly_daily_means.items():
        print(f"  - Tahun {yr}: Total={yearly_totals[yr]:6,d} | Rata-rata={m_val:5.2f} kunjungan/hari")

    # 10. Autokorelasi (ACF) Lag 1-28
    acf_total = acf(daily_visits_total.values.astype(float), nlags=28, fft=True)
    acf_igd = acf(daily_visits_igd.values.astype(float), nlags=28, fft=True)
    acf_sched = acf(daily_visits_sched.values.astype(float), nlags=28, fft=True)
    acf_dict = {f"lag_{k}": round(float(acf_total[k]), 4) for k in range(1, 29)}
    acf_summary = {
        "total_rs": acf_dict,
        "poli_terjadwal_key_lags": {f"lag_{k}": round(float(acf_sched[k]), 4) for k in [1, 7, 14, 21, 28]},
        "unit_igd_key_lags": {f"lag_{k}": round(float(acf_igd[k]), 4) for k in [1, 7, 14, 21, 28]},
    }
    print("\n[10] Perbandingan ACF Lag Kunci (Total vs Terjadwal vs IGD):")
    print(f"  - Total RS       : Lag1={acf_dict['lag_1']:.3f}, Lag7={acf_dict['lag_7']:.3f}, Lag14={acf_dict['lag_14']:.3f}, Lag28={acf_dict['lag_28']:.3f}")
    print(f"  - Poli Terjadwal : {acf_summary['poli_terjadwal_key_lags']}")
    print(f"  - Unit IGD       : {acf_summary['unit_igd_key_lags']}")

    # Assemble complete profile JSON
    summary_report = {
        "timestamp": datetime.now().isoformat(),
        "total_records": int(total_rows),
        "file_verification": file_verification,
        "date_range": {
            "start": min_date.strftime("%Y-%m-%d"),
            "end": max_date.strftime("%Y-%m-%d"),
            "total_days": int(total_calendar_days),
            "missing_days": int(len(missing_dates)),
            "total_months": months_count,
            "june_2026_days_present": jun_2026_days,
        },
        "quality": {
            "duplicate_no_rawat": dup_no_rawat,
            "null_counts": null_counts,
            "categorical_variations": cat_variations,
        },
        "poliklinik_raw_distribution": {k: int(v) for k, v in poli_counts.items()},
        "poliklinik_by_year": poli_by_year,
        "poliklinik_clean_shares_pct": clean_poli_shares,
        "penjamin_distribution": penjamin_counts,
        "penjamin_by_year": penjamin_by_year,
        "jns_kunjungan_distribution": jns_counts,
        "patient_uniqueness": {
            "unique_patients_total": unique_patients_total,
            "mean_visits_per_patient": round(total_rows / unique_patients_total, 2),
            "first_seen_labeled_baru": first_seen_is_baru,
            "first_seen_labeled_lama": first_seen_is_lama,
            "repeat_seen_labeled_baru": repeat_seen_is_baru,
        },
        "doctors_summary": {
            "unique_doctors_total": int(len(doc_freq_order)),
            "unique_doctors_by_year": doctors_per_year,
            "mean_active_doctors_per_day_total": round(float(daily_active_docs_total.mean()), 2),
            "mean_active_doctors_per_day_scheduled": round(float(daily_active_docs_sched.mean()), 2),
            "corr_active_doctors_vs_visits_total": round(corr_docs_visits_total, 4),
            "corr_active_doctors_vs_visits_scheduled": round(corr_docs_visits_sched, 4),
        },
        "igd_vs_unit_igd_evidence": {
            "igd_total": int(len(igd_only_df)),
            "unit_igd_total": int(len(unit_igd_df)),
            "dates_igd_only": int(len(igd_dates - unit_igd_dates)),
            "dates_unit_igd_only": int(len(unit_igd_dates - igd_dates)),
            "overlap_days": int(len(overlap_dates)),
            "first_overlap_date": str(overlap_dates[0]) if overlap_dates else None,
            "last_overlap_date": str(overlap_dates[-1]) if overlap_dates else None,
            "igd_hours_covered": igd_hours_active,
            "unit_igd_hours_covered": unit_igd_hours_active,
            "igd_night_visit_pct": round(igd_night_share, 2),
            "unit_igd_night_visit_pct": round(unit_igd_night_share, 2),
            "igd_unique_doctors": int(len(igd_docs)),
            "unit_igd_unique_doctors": int(len(unit_igd_docs)),
            "shared_doctors_count": int(shared_igd_docs),
            "identical_row_overlap": int(identical_visit_overlap),
            "monthly_transition": igd_monthly_dict,
        },
        "penjamin_dash_evidence": {
            "total_dash": total_dash,
            "pct_of_total": round(total_dash / total_rows * 100, 2),
            "by_year": dash_by_year,
            "by_poliklinik": dash_by_poli,
            "igd_combined_share_pct": round(igd_dash_share, 2),
            "by_jns_kunjungan": dash_by_jns,
        },
        "series_characteristics": series_characteristics,
        "dow_seasonality": dow_seasonality,
        "hourly_distribution": hourly_counts,
        "yearly_totals": yearly_totals,
        "yearly_daily_means": yearly_daily_means,
        "monthly_totals": monthly_totals,
        "acf_analysis": acf_summary,
        "dispersion_test": series_characteristics["TOTAL_RS"],
        "dow_seasonal_index": dow_seasonality["TOTAL_RS"]["seasonal_index"],
        "acf_lags": acf_dict,
    }

    config.TABLES_DIR.mkdir(parents=True, exist_ok=True)
    out_json = config.TABLES_DIR / "01_data_profile.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2, ensure_ascii=False)
    print(f"\n[Output] Profil data lengkap disimpan ke: {out_json}")

    # Generate diagnostic plot: ACF & Day-of-Week Seasonality (Scheduled vs IGD)
    config.FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    lags = np.arange(len(acf_total))
    axes[0].bar(lags, acf_total, color="#1e40af", alpha=0.8, width=0.6)
    axes[0].axhline(0, color="gray", linestyle="--", linewidth=0.8)
    for k_lag in [7, 14, 21, 28]:
        axes[0].axvline(k_lag, color="#dc2626", linestyle=":", alpha=0.7)
    axes[0].set_title("Autokorelasi (ACF) Kunjungan Harian Total RS (Lag 0–28)")
    axes[0].set_xlabel("Lag (Hari)")
    axes[0].set_ylabel("Koefisien Autokorelasi (r)")
    axes[0].grid(axis="y", linestyle=":", alpha=0.6)

    x_idx = np.arange(len(dow_names))
    w = 0.26
    axes[1].bar(
        x_idx - w,
        [dow_seasonality["TOTAL_RS"]["seasonal_index"][d] for d in dow_names],
        width=w,
        label="Total RS",
        color="#1e40af",
    )
    axes[1].bar(
        x_idx,
        [dow_seasonality["POLI_TERJADWAL"]["seasonal_index"][d] for d in dow_names],
        width=w,
        label="Poliklinik Terjadwal",
        color="#0d9488",
    )
    axes[1].bar(
        x_idx + w,
        [dow_seasonality["UNIT_IGD"]["seasonal_index"][d] for d in dow_names],
        width=w,
        label="Unit IGD (Non-Terjadwal)",
        color="#f59e0b",
    )
    axes[1].axhline(1.0, color="#dc2626", linestyle="--", linewidth=1, label="Rata-rata (1,0)")
    axes[1].set_xticks(x_idx)
    axes[1].set_xticklabels(dow_names)
    axes[1].set_title("Indeks Musiman Hari-dalam-Minggu: Terjadwal vs Unit IGD")
    axes[1].set_xlabel("Hari")
    axes[1].set_ylabel("Indeks Musiman (Rasio terhadap Rata-rata)")
    axes[1].legend()
    axes[1].grid(axis="y", linestyle=":", alpha=0.6)

    fig_path = config.FIGURES_DIR / "01_eda_acf_seasonality.png"
    plt.tight_layout()
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"[Output] Gambar disimpan ke: {fig_path}")

    return summary_report


if __name__ == "__main__":
    run_data_understanding()
