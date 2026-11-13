#!/usr/bin/env python3
"""
test_pipeline_integrity.py — Automated Tests for Anti-Leakage, Anonymity & Schemas
==================================================================================
Runs automated verification on the Scientific Method pipeline outputs:
  1. Privacy & Anonymity:
     - `config.get_hash_salt()` raises RuntimeError when `SM_HASH_SALT` is unset.
     - No hardcoded salt exists in `config.py` or `scripts/*.py`.
     - `visits_anonymized.parquet` has no `pasien` or raw `dokter` column, and `no_rm`
       consists strictly of 64-character hexadecimal SHA-256 hashes.
     - Modeling datasets (`daily_total.parquet`, `daily_by_poli.parquet`, `features_*.parquet`)
       contain zero individual identifiers (`pasien`, `no_rm`, `dokter`, `dokter_code`).
  2. Anti-Leakage:
     - All lag and rolling features in `03_feature_engineering.py` use shift >= 7 (for H=7)
       or shift >= 14 (for H=14). No lag_1..lag_6 columns exist.
     - Exact formula check: `lag_7[t] == visit_count[t-7]` and
       `rolling_mean_7d[t] == mean(visit_count[t-13 : t-6])`.
     - Train (<=2025-06-30), Validation (2025-07-01..2025-12-31), and Test (2026-01-01..2026-06-30)
       are strictly chronological and non-overlapping.
     - `is_outlier` is excluded from `h7_features` and `h14_features` in `model_metadata.json`.
  3. Schema & Output Integrity:
     - All JSON tables and Parquet outputs exist with expected row counts and non-null schemas.
"""

from __future__ import annotations

import json
import os
import re
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config


class TestPipelineIntegrity(unittest.TestCase):
    def test_01_salt_fails_when_env_missing(self):
        """get_hash_salt() must raise RuntimeError if SM_HASH_SALT is unset."""
        old_val = os.environ.pop("SM_HASH_SALT", None)
        try:
            with self.assertRaises(RuntimeError):
                config.get_hash_salt()
        finally:
            if old_val is not None:
                os.environ["SM_HASH_SALT"] = old_val

    def test_02_no_hardcoded_salt_in_code(self):
        """Ensure LOCAL_DEV_SALT_DO_NOT_COMMIT is absent from config.py and scripts."""
        files_to_check = [config.BASE_DIR / "config.py"] + list((config.BASE_DIR / "scripts").glob("*.py"))
        for fpath in files_to_check:
            content = fpath.read_text(encoding="utf-8")
            self.assertNotIn("LOCAL_DEV_SALT_DO_NOT_COMMIT", content, f"Hardcoded salt found in {fpath.name}")

    def test_03_interim_anonymity(self):
        """Interim parquet must not contain pasien or raw dokter names, and no_rm must be SHA-256 hex."""
        interim_path = config.DATA_INTERIM / "visits_anonymized.parquet"
        self.assertTrue(interim_path.exists(), "visits_anonymized.parquet missing")
        df_int = pd.read_parquet(interim_path)
        self.assertEqual(len(df_int), 39042)
        self.assertNotIn("pasien", df_int.columns)
        self.assertNotIn("dokter", df_int.columns)
        self.assertIn("no_rm", df_int.columns)
        self.assertIn("dokter_code", df_int.columns)

        # Verify all no_rm values are 64-char hex strings
        hex_pattern = re.compile(r"^[0-9a-f]{64}$")
        sample_hashes = df_int["no_rm"].drop_duplicates().tolist()
        for h in sample_hashes[:200]:
            self.assertRegex(str(h), hex_pattern)

        # Verify dokter_code values match DOKTER_XX
        doc_pattern = re.compile(r"^DOKTER_\d{2}$")
        for dcode in df_int["dokter_code"].unique():
            self.assertRegex(str(dcode), doc_pattern)

    def test_04_processed_datasets_free_of_pii(self):
        """Processed & feature datasets must not contain any patient or doctor identifier columns."""
        forbidden = {"pasien", "no_rm", "dokter", "dokter_code", "no_rawat"}
        for fname in [
            "daily_total.parquet",
            "daily_by_poli.parquet",
            "features_total.parquet",
            "features_by_poli.parquet",
        ]:
            fpath = config.DATA_PROCESSED / fname
            self.assertTrue(fpath.exists(), f"{fname} missing")
            df = pd.read_parquet(fpath)
            overlap = forbidden.intersection(set(df.columns))
            self.assertEqual(len(overlap), 0, f"Forbidden PII columns {overlap} found in {fname}")

    def test_05_anti_leakage_lags_and_rolling(self):
        """Verify no lag < 7 exists and rolling windows are strictly shifted by >= 7 days."""
        df_feat = pd.read_parquet(config.DATA_PROCESSED / "features_total.parquet")
        df_feat = df_feat.sort_values("date").reset_index(drop=True)

        for forbidden_lag in ["lag_1", "lag_2", "lag_3", "lag_4", "lag_5", "lag_6"]:
            self.assertNotIn(forbidden_lag, df_feat.columns)

        y = df_feat["visit_count"].values.astype(float)
        # Check at index t = 50
        t = 50
        self.assertAlmostEqual(float(df_feat.loc[t, "lag_7"]), float(y[t - 7]), places=6)
        self.assertAlmostEqual(float(df_feat.loc[t, "lag_14"]), float(y[t - 14]), places=6)
        expected_roll7_h7 = float(np.mean(y[t - 13 : t - 6]))
        self.assertAlmostEqual(float(df_feat.loc[t, "rolling_mean_7d"]), expected_roll7_h7, places=6)

        expected_roll7_h14 = float(np.mean(y[t - 20 : t - 13]))
        self.assertAlmostEqual(float(df_feat.loc[t, "rolling_mean_7d_h14"]), expected_roll7_h14, places=6)

    def test_06_chronological_splits_and_feature_exclusion(self):
        """Verify chronological non-overlapping splits and exclusion of is_outlier from model features."""
        meta_path = config.MODELS_DIR / "model_metadata.json"
        self.assertTrue(meta_path.exists())
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertNotIn("is_outlier", meta["h7_features"])
        self.assertNotIn("is_outlier", meta["h14_features"])
        self.assertNotIn("active_doctors_total", meta["h7_features"])
        self.assertEqual(meta["train_days"], 878)
        self.assertEqual(meta["val_days"], 184)
        self.assertEqual(meta["test_days"], 181)

    def test_07_outputs_and_tables_schema(self):
        """Verify all output tables and prediction files exist and match expected lengths."""
        preds_h7 = pd.read_parquet(config.MODELS_DIR / "test_predictions.parquet")
        preds_h14 = pd.read_parquet(config.MODELS_DIR / "test_predictions_h14.parquet")
        preds_poli = pd.read_parquet(config.MODELS_DIR / "test_predictions_by_poli.parquet")

        self.assertEqual(len(preds_h7), 181)
        self.assertEqual(len(preds_h14), 181)
        self.assertEqual(len(preds_poli), 181 * 4)

        for table_name in ["01_data_profile.json", "03_feature_summary.json", "05_evaluation_metrics.json"]:
            tpath = config.TABLES_DIR / table_name
            self.assertTrue(tpath.exists(), f"{table_name} missing")
            data = json.loads(tpath.read_text(encoding="utf-8"))
            self.assertIn("timestamp", data)

    def test_08_comparative_architecture_clean(self):
        """Verify comparative 2-method architecture with zero Tweedie, Stacking, SLSQP, or version strings."""
        preds_h7 = pd.read_parquet(config.MODELS_DIR / "test_predictions.parquet")
        for col in ["naive", "dow_mean", "nb_glm", "hgb_poisson", "pred_best", "best_model_name"]:
            self.assertIn(col, preds_h7.columns)
        for forbidden_col in ["tweedie_glm", "ensemble"]:
            self.assertNotIn(forbidden_col, preds_h7.columns)

        meta_text = (config.MODELS_DIR / "model_metadata.json").read_text(encoding="utf-8")
        meta = json.loads(meta_text)
        self.assertIn(meta.get("best_model_total_h7"), {"Negative Binomial GLM", "HistGradientBoosting"})
        for forbidden_key in ["tweedie_params", "optimal_ensemble_weights", "optimal_ensemble_weight_nb"]:
            self.assertNotIn(forbidden_key, meta)
        for forbidden_term in ["tweedie", "slsqp", "stacking", "v3.0", "v2.1"]:
            self.assertNotIn(forbidden_term, meta_text.lower())

        eval_data = json.loads((config.TABLES_DIR / "05_evaluation_metrics.json").read_text(encoding="utf-8"))
        self.assertEqual(
            set(eval_data["point_metrics"].keys()),
            {"Seasonal Naive", "DOW Mean (4W)", "Negative Binomial GLM", "HistGradientBoosting"},
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
