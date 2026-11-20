#!/usr/bin/env python3
"""
01_data_understanding.py — Tahap 1: Muat Dataset Mentah SIMRS (Load Data Only)
===============================================================================
Scientific Method pipeline for outpatient visit forecasting at RSIA Qurrata A'yun.

Tahap 1 ini HANYA bertugas memuat 4 berkas Excel mentah SIMRS (2023–Jun 2026)
dan memeriksa apakah proses load berhasil, berapa jumlah data yang berhasil dimuat,
keseragaman 9 kolom asli, rentang tanggal, nilai kosong bawaan, serta sebaran nilai
mentah apa adanya.

STRICT STAGE-1 BOUNDARY:
  - BELUM ada preprocessing apa pun.
  - BELUM ada penghapusan kolom (Pasien, No. RM, Dokter, No. Rawat tetap utuh di memori).
  - BELUM ada hashing maupun salting.
  - BELUM ada penyeragaman label ('IGD' vs 'Unit IGD' tetap terpisah; penjamin '-' tetap '-').
  - BELUM ada agregasi harian.

PRIVACY COMPLIANCE:
  NEVER print or output individual row data or personal identifiers (Pasien, No. RM, Dokter).
  Output strictly aggregate metadata, file verification, and raw categorical counts.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import openpyxl
import pandas as pd

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

RAW_COLUMN_ROLES = {
    "No. Rawat": "Nomor registrasi kunjungan (masih mentah, belum dicek/diproses)",
    "Tgl Reg": "Tanggal registrasi kunjungan mentah dari SIMRS",
    "Jam": "Waktu registrasi kunjungan mentah dari SIMRS",
    "No. RM": "Nomor Rekam Medis asli (belum di-hash, belum diberi salt)",
    "Pasien": "Nama pasien asli (belum dihapus — baru dihapus di Tahap 2 Preprocessing)",
    "Poliklinik": "Nama poliklinik mentah (masih terpisah 'IGD' dan 'Unit IGD')",
    "Dokter": "Nama dokter asli (belum disamarkan ke DOKTER_XX)",
    "Penjamin": "Penjamin pembayaran mentah (nilai '-' masih utuh belum diubah)",
    "Jns Kunjungan": "Jenis kunjungan mentah ('Baru' / 'Lama' apa adanya)",
}


def verify_and_load_raw_files() -> tuple[pd.DataFrame, dict]:
    """Load the 4 raw SIMRS Excel files without transforming any column or label."""
    frames = []
    file_verification = {}

    for file_path in config.RAW_FILES:
        if not file_path.exists():
            raise FileNotFoundError(f"File data mentah tidak ditemukan: {file_path}")

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
        dates_parsed = pd.to_datetime(df_year["Tgl Reg"], errors="coerce")
        expected_year = int(file_path.stem.split("_")[-1])
        out_of_year = int((dates_parsed.dt.year != expected_year).sum())
        null_cells = int(df_year[EXPECTED_RAW_COLUMNS].isna().sum().sum())
        file_size_kb = round(file_path.stat().st_size / 1024, 1)

        file_verification[file_path.name] = {
            "status": "Berhasil Dimuat",
            "file_size_kb": file_size_kb,
            "report_title_row0": row0_title,
            "header_row_index": 1,
            "columns_count": len(row1_cols),
            "columns_verified": row1_cols == EXPECTED_RAW_COLUMNS,
            "rows": int(len(df_year)),
            "date_min": dates_parsed.min().strftime("%Y-%m-%d") if len(dates_parsed.dropna()) > 0 else "-",
            "date_max": dates_parsed.max().strftime("%Y-%m-%d") if len(dates_parsed.dropna()) > 0 else "-",
            "nat_dates": int(dates_parsed.isna().sum()),
            "null_cells": null_cells,
            "out_of_file_year_rows": out_of_year,
        }
        frames.append(df_year)

    df_combined = pd.concat(frames, ignore_index=True)
    return df_combined, file_verification


def run_data_understanding() -> dict:
    print("=" * 72)
    print("TAHAP 1: MUAT DATASET MENTAH SIMRS (LOAD DATA ONLY — TANPA PREPROCESSING)")
    print("=" * 72)

    df_raw, file_verification = verify_and_load_raw_files()
    total_rows, total_cols = df_raw.shape
    raw_columns = list(df_raw.columns)

    print(f"Status Load                   : BERHASIL ({len(file_verification)}/{len(config.RAW_FILES)} berkas)")
    print(f"Total baris berhasil di-load  : {total_rows:,} baris")
    print(f"Jumlah kolom mentah           : {total_cols} kolom ({raw_columns})")
    for fname, fmeta in file_verification.items():
        print(
            f"  [OK] {fname}: {fmeta['rows']:,} baris | "
            f"{fmeta['columns_count']} kolom | "
            f"{fmeta['date_min']} s.d. {fmeta['date_max']} | "
            f"NaT={fmeta['nat_dates']} | Sel kosong={fmeta['null_cells']}"
        )

    # Inspeksi read-only tanggal & kelengkapan kolom tanpa mengubah DataFrame mentah
    tgl_series = pd.to_datetime(df_raw["Tgl Reg"], errors="coerce")
    min_date = tgl_series.min()
    max_date = tgl_series.max()
    full_date_range = pd.date_range(min_date, max_date, freq="D")
    unique_dates = set(tgl_series.dt.date.dropna().unique())
    missing_days = max(0, len(full_date_range) - len(unique_dates))
    total_months = int(tgl_series.dt.to_period("M").nunique())

    raw_null_counts = {col: int(df_raw[col].isna().sum()) for col in raw_columns}
    raw_dtypes = {col: str(df_raw[col].dtype) for col in raw_columns}

    # Hitung sebaran nilai mentah apa adanya (TANPA strip/upper/replace)
    poli_raw_counts = {
        str(k): int(v)
        for k, v in df_raw["Poliklinik"].fillna("(KOSONG)").value_counts().items()
    }
    penjamin_raw_counts = {
        str(k): int(v)
        for k, v in df_raw["Penjamin"].fillna("(KOSONG)").value_counts().items()
    }
    jns_raw_counts = {
        str(k): int(v)
        for k, v in df_raw["Jns Kunjungan"].fillna("(KOSONG)").value_counts().items()
    }

    print("\n[Sebaran Data Mentah Apa Adanya — Belum Diubah]:")
    print(f"  Poliklinik mentah ({len(poli_raw_counts)} label) : {poli_raw_counts}")
    print(f"  Penjamin mentah   ({len(penjamin_raw_counts)} label) : {penjamin_raw_counts}")
    print(f"  Jns Kunjungan     ({len(jns_raw_counts)} label) : {jns_raw_counts}")
    print("\n[Status Tahap 1] Belum ada hapus kolom, hash, salt, ubah '-', maupun agregasi harian.")

    raw_columns_detail = [
        {
            "name": col,
            "dtype": raw_dtypes[col],
            "nullCount": raw_null_counts[col],
            "roleInRaw": RAW_COLUMN_ROLES.get(col, "Kolom asli Excel SIMRS"),
            "status": "Utuh (Belum Preprocessing)",
        }
        for col in raw_columns
    ]

    summary_report = {
        "timestamp": datetime.now().isoformat(),
        "load_status": {
            "status": "BERHASIL",
            "files_expected": len(config.RAW_FILES),
            "files_loaded": len(file_verification),
            "all_columns_matched": all(f["columns_verified"] for f in file_verification.values()),
            "total_columns": int(total_cols),
        },
        "preprocessing_status": {
            "preprocessing_applied": False,
            "hashing_applied": False,
            "salting_applied": False,
            "columns_dropped": [],
            "label_normalization_applied": False,
            "daily_aggregation_applied": False,
        },
        "total_records": int(total_rows),
        "raw_columns": raw_columns,
        "raw_columns_detail": raw_columns_detail,
        "raw_null_counts": raw_null_counts,
        "raw_dtypes": raw_dtypes,
        "file_verification": file_verification,
        "date_range": {
            "start": min_date.strftime("%Y-%m-%d"),
            "end": max_date.strftime("%Y-%m-%d"),
            "total_days": int(len(full_date_range)),
            "missing_days": int(missing_days),
            "total_months": total_months,
        },
        "poliklinik_raw_distribution": poli_raw_counts,
        "penjamin_distribution": penjamin_raw_counts,
        "jns_kunjungan_distribution": jns_raw_counts,
    }

    config.TABLES_DIR.mkdir(parents=True, exist_ok=True)
    out_json = config.TABLES_DIR / "01_data_profile.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2, ensure_ascii=False)
    print(f"\n[Output] Ringkasan muat data mentah disimpan ke: {out_json}")

    return summary_report


if __name__ == "__main__":
    run_data_understanding()
