# scientific-method/config.py
"""
Central configuration for the Scientific Method pipeline.
All paths, constants, seeds, and split dates in one place.
"""
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_RAW    = BASE_DIR / "data" / "raw"
DATA_INTERIM = BASE_DIR / "data" / "interim"
DATA_PROCESSED = BASE_DIR / "data" / "processed"
MODELS_DIR  = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"
FIGURES_DIR = OUTPUTS_DIR / "figures"
TABLES_DIR  = OUTPUTS_DIR / "tables"
DASHBOARD_DIR = OUTPUTS_DIR / "dashboard"
CONFIG_DIR  = BASE_DIR / "config"

# Raw file list (order matters: chronological)
RAW_FILES = [
    DATA_RAW / "rawat_jalan_2023.xlsx",
    DATA_RAW / "rawat_jalan_2024.xlsx",
    DATA_RAW / "rawat_jalan_2025.xlsx",
    DATA_RAW / "rawat_jalan_2026.xlsx",
]

# ── Reproducibility ───────────────────────────────────────────────────
SEED = 42

# ── Time-based split ──────────────────────────────────────────────────
# Train: Jan 2023 – Jun 2025  (≈ 30 months)
# Validation: Jul 2025 – Dec 2025  (6 months)
# Test: Jan 2026 – Jun 2026  (6 months)
TRAIN_END      = "2025-06-30"
VALIDATION_END = "2025-12-31"
# Everything after VALIDATION_END is test set.

# ── Forecast horizon ─────────────────────────────────────────────────
HORIZON = 7   # days (weekly scheduling cycle)
HORIZON_SENSITIVITY = 14  # for sensitivity analysis

# ── Modelling constants ──────────────────────────────────────────────
CV_SPLITS = 5          # rolling-origin folds
MIN_TRAIN_DAYS = 365   # minimum training window in rolling CV

# ── Column names (standardised) ──────────────────────────────────────
COL_NO_RAWAT      = "no_rawat"
COL_TGL_REG       = "tgl_reg"
COL_JAM           = "jam"
COL_NO_RM         = "no_rm"
COL_PASIEN        = "pasien"
COL_POLIKLINIK    = "poliklinik"
COL_DOKTER        = "dokter"
COL_PENJAMIN      = "penjamin"
COL_JNS_KUNJUNGAN = "jns_kunjungan"
COL_SOURCE_FILE   = "source_file"

# ── Privacy ──────────────────────────────────────────────────────────
# Salt for hashing No. RM is read ONLY from the SM_HASH_SALT environment
# variable. It must never be written in this repository.
import os


def get_hash_salt() -> str:
    """Return the hashing salt from the environment, or fail loudly."""
    salt = os.environ.get("SM_HASH_SALT")
    if not salt:
        raise RuntimeError(
            "Variabel lingkungan SM_HASH_SALT tidak ditemukan. "
            "Set salt rahasia sebelum menjalankan preprocessing, mis. "
            "PowerShell: $env:SM_HASH_SALT = '<salt-rahasia>'"
        )
    return salt
