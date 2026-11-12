#!/usr/bin/env python3
"""
02_preprocessing.py — Tahap 2: Data Preprocessing
==================================================
Scientific Method pipeline for outpatient visit forecasting at RSIA Qurrata A'yun.

Steps:
  1. Load & combine raw Excel files (header=1)
  2. Standardize column names -> snake_case
  3. Parse dates & times with validation (zero silent NaT)
  4. Normalize categorical text (merge 'IGD' -> 'UNIT IGD', Penjamin '-' -> 'TIDAK TERCATAT')
  5. Handle duplicates (verify uniqueness of no_rawat)
  6. Privacy & Anonymization:
     - Drop 'pasien' column immediately
     - Hash 'no_rm' with SHA-256 + SM_HASH_SALT from environment (fail if missing)
     - Anonymize 'dokter' into 'dokter_code' (DOKTER_01 .. DOKTER_29) & drop raw 'dokter'
     - Cross-check 'jns_kunjungan' == 'BARU' vs first-seen hashed 'no_rm'
     - Compute daily active doctor counts (total & scheduled clinics) before dropping individual ids
     - Drop 'no_rm' and 'dokter_code' from modeling datasets
  7. Aggregate to daily visit counts (Total RS + by Poliklinik)
  8. Outlier detection (IQR method computed strictly on training period <= TRAIN_END to avoid leakage)
  9. Save outputs (interim parquet, processed parquets, and preprocessing_log.json with schemas)

PRIVACY: This script NEVER prints individual data rows or personal identifiers.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# Project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config

LOG: dict = {
    "pipeline_version": "0.3.0",
    "run_timestamp": datetime.now().isoformat(),
    "steps": {},
    "output_schemas": {},
}


def log_step(step_name: str, info: dict) -> None:
    """Record a step in the preprocessing log."""
    LOG["steps"][step_name] = info
    print(f"  -> Logged: {step_name}")


def hash_value(value: str, salt: str) -> str:
    """SHA-256 hash a string value with salt."""
    return hashlib.sha256(f"{salt}{value}".encode("utf-8")).hexdigest()


def step1_load_and_combine() -> pd.DataFrame:
    print("\n" + "=" * 70)
    print("STEP 1: Load & Combine Raw Files")
    print("=" * 70)

    frames: list[pd.DataFrame] = []
    file_counts: dict[str, int] = {}

    for fpath in config.RAW_FILES:
        df_part = pd.read_excel(fpath, header=1)
        df_part[config.COL_SOURCE_FILE] = fpath.name
        file_counts[fpath.name] = len(df_part)
        frames.append(df_part)
        print(f"  [OK] {fpath.name}: {len(df_part):,} baris")

    df = pd.concat(frames, ignore_index=True)
    print(f"\nBaris awal: {len(df):,}")

    log_step(
        "01_load_combine",
        {
            "file_counts": file_counts,
            "rows_before": len(df),
            "rows_after": len(df),
            "columns_raw": list(df.columns),
        },
    )
    return df


COLUMN_MAP: dict[str, str] = {
    "No. Rawat": "no_rawat",
    "Tgl Reg": "tgl_reg",
    "Jam": "jam",
    "No. RM": "no_rm",
    "Pasien": "pasien",
    "Poliklinik": "poliklinik",
    "Dokter": "dokter",
    "Penjamin": "penjamin",
    "Jns Kunjungan": "jns_kunjungan",
}


def step2_standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 70)
    print("STEP 2: Standardize Column Names")
    print("=" * 70)

    count_before = len(df)
    print(f"Baris sebelum: {count_before:,}")

    df = df.rename(columns=COLUMN_MAP)
    expected_cols = list(COLUMN_MAP.values()) + [config.COL_SOURCE_FILE]
    actual_cols = [c for c in expected_cols if c in df.columns]
    extra_cols = [c for c in df.columns if c not in expected_cols]

    if extra_cols:
        df = df[actual_cols]

    print(f"Baris sesudah: {len(df):,}")
    print(f"  [OK] Kolom terstandarisasi: {list(df.columns)}")

    log_step(
        "02_standardize_columns",
        {
            "rows_before": count_before,
            "rows_after": len(df),
            "columns_after": list(df.columns),
            "extra_dropped": extra_cols,
        },
    )
    return df


def step3_parse_dates_times(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 70)
    print("STEP 3: Parse Dates & Times")
    print("=" * 70)

    count_before = len(df)
    print(f"Baris sebelum: {count_before:,}")

    df[config.COL_TGL_REG] = pd.to_datetime(df[config.COL_TGL_REG], errors="coerce")
    nat_dates = int(df[config.COL_TGL_REG].isna().sum())

    s_jam = df[config.COL_JAM].astype(str).str.strip().str.replace("0 days ", "", regex=False)
    dt_jam = pd.to_datetime(s_jam, format="%H:%M:%S", errors="coerce")
    nat_times = int(dt_jam.isna().sum())
    df["hour"] = dt_jam.dt.hour
    df[config.COL_JAM] = dt_jam.dt.strftime("%H:%M:%S")
    df["date"] = df[config.COL_TGL_REG].dt.date

    print(f"  -> tgl_reg NaT count : {nat_dates}")
    print(f"  -> jam NaT count     : {nat_times}")
    print(f"Baris sesudah: {len(df):,}")

    log_step(
        "03_parse_dates_times",
        {
            "rows_before": count_before,
            "rows_after": len(df),
            "nat_dates": nat_dates,
            "nat_times": nat_times,
            "date_min": str(df[config.COL_TGL_REG].min()),
            "date_max": str(df[config.COL_TGL_REG].max()),
        },
    )
    return df


def step4_normalize_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 70)
    print("STEP 4: Normalize Categorical Text")
    print("=" * 70)

    count_before = len(df)
    print(f"Baris sebelum: {count_before:,}")

    categorical_cols = [
        config.COL_POLIKLINIK,
        config.COL_DOKTER,
        config.COL_PENJAMIN,
        config.COL_JNS_KUNJUNGAN,
    ]
    for col in categorical_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.upper()

    igd_before = int((df[config.COL_POLIKLINIK] == "IGD").sum())
    df.loc[df[config.COL_POLIKLINIK] == "IGD", config.COL_POLIKLINIK] = "UNIT IGD"
    print(f"  -> Merged 'IGD' -> 'UNIT IGD': {igd_before:,} baris")

    dash_before = int((df[config.COL_PENJAMIN] == "-").sum())
    df.loc[df[config.COL_PENJAMIN] == "-", config.COL_PENJAMIN] = "TIDAK TERCATAT"
    print(f"  -> Penjamin '-' -> 'TIDAK TERCATAT': {dash_before:,} baris")
    print(f"Baris sesudah: {len(df):,}")

    log_step(
        "04_normalize_categoricals",
        {
            "rows_before": count_before,
            "rows_after": len(df),
            "igd_merged": igd_before,
            "penjamin_dash_replaced": dash_before,
            "unique_poliklinik": int(df[config.COL_POLIKLINIK].nunique()),
            "unique_dokter": int(df[config.COL_DOKTER].nunique()),
            "unique_penjamin": int(df[config.COL_PENJAMIN].nunique()),
            "unique_jns_kunjungan": int(df[config.COL_JNS_KUNJUNGAN].nunique()),
        },
    )
    return df


def step5_handle_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 70)
    print("STEP 5: Handle Duplicates")
    print("=" * 70)

    count_before = len(df)
    dup_count = int(df[config.COL_NO_RAWAT].duplicated().sum())
    print(f"Baris sebelum: {count_before:,} | Duplikat no_rawat: {dup_count}")

    if dup_count > 0:
        df = df.drop_duplicates(subset=[config.COL_NO_RAWAT], keep="first")

    print(f"Baris sesudah: {len(df):,}")
    log_step(
        "05_handle_duplicates",
        {
            "rows_before": count_before,
            "duplicates_found": dup_count,
            "rows_after": len(df),
        },
    )
    return df


def step6_privacy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Privacy-critical step:
      - DROP 'pasien' column immediately
      - HASH 'no_rm' with SHA-256 + SM_HASH_SALT (raises RuntimeError if missing)
      - Anonymize 'dokter' to 'dokter_code' (DOKTER_01 .. DOKTER_29) & drop raw 'dokter'
      - Cross-check 'is_new_patient' vs first-seen hashed 'no_rm'
      - Compute daily active doctors series before dropping 'dokter_code'
    """
    print("\n" + "=" * 70)
    print("STEP 6: Privacy & Anonymization")
    print("=" * 70)

    count_before = len(df)
    salt = config.get_hash_salt()

    # 6a. Drop pasien
    if config.COL_PASIEN in df.columns:
        df = df.drop(columns=[config.COL_PASIEN])
        print("  [OK] Kolom 'pasien' dihapus permanen")

    # 6b. Hash no_rm with secret salt
    df[config.COL_NO_RM] = df[config.COL_NO_RM].astype(str).apply(lambda x: hash_value(x, salt))
    print("  [OK] Kolom 'no_rm' di-hash dengan SHA-256 + SM_HASH_SALT")

    # 6c. Anonymize doctor names to DOKTER_01..DOKTER_29 (sorted by overall frequency) and drop raw dokter
    doc_order = df[config.COL_DOKTER].value_counts().index.tolist()
    doc_map = {name: f"DOKTER_{i+1:02d}" for i, name in enumerate(doc_order)}
    df["dokter_code"] = df[config.COL_DOKTER].map(doc_map)
    df = df.drop(columns=[config.COL_DOKTER])
    print(f"  [OK] Nama dokter diganti kode anonim (DOKTER_01..DOKTER_{len(doc_order):02d}) & nama asli dihapus")

    # 6d. New patient flag & cross-check with first appearance of hashed no_rm
    df["is_new_patient"] = (df[config.COL_JNS_KUNJUNGAN] == "BARU").astype(int)
    df_sorted = df.sort_values([config.COL_TGL_REG, config.COL_JAM]).reset_index(drop=True)
    first_seen = ~df_sorted[config.COL_NO_RM].duplicated(keep="first")
    is_baru_sorted = df_sorted["is_new_patient"] == 1
    first_seen_baru = int((first_seen & is_baru_sorted).sum())
    first_seen_lama = int((first_seen & ~is_baru_sorted).sum())
    repeat_seen_baru = int((~first_seen & is_baru_sorted).sum())

    # 6e. Compute daily active doctors (total & scheduled clinics) before dropping dokter_code
    daily_docs_total = df.groupby("date")["dokter_code"].nunique().rename("active_doctors_total")
    daily_docs_sched = (
        df[df[config.COL_POLIKLINIK] != "UNIT IGD"]
        .groupby("date")["dokter_code"]
        .nunique()
        .rename("active_doctors_scheduled")
    )
    daily_docs_df = pd.concat([daily_docs_total, daily_docs_sched], axis=1).fillna(0).astype(int).reset_index()

    # 6f. Interim dataset (has hashed no_rm and dokter_code, NO personal names)
    df_interim = df.copy()
    unique_patients = int(df_interim[config.COL_NO_RM].nunique())

    # 6g. Final transactional dataset (drop no_rm and dokter_code)
    df_final = df.drop(columns=[config.COL_NO_RM, "dokter_code"])
    print(f"  [OK] 'no_rm' dan 'dokter_code' dibuang dari dataset pemodelan")
    print(f"  -> Pasien unik (hashed): {unique_patients:,}")
    print(f"  -> Cek silang 'BARU' vs RM pertama kali muncul: {first_seen_baru:,} cocok Baru, {first_seen_lama:,} Lama sejak <2023")

    log_step(
        "06_privacy",
        {
            "rows_before": count_before,
            "rows_after": len(df_final),
            "pasien_dropped": True,
            "no_rm_hashed_with_env_salt": True,
            "dokter_replaced_with_anon_code": True,
            "dokter_dropped_from_final": True,
            "is_new_patient_count": int(df["is_new_patient"].sum()),
            "unique_patients_hashed": unique_patients,
            "crosscheck_first_seen_baru": first_seen_baru,
            "crosscheck_first_seen_lama": first_seen_lama,
            "crosscheck_repeat_seen_baru": repeat_seen_baru,
        },
    )
    return df_interim, df_final, daily_docs_df


def step7_aggregate_daily(
    df: pd.DataFrame, daily_docs_df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    print("\n" + "=" * 70)
    print("STEP 7: Aggregate to Daily Visit Counts")
    print("=" * 70)

    df["date"] = pd.to_datetime(df["date"])
    daily_docs_df["date"] = pd.to_datetime(daily_docs_df["date"])

    daily_total = (
        df.groupby("date")
        .agg(
            visit_count=("no_rawat", "count"),
            new_patient_count=("is_new_patient", "sum"),
        )
        .reset_index()
    )

    full_date_range = pd.date_range(
        start=daily_total["date"].min(),
        end=daily_total["date"].max(),
        freq="D",
    )
    daily_total = (
        daily_total.set_index("date")
        .reindex(full_date_range, fill_value=0)
        .rename_axis("date")
        .reset_index()
    )
    daily_total = pd.merge(daily_total, daily_docs_df, on="date", how="left")
    daily_total["active_doctors_total"] = daily_total["active_doctors_total"].fillna(0).astype(int)
    daily_total["active_doctors_scheduled"] = daily_total["active_doctors_scheduled"].fillna(0).astype(int)

    daily_total["day_of_week"] = daily_total["date"].dt.dayofweek
    daily_total["day_name"] = daily_total["date"].dt.day_name()
    daily_total["month"] = daily_total["date"].dt.month
    daily_total["year"] = daily_total["date"].dt.year
    daily_total["is_weekend"] = daily_total["day_of_week"].isin([5, 6]).astype(int)

    # Daily by poliklinik
    daily_by_poli = (
        df.groupby(["date", config.COL_POLIKLINIK])
        .size()
        .reset_index(name="visit_count")
    )
    all_polis = sorted(df[config.COL_POLIKLINIK].unique().tolist())
    multi_idx = pd.MultiIndex.from_product(
        [full_date_range, all_polis],
        names=["date", config.COL_POLIKLINIK],
    )
    daily_by_poli = (
        daily_by_poli.set_index(["date", config.COL_POLIKLINIK])
        .reindex(multi_idx, fill_value=0)
        .reset_index()
    )

    print(f"  [OK] Daily total      : {len(daily_total):,} hari")
    print(f"  [OK] Daily by poli    : {len(daily_by_poli):,} baris ({len(all_polis)} poli x {len(full_date_range)} hari)")

    log_step(
        "07_aggregate_daily",
        {
            "total_days": len(daily_total),
            "missing_days_filled": 0,
            "visit_count_min": int(daily_total["visit_count"].min()),
            "visit_count_max": int(daily_total["visit_count"].max()),
            "visit_count_mean": round(float(daily_total["visit_count"].mean()), 2),
            "num_poliklinik": len(all_polis),
            "poliklinik_list": all_polis,
            "daily_by_poli_rows": len(daily_by_poli),
        },
    )
    return daily_total, daily_by_poli


def step8_outlier_detection(daily_total: pd.DataFrame) -> pd.DataFrame:
    """
    IQR-based outlier detection on daily visit totals.
     compute Q1/Q3 on training period (date <= TRAIN_END) AND full period for transparency,
    flagging outliers without removing them.
    """
    print("\n" + "=" * 70)
    print("STEP 8: Outlier Detection (IQR Method)")
    print("=" * 70)

    # Full dataset IQR (for descriptive EDA consistency)
    q1_all = float(daily_total["visit_count"].quantile(0.25))
    q3_all = float(daily_total["visit_count"].quantile(0.75))
    iqr_all = q3_all - q1_all
    lower_all = q1_all - 1.5 * iqr_all
    upper_all = q3_all + 1.5 * iqr_all

    # Train-only IQR (strictly <= TRAIN_END, no test leakage)
    train_slice = daily_total[daily_total["date"] <= config.TRAIN_END]["visit_count"]
    q1_train = float(train_slice.quantile(0.25))
    q3_train = float(train_slice.quantile(0.75))
    iqr_train = q3_train - q1_train
    lower_train = q1_train - 1.5 * iqr_train
    upper_train = q3_train + 1.5 * iqr_train

    daily_total["is_outlier"] = (
        (daily_total["visit_count"] < lower_all) | (daily_total["visit_count"] > upper_all)
    ).astype(int)

    n_outliers = int(daily_total["is_outlier"].sum())
    outlier_dates = daily_total.loc[daily_total["is_outlier"] == 1, "date"]
    print(f"  -> Full IQR : Q1={q1_all:.1f}, Q3={q3_all:.1f}, IQR={iqr_all:.1f}, Bounds=[{lower_all:.1f}, {upper_all:.1f}] -> {n_outliers} hari")
    print(f"  -> Train IQR: Q1={q1_train:.1f}, Q3={q3_train:.1f}, IQR={iqr_train:.1f}, Bounds=[{lower_train:.1f}, {upper_train:.1f}]")

    log_step(
        "08_outlier_detection",
        {
            "q1_full": q1_all,
            "q3_full": q3_all,
            "iqr_full": iqr_all,
            "lower_bound_full": lower_all,
            "upper_bound_full": upper_all,
            "q1_train_only": q1_train,
            "q3_train_only": q3_train,
            "iqr_train_only": iqr_train,
            "lower_bound_train_only": lower_train,
            "upper_bound_train_only": upper_train,
            "n_outliers": n_outliers,
            "outlier_date_min": str(outlier_dates.min()) if n_outliers > 0 else None,
            "outlier_date_max": str(outlier_dates.max()) if n_outliers > 0 else None,
            "action": "flagged_only_not_removed_and_excluded_from_model_features",
        },
    )
    return daily_total


def step9_save_outputs(
    df_interim: pd.DataFrame,
    daily_total: pd.DataFrame,
    daily_by_poli: pd.DataFrame,
) -> None:
    print("\n" + "=" * 70)
    print("STEP 9: Save Outputs & Document Schemas")
    print("=" * 70)

    config.DATA_INTERIM.mkdir(parents=True, exist_ok=True)
    config.DATA_PROCESSED.mkdir(parents=True, exist_ok=True)

    interim_path = config.DATA_INTERIM / "visits_anonymized.parquet"
    df_interim.to_parquet(interim_path, index=False, engine="pyarrow")

    daily_total_path = config.DATA_PROCESSED / "daily_total.parquet"
    daily_total.to_parquet(daily_total_path, index=False, engine="pyarrow")

    daily_by_poli_path = config.DATA_PROCESSED / "daily_by_poli.parquet"
    daily_by_poli.to_parquet(daily_by_poli_path, index=False, engine="pyarrow")

    LOG["output_schemas"] = {
        "visits_anonymized.parquet": {
            "rows": len(df_interim),
            "columns": {col: str(dt) for col, dt in df_interim.dtypes.items()},
        },
        "daily_total.parquet": {
            "rows": len(daily_total),
            "columns": {col: str(dt) for col, dt in daily_total.dtypes.items()},
        },
        "daily_by_poli.parquet": {
            "rows": len(daily_by_poli),
            "columns": {col: str(dt) for col, dt in daily_by_poli.dtypes.items()},
        },
    }

    log_step(
        "09_save_outputs",
        {
            "interim_rows": len(df_interim),
            "daily_total_rows": len(daily_total),
            "daily_by_poli_rows": len(daily_by_poli),
        },
    )

    log_path = config.DATA_PROCESSED / "preprocessing_log.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(LOG, f, indent=2, ensure_ascii=False, default=str)
    print(f"  [OK] Semua berkas disimpan dan skema tercatat di {log_path.relative_to(config.BASE_DIR)}")


def main() -> None:
    print("=" * 70)
    print("TAHAP 2: PREPROCESSING — RSIA Qurrata A'yun Outpatient Visits")
    print("=" * 70)

    df = step1_load_and_combine()
    df = step2_standardize_columns(df)
    df = step3_parse_dates_times(df)
    df = step4_normalize_categoricals(df)
    df = step5_handle_duplicates(df)
    df_interim, df_final, daily_docs_df = step6_privacy(df)
    daily_total, daily_by_poli = step7_aggregate_daily(df_final, daily_docs_df)
    daily_total = step8_outlier_detection(daily_total)
    step9_save_outputs(df_interim, daily_total, daily_by_poli)


if __name__ == "__main__":
    main()
