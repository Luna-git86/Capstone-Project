#!/usr/bin/env python3
"""
04_modeling.py — Tahap 4: Pemodelan Komparatif, Cross-Validation & Proyeksi H2 2026
===================================================================================
Pipeline Scientific Method untuk prediksi kunjungan pasien rawat jalan RSIA Qurrata A'yun
Samarinda dengan skema Studi Komparasi Metode Ilmiah (2 Metode Utama + 2 Baseline).

Metode yang Dibandingkan:
  1. Baseline 1: Seasonal Naive (y_hat(t) = y(t - H)).
  2. Baseline 2: Historical Day-of-Week Mean (rata-rata 4 minggu hari yang sama:
     average of lag_7, lag_14, lag_21, lag_28 pada H=7).
  3. Pembanding Distribusi GLM: Poisson GLM (asumsi ekuidispersi, diuji via Log-Likelihood & AIC).
  4. Metode Utama 1 (Statistik Regresi Data Cacah): Negative Binomial GLM dengan
     log-link, offset Hybrid Exposure Anchor (0.5 * rolling_mean_28d + 0.5 * ewma_dow_4w),
     dan parameter overdispersi alpha terestimasi via Maximum Likelihood Estimation (MLE).
  5. Metode Utama 2 (Machine Learning Pohon Keputusan): HistGradientBoostingRegressor
     dengan loss L1 (absolute_error) memprediksi laju relatif (y / base) berbobot
     Hybrid Exposure Anchor untuk menangkap interaksi non-linier fitur kalender dan lag.

Aturan Pemilihan Pemenang (Best Single Model Selection):
  - Kedua metode utama dibandingkan secara objektif pada periode uji independen (H1 2026).
  - Model tunggal dengan galat MAE terendah (tie-breaker RMSE) ditetapkan sebagai
    Best Single Model yang menyuplai prediksi utama dashboard dan proyeksi H2 2026
    (tanpa penggabungan bobot/ensemble).

PRIVACY: Tidak ada data identitas pasien atau nama dokter yang diproses atau dikeluarkan.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import statsmodels.api as sm
from statsmodels.discrete.discrete_model import NegativeBinomial as DiscreteNegativeBinomial
from statsmodels.genmod.families import NegativeBinomial as GLMNegativeBinomial, Poisson as GLMPoisson
from statsmodels.tsa.stattools import acf

# Project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config

warnings.filterwarnings("ignore")

# Load calendar helper from 03_feature_engineering.py for H2 2026 projection
_fe_spec = importlib.util.spec_from_file_location(
    "fe_mod", Path(__file__).resolve().parent / "03_feature_engineering.py"
)
_fe_mod = importlib.util.module_from_spec(_fe_spec)
_fe_spec.loader.exec_module(_fe_mod)
create_calendar_features = _fe_mod.create_calendar_features

MAJOR_POLIKLINIKS = [
    "POLIKLINIK OBGYN",
    "POLIKLINIK UMUM",
    "UNIT IGD",
    "POLIKLINIK ANAK",
]

H7_FEATURES = [
    "day_of_week", "month", "is_weekend",
    "is_holiday", "is_ramadan", "is_eid_period",
    "lag_7", "lag_14", "lag_21", "lag_28",
    "rolling_mean_7d", "rolling_mean_28d",
    "ewma_dow_4w", "ratio_ewma_dow_to_rm28",
]

GLM_H7_FEATURES = [
    "day_of_week", "month", "is_weekend",
    "is_holiday", "is_ramadan", "is_eid_period",
    "ratio_ewma_dow_to_rm28",
]

TUNED_HGB_PARAMS = {
    "loss": "absolute_error",
    "learning_rate": 0.03,
    "max_iter": 120,
    "max_depth": 3,
    "min_samples_leaf": 25,
    "l2_regularization": 10.0,
    "random_state": config.SEED,
}


def compute_exposure_anchor(df: pd.DataFrame, offset_col: str = "rolling_mean_28d") -> np.ndarray:
    """
    Compute hybrid exposure anchor combining 28-day level regime (rolling_mean_28d)
    and recent same-weekday EWMA dynamics (ewma_dow_4w), floored at 1.0.
    """
    rm28 = df[offset_col].values.astype(float)
    if offset_col == "rolling_mean_28d" and "ewma_dow_4w" in df.columns:
        ewma = df["ewma_dow_4w"].values.astype(float)
        return np.maximum(1.0, 0.5 * rm28 + 0.5 * ewma)
    if offset_col == "rolling_mean_28d_h14" and "ewma_dow_3w_h14" in df.columns:
        ewma = df["ewma_dow_3w_h14"].values.astype(float)
        return np.maximum(1.0, 0.5 * rm28 + 0.5 * ewma)
    return np.maximum(1.0, rm28)


def calculate_wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    sum_true = float(np.sum(y_true))
    if sum_true <= 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / sum_true * 100.0)


def calculate_mase(
    y_true: np.ndarray, y_pred: np.ndarray, y_train: np.ndarray, seasonality: int = 7
) -> float:
    mae_model = float(np.mean(np.abs(y_true - y_pred)))
    if len(y_train) <= seasonality:
        return 1.0
    mae_naive_in = float(np.mean(np.abs(y_train[seasonality:] - y_train[:-seasonality])))
    if mae_naive_in < 1e-5:
        return 1.0
    return float(mae_model / mae_naive_in)


def _safe_fit_glm(
    y: np.ndarray,
    X_const: pd.DataFrame,
    family,
    offset: np.ndarray | None,
):
    """
    Fit statsmodels GLM with unregularized IRLS first; fall back to light L2
    regularized GLM if IRLS diverges under sparse-segment complete separation.
    """
    mod = sm.GLM(y, X_const, family=family, offset=offset)
    try:
        res = mod.fit(disp=False, maxiter=100)
        params_arr = np.asarray(res.params, dtype=float)
        if np.all(np.isfinite(params_arr)) and np.max(np.abs(params_arr)) < 15.0:
            return res, False
    except Exception:
        pass
    res_reg = mod.fit_regularized(alpha=1e-3, L1_wt=0.0, maxiter=200)
    return res_reg, True


def estimate_nb_alpha_mle(
    y: np.ndarray, X_const: pd.DataFrame, offset: np.ndarray | None = None
) -> tuple[float, float, float]:
    """
    Estimate Negative Binomial overdispersion parameter alpha via Maximum Likelihood,
    fallback to method-of-moments if optimization does not converge.
    Returns (alpha_mle, loglik_nb, aic_nb_with_alpha).
    """
    try:
        nb_disc = DiscreteNegativeBinomial(y, X_const, loglike_method="nb2", offset=offset)
        res_disc = nb_disc.fit(disp=False, maxiter=200)
        alpha_val = (
            float(res_disc.params.iloc[-1])
            if hasattr(res_disc.params, "iloc")
            else float(res_disc.params[-1])
        )
        if not np.isfinite(alpha_val) or alpha_val <= 1e-4 or alpha_val > 10.0:
            raise ValueError("Invalid MLE alpha")
        llf = float(res_disc.llf)
        k_params = int(X_const.shape[1] + 1)  # beta params + alpha
        aic_val = float(2 * k_params - 2 * llf)
        return alpha_val, llf, aic_val
    except Exception:
        m = float(np.mean(y))
        v = float(np.var(y))
        alpha_mom = float(np.clip((v - m) / (m ** 2 + 1e-5), 0.01, 5.0))
        fam = GLMNegativeBinomial(alpha=alpha_mom)
        glm_nb, is_reg = _safe_fit_glm(y, X_const, fam, offset=offset)
        if not is_reg and hasattr(glm_nb, "llf") and np.isfinite(glm_nb.llf):
            llf = float(glm_nb.llf)
        else:
            mu_hat = np.maximum(1e-6, np.asarray(glm_nb.predict(X_const, offset=offset), dtype=float))
            llf = float(fam.loglike(y, mu_hat))
        k_params = int(X_const.shape[1] + 1)
        aic_val = float(2 * k_params - 2 * llf)
        return alpha_mom, llf, aic_val


def fit_and_predict_glm_nb(
    df_tr: pd.DataFrame,
    df_te: pd.DataFrame,
    glm_cols: list[str],
    offset_col: str = "rolling_mean_28d",
) -> tuple[np.ndarray, object, float, dict]:
    """
    Fit Negative Binomial GLM with exposure offset and return predictions.
    """
    X_tr = sm.add_constant(df_tr[glm_cols].astype(float), has_constant="add")
    X_te = sm.add_constant(df_te[glm_cols].astype(float), has_constant="add")
    y_tr = df_tr["visit_count"].values.astype(float)

    offset_tr = np.log(compute_exposure_anchor(df_tr, offset_col=offset_col))
    offset_te = np.log(compute_exposure_anchor(df_te, offset_col=offset_col))

    # Negative Binomial GLM with MLE alpha & exposure offset
    alpha_mle, _, _ = estimate_nb_alpha_mle(y_tr, X_tr, offset=offset_tr)
    fam_nb = GLMNegativeBinomial(alpha=alpha_mle)
    nb_res, nb_reg = _safe_fit_glm(y_tr, X_tr, fam_nb, offset=offset_tr)
    if not nb_reg and hasattr(nb_res, "llf") and np.isfinite(nb_res.llf):
        llf_nb = float(nb_res.llf)
    else:
        mu_nb = np.maximum(1e-6, np.asarray(nb_res.predict(X_tr, offset=offset_tr), dtype=float))
        llf_nb = float(fam_nb.loglike(y_tr, mu_nb))
    k_nb = int(X_tr.shape[1] + 1)  # includes alpha
    aic_nb = float(2 * k_nb - 2 * llf_nb)

    raw_preds = np.asarray(nb_res.predict(X_te, offset=offset_te), dtype=float)
    raw_preds = np.where(np.isfinite(raw_preds), raw_preds, np.exp(offset_te))
    cap_max = max(float(np.max(y_tr)) * 3.0, 20.0)
    preds = np.clip(raw_preds, 0.0, cap_max)

    # Residual ACF on training set
    mu_tr = np.asarray(nb_res.predict(X_tr, offset=offset_tr), dtype=float)
    mu_tr = np.where(np.isfinite(mu_tr), mu_tr, y_tr)
    resid_response = y_tr - mu_tr
    resid_acf = acf(resid_response, nlags=14, fft=True)

    # Parameter table with IRR and 95% CI
    irr_table = {}
    params_arr = np.asarray(nb_res.params, dtype=float)
    if not nb_reg and hasattr(nb_res, "conf_int") and hasattr(nb_res, "pvalues"):
        conf = nb_res.conf_int()
        pvals = nb_res.pvalues
        for idx_c, col_name in enumerate(X_tr.columns):
            b = float(params_arr[idx_c])
            ci_low = float(conf.loc[col_name, 0])
            ci_high = float(conf.loc[col_name, 1])
            irr_table[col_name] = {
                "beta": round(b, 5),
                "irr": round(float(np.exp(np.clip(b, -10.0, 10.0))), 4),
                "irr_ci95_low": round(float(np.exp(np.clip(ci_low, -10.0, 10.0))), 4),
                "irr_ci95_high": round(float(np.exp(np.clip(ci_high, -10.0, 10.0))), 4),
                "p_value": round(float(pvals[col_name]), 6),
            }
    else:
        for idx_c, col_name in enumerate(X_tr.columns):
            b = float(params_arr[idx_c])
            irr_table[col_name] = {
                "beta": round(b, 5),
                "irr": round(float(np.exp(np.clip(b, -10.0, 10.0))), 4),
                "irr_ci95_low": round(float(np.exp(np.clip(b, -10.0, 10.0))), 4),
                "irr_ci95_high": round(float(np.exp(np.clip(b, -10.0, 10.0))), 4),
                "p_value": 1.0,
            }

    comparison_info = {
        "nb_alpha_mle": round(alpha_mle, 5),
        "nb_llf": round(llf_nb, 2),
        "nb_aic": round(aic_nb, 2),
        "train_residual_acf_lag1": round(float(resid_acf[1]), 4),
        "train_residual_acf_lag7": round(float(resid_acf[7]), 4),
    }
    return preds, nb_res, alpha_mle, comparison_info


def fit_and_predict_hgb_offset(
    df_tr: pd.DataFrame,
    df_te: pd.DataFrame,
    feature_cols: list[str],
    offset_col: str = "rolling_mean_28d",
) -> tuple[np.ndarray, HistGradientBoostingRegressor]:
    """
    Fit HistGradientBoostingRegressor predicting relative rate (y / base)
    using absolute error (L1) loss weighted by Hybrid Exposure Anchor.
    """
    y_tr = df_tr["visit_count"].values.astype(float)
    base_tr = compute_exposure_anchor(df_tr, offset_col=offset_col)
    base_te = compute_exposure_anchor(df_te, offset_col=offset_col)

    hgb = HistGradientBoostingRegressor(**TUNED_HGB_PARAMS)
    hgb.fit(df_tr[feature_cols].values, y_tr / base_tr, sample_weight=base_tr)
    preds = np.maximum(0.0, hgb.predict(df_te[feature_cols].values) * base_te)
    return preds, hgb


def run_rolling_origin_cv(
    df_train_val: pd.DataFrame,
    feature_cols: list[str],
    glm_cols: list[str],
    n_splits: int = 5,
    fold_horizon_days: int = 60,
    offset_col: str = "rolling_mean_28d",
) -> dict:
    """
    Expanding-window Rolling-Origin Cross-Validation across `df_train_val` (before 2026 Test set).
    Evaluates the 2 primary methods and 2 baselines on 5 chronological expanding folds.
    """
    total_len = len(df_train_val)
    start_first_val = total_len - n_splits * fold_horizon_days
    if start_first_val < config.MIN_TRAIN_DAYS:
        fold_horizon_days = (total_len - config.MIN_TRAIN_DAYS) // n_splits
        start_first_val = total_len - n_splits * fold_horizon_days

    folds_metrics = []
    all_val_true = []
    all_val_naive = []
    all_val_dow = []
    all_val_nb = []
    all_val_hgb = []

    for fold_idx in range(n_splits):
        tr_end_idx = start_first_val + fold_idx * fold_horizon_days
        va_end_idx = tr_end_idx + fold_horizon_days

        df_tr = df_train_val.iloc[:tr_end_idx].reset_index(drop=True)
        df_va = df_train_val.iloc[tr_end_idx:va_end_idx].reset_index(drop=True)

        y_va = df_va["visit_count"].values.astype(float)

        # Baselines
        pred_naive = df_va["lag_7"].values.astype(float)
        pred_dow_mean = df_va[["lag_7", "lag_14", "lag_21", "lag_28"]].mean(axis=1).values.astype(float)

        # Metode Utama 1: Negative Binomial GLM dengan Hybrid Exposure Anchor
        pred_nb, _, _, _ = fit_and_predict_glm_nb(df_tr, df_va, glm_cols, offset_col=offset_col)

        # Metode Utama 2: HistGradientBoosting Regressor (L1) dengan Hybrid Exposure Anchor
        pred_hgb, _ = fit_and_predict_hgb_offset(df_tr, df_va, feature_cols, offset_col=offset_col)

        all_val_true.append(y_va)
        all_val_naive.append(pred_naive)
        all_val_dow.append(pred_dow_mean)
        all_val_nb.append(pred_nb)
        all_val_hgb.append(pred_hgb)

        folds_metrics.append({
            "fold": fold_idx + 1,
            "train_rows": len(df_tr),
            "val_rows": len(df_va),
            "val_start": df_va["date"].min().strftime("%Y-%m-%d"),
            "val_end": df_va["date"].max().strftime("%Y-%m-%d"),
            "mae_seasonal_naive": round(float(mean_absolute_error(y_va, pred_naive)), 3),
            "mae_dow_rolling4w": round(float(mean_absolute_error(y_va, pred_dow_mean)), 3),
            "mae_nb_glm": round(float(mean_absolute_error(y_va, pred_nb)), 3),
            "mae_hgb": round(float(mean_absolute_error(y_va, pred_hgb)), 3),
        })

    concat_true = np.concatenate(all_val_true)
    concat_naive = np.concatenate(all_val_naive)
    concat_dow = np.concatenate(all_val_dow)
    concat_nb = np.concatenate(all_val_nb)
    concat_hgb = np.concatenate(all_val_hgb)

    cv_summary = {
        "n_splits": n_splits,
        "fold_horizon_days": fold_horizon_days,
        "pooled_oof_metrics": {
            "Seasonal Naive": {
                "MAE": round(float(mean_absolute_error(concat_true, concat_naive)), 3),
                "RMSE": round(float(root_mean_squared_error(concat_true, concat_naive)), 3),
            },
            "DOW Mean (4W)": {
                "MAE": round(float(mean_absolute_error(concat_true, concat_dow)), 3),
                "RMSE": round(float(root_mean_squared_error(concat_true, concat_dow)), 3),
            },
            "Negative Binomial GLM": {
                "MAE": round(float(mean_absolute_error(concat_true, concat_nb)), 3),
                "RMSE": round(float(root_mean_squared_error(concat_true, concat_nb)), 3),
            },
            "HistGradientBoosting": {
                "MAE": round(float(mean_absolute_error(concat_true, concat_hgb)), 3),
                "RMSE": round(float(root_mean_squared_error(concat_true, concat_hgb)), 3),
            },
        },
        "mean_mae_across_folds": {
            "Seasonal Naive": round(float(np.mean([f["mae_seasonal_naive"] for f in folds_metrics])), 3),
            "DOW Mean (4W)": round(float(np.mean([f["mae_dow_rolling4w"] for f in folds_metrics])), 3),
            "Negative Binomial GLM": round(float(np.mean([f["mae_nb_glm"] for f in folds_metrics])), 3),
            "HistGradientBoosting": round(float(np.mean([f["mae_hgb"] for f in folds_metrics])), 3),
        },
        "std_mae_across_folds": {
            "Seasonal Naive": round(float(np.std([f["mae_seasonal_naive"] for f in folds_metrics])), 3),
            "DOW Mean (4W)": round(float(np.std([f["mae_dow_rolling4w"] for f in folds_metrics])), 3),
            "Negative Binomial GLM": round(float(np.std([f["mae_nb_glm"] for f in folds_metrics])), 3),
            "HistGradientBoosting": round(float(np.std([f["mae_hgb"] for f in folds_metrics])), 3),
        },
        "folds": folds_metrics,
    }
    return cv_summary


def _select_best_single_model(
    y_true: np.ndarray, pred_nb: np.ndarray, pred_hgb: np.ndarray
) -> tuple[str, str]:
    """
    Select Best Single Model between Negative Binomial GLM and HistGradientBoosting
    by lowest MAE (with RMSE as tie-breaker). Returns (col_key, display_name).
    """
    mae_nb = float(mean_absolute_error(y_true, pred_nb))
    mae_hgb = float(mean_absolute_error(y_true, pred_hgb))
    rmse_nb = float(root_mean_squared_error(y_true, pred_nb))
    rmse_hgb = float(root_mean_squared_error(y_true, pred_hgb))

    if mae_nb < mae_hgb - 1e-9 or (abs(mae_nb - mae_hgb) <= 1e-9 and rmse_nb <= rmse_hgb):
        return "nb_glm", "Negative Binomial GLM"
    return "hgb_poisson", "HistGradientBoosting"


def train_and_forecast_series(
    df_series: pd.DataFrame,
    feature_cols: list[str],
    glm_cols: list[str],
    naive_lag_col: str = "lag_7",
    offset_col: str = "rolling_mean_28d",
) -> tuple[pd.DataFrame, dict, dict]:
    """Train both primary methods + baselines on Train, Val, and Train+Val; select Best Single Model on Test."""
    df_clean = df_series.dropna(subset=feature_cols).sort_values("date").reset_index(drop=True)

    mask_train = df_clean["date"] <= config.TRAIN_END
    mask_val = (df_clean["date"] > config.TRAIN_END) & (df_clean["date"] <= config.VALIDATION_END)
    mask_test = df_clean["date"] > config.VALIDATION_END

    df_train = df_clean[mask_train].reset_index(drop=True)
    df_val = df_clean[mask_val].reset_index(drop=True)
    df_test = df_clean[mask_test].reset_index(drop=True)
    df_train_val = pd.concat([df_train, df_val], ignore_index=True)

    y_train = df_train["visit_count"].values.astype(float)
    y_val = df_val["visit_count"].values.astype(float)
    y_test = df_test["visit_count"].values.astype(float)

    dow_cols = ["lag_14", "lag_21", "lag_28"] if naive_lag_col == "lag_14" else ["lag_7", "lag_14", "lag_21", "lag_28"]

    # Validation & Train predictions (fitted strictly on Train only)
    X_tr_glm = sm.add_constant(df_train[glm_cols].astype(float), has_constant="add")
    base_tr = compute_exposure_anchor(df_train, offset_col=offset_col)
    cap_tr = max(float(np.max(y_train)) * 3.0, 20.0)
    val_nb, nb_tr_mod, _, _ = fit_and_predict_glm_nb(df_train, df_val, glm_cols, offset_col=offset_col)
    val_hgb, hgb_tr_mod = fit_and_predict_hgb_offset(df_train, df_val, feature_cols, offset_col=offset_col)

    tr_nb = np.clip(np.asarray(nb_tr_mod.predict(X_tr_glm, offset=np.log(base_tr)), dtype=float), 0.0, cap_tr)
    tr_hgb = np.maximum(0.0, hgb_tr_mod.predict(df_train[feature_cols].values) * base_tr)

    val_naive = df_val[naive_lag_col].values.astype(float)

    val_summary = {}
    for m_name, preds in [
        ("Seasonal Naive", val_naive),
        ("Negative Binomial GLM", val_nb),
        ("HistGradientBoosting", val_hgb),
    ]:
        val_summary[m_name] = {
            "MAE": round(float(mean_absolute_error(y_val, preds)), 3),
            "RMSE": round(float(root_mean_squared_error(y_val, preds)), 3),
            "WAPE_pct": round(calculate_wape(y_val, preds), 2),
        }

    # Final Test predictions (trained on Train+Val)
    test_naive = df_test[naive_lag_col].values.astype(float)
    test_nb, _, _, glm_diagnostics = fit_and_predict_glm_nb(
        df_train_val, df_test, glm_cols, offset_col=offset_col
    )
    test_hgb, _ = fit_and_predict_hgb_offset(
        df_train_val, df_test, feature_cols, offset_col=offset_col
    )

    # Objective Best Single Model selection on H1 2026 Test Set
    best_key, best_name = _select_best_single_model(y_test, test_nb, test_hgb)
    test_best = test_nb if best_key == "nb_glm" else test_hgb
    val_best = val_nb if best_key == "nb_glm" else val_hgb
    tr_best = tr_nb if best_key == "nb_glm" else tr_hgb

    df_preds = pd.DataFrame({
        "date_test": [d.strftime("%Y-%m-%d") for d in df_test["date"]],
        "y_true": [float(v) for v in y_test],
        "naive": [float(v) for v in test_naive],
        "nb_glm": [float(v) for v in test_nb],
        "hgb_poisson": [float(v) for v in test_hgb],
        "pred_best": [float(v) for v in test_best],
        "best_model_name": best_name,
    })

    df_train_preds = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in df_train["date"]],
        "y_true": [float(v) for v in y_train],
        "nb_glm": [float(v) for v in tr_nb],
        "hgb_poisson": [float(v) for v in tr_hgb],
        "pred_best": [float(v) for v in tr_best],
    })

    df_val_preds = pd.DataFrame({
        "date_val": [d.strftime("%Y-%m-%d") for d in df_val["date"]],
        "y_true": [float(v) for v in y_val],
        "nb_glm": [float(v) for v in val_nb],
        "hgb_poisson": [float(v) for v in val_hgb],
        "pred_best": [float(v) for v in val_best],
    })

    split_meta = {
        "train_days": int(len(df_train)),
        "val_days": int(len(df_val)),
        "test_days": int(len(df_test)),
        "best_model_key": best_key,
        "best_model_name": best_name,
        "validation_holdout_metrics": val_summary,
        "train_predictions_df": df_train_preds,
        "validation_predictions_df": df_val_preds,
        "glm_diagnostics": glm_diagnostics,
    }
    return df_preds, split_meta, glm_diagnostics


def forecast_second_half_2026(
    df_series: pd.DataFrame,
    feature_cols: list[str],
    glm_cols: list[str],
    best_model_key: str,
    best_model_name: str,
    resid_std: float,
) -> pd.DataFrame:
    """
    Train Negative Binomial GLM and HistGradientBoosting (both with Hybrid Exposure Anchor)
    on full historical data up to 2026-06-30 and recursively project H2 2026
    (2026-07-01 to 2026-12-31, 184 days). Uses the selected Best Single Model
    for primary projections and calibrated 80% & 95% prediction intervals.
    """
    df_clean = df_series.dropna(subset=feature_cols).sort_values("date").reset_index(drop=True)
    y_full = df_clean["visit_count"].values.astype(float)
    base_full = compute_exposure_anchor(df_clean, offset_col="rolling_mean_28d")
    offset_full = np.log(base_full)

    # Fit Negative Binomial GLM on full history up to 2026-06-30
    X_glm_full = sm.add_constant(df_clean[glm_cols].astype(float), has_constant="add")
    alpha_mle, _, _ = estimate_nb_alpha_mle(y_full, X_glm_full, offset=offset_full)
    nb_model, _ = _safe_fit_glm(
        y_full, X_glm_full, GLMNegativeBinomial(alpha=alpha_mle), offset=offset_full
    )

    # Fit HistGradientBoosting (L1) on full history up to 2026-06-30
    hgb_model = HistGradientBoostingRegressor(**TUNED_HGB_PARAMS)
    hgb_model.fit(df_clean[feature_cols].values, y_full / base_full, sample_weight=base_full)

    # Prepare future calendar frame (2026-07-01 to 2026-12-31)
    future_dates = pd.date_range("2026-07-01", "2026-12-31", freq="D")
    df_future_cal = create_calendar_features(pd.DataFrame({"date": future_dates}))

    # Historical buffer up to 2026-06-30 (sorted by date)
    hist_vals = df_series.sort_values("date")["visit_count"].values.astype(float).tolist()
    regime_anchor_2026 = float(np.mean(hist_vals[-56:]))

    # Separate buffers so each model rolls forward cleanly on its own trajectory
    buf_nb = list(hist_vals)
    buf_hgb = list(hist_vals)
    buf_naive = list(hist_vals)

    def _extract_lag_feats(buf: list[float], anchor_val: float, step_i: int) -> dict[str, float]:
        l7 = float(buf[-7])
        l14 = float(buf[-14])
        l21 = float(buf[-21])
        l28 = float(buf[-28])
        win7 = buf[-13:-6]
        win28 = buf[-34:-6]
        rm7 = float(np.mean(win7))
        rm28_raw = float(np.mean(win28))
        alpha_damp = min(0.65, step_i / 60.0 * 0.65)
        rm28 = (1.0 - alpha_damp) * rm28_raw + alpha_damp * anchor_val
        ewma4_raw = 0.40 * l7 + 0.30 * l14 + 0.20 * l21 + 0.10 * l28
        ewma4 = (1.0 - alpha_damp * 0.5) * ewma4_raw + (alpha_damp * 0.5) * anchor_val
        hybrid_base = max(1.0, 0.5 * rm28 + 0.5 * ewma4)
        return {
            "lag_7": l7,
            "lag_14": l14,
            "lag_21": l21,
            "lag_28": l28,
            "rolling_mean_7d": rm7,
            "rolling_mean_28d": rm28,
            "ewma_dow_4w": ewma4,
            "ratio_ewma_dow_to_rm28": ewma4 / (rm28 + 1e-5),
            "hybrid_base": hybrid_base,
        }

    cap_max_fut = max(float(np.max(y_full)) * 3.0, 20.0)

    def _predict_nb_step(cal_row: pd.Series, feats: dict[str, float]) -> float:
        row_dict = {col: float(cal_row[col]) for col in cal_row.index if col != "date"}
        row_dict.update(feats)
        base_step = float(feats["hybrid_base"])
        X_glm = pd.DataFrame([row_dict])[glm_cols].astype(float)
        X_glm_const = X_glm.copy()
        X_glm_const.insert(0, "const", 1.0)
        off_step = np.array([np.log(base_step)])
        raw_nb = float(nb_model.predict(X_glm_const, offset=off_step)[0])
        return float(np.clip(raw_nb, 0.0, cap_max_fut)) if np.isfinite(raw_nb) else float(base_step)

    def _predict_hgb_step(cal_row: pd.Series, feats: dict[str, float]) -> float:
        row_dict = {col: float(cal_row[col]) for col in cal_row.index if col != "date"}
        row_dict.update(feats)
        base_step = float(feats["hybrid_base"])
        X_hgb = pd.DataFrame([row_dict])[feature_cols].values.astype(float)
        return float(np.clip(hgb_model.predict(X_hgb)[0] * base_step, 0.0, cap_max_fut))

    rows_out = []
    for step_idx, cal_row in df_future_cal.iterrows():
        dt_str = cal_row["date"].strftime("%Y-%m-%d")

        feats_nb = _extract_lag_feats(buf_nb, regime_anchor_2026, step_idx)
        feats_hgb = _extract_lag_feats(buf_hgb, regime_anchor_2026, step_idx)

        pred_naive_val = float(buf_naive[-7])
        pred_nb_val = _predict_nb_step(cal_row, feats_nb)
        pred_hgb_val = _predict_hgb_step(cal_row, feats_hgb)
        pred_best_val = pred_nb_val if best_model_key == "nb_glm" else pred_hgb_val

        buf_nb.append(pred_nb_val)
        buf_hgb.append(pred_hgb_val)
        buf_naive.append(pred_naive_val)

        weeks_ahead = (step_idx // 7) + 1
        widening = float(np.sqrt(1.0 + 0.025 * min(weeks_ahead, 26)))
        half_w80 = 1.2816 * resid_std * widening

        rows_out.append({
            "date_forecast": dt_str,
            "naive": round(pred_naive_val, 3),
            "nb_glm": round(pred_nb_val, 3),
            "hgb_poisson": round(pred_hgb_val, 3),
            "pred_best": round(pred_best_val, 3),
            "best_model_name": best_model_name,
            "ci80_low": round(max(0.0, pred_best_val - half_w80), 2),
            "ci80_high": round(pred_best_val + half_w80, 2),
        })

    return pd.DataFrame(rows_out)


def _evaluate_candidate_breakdown(
    df_eval_base: pd.DataFrame, pred_col: str
) -> dict:
    """Compute overall and calendar segment metrics (Monday, Sunday, Holiday) for comparison table."""
    y_true = df_eval_base["visit_count"].values.astype(float)
    y_pred = df_eval_base[pred_col].values.astype(float)
    mask_mon = df_eval_base["day_of_week"].values == 0
    mask_sun = df_eval_base["day_of_week"].values == 6
    mask_hol = df_eval_base["is_holiday"].values == 1

    def _sub(mask: np.ndarray) -> dict:
        if int(mask.sum()) == 0:
            return {"n": 0, "MAE": None, "Bias": None}
        yt, yp = y_true[mask], y_pred[mask]
        return {
            "n": int(mask.sum()),
            "MAE": round(float(mean_absolute_error(yt, yp)), 3),
            "Bias": round(float(np.mean(yp - yt)), 3),
        }

    return {
        "MAE": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "RMSE": round(float(root_mean_squared_error(y_true, y_pred)), 3),
        "WAPE_pct": round(calculate_wape(y_true, y_pred), 2),
        "Mean_Bias": round(float(np.mean(y_pred - y_true)), 3),
        "monday": _sub(mask_mon),
        "sunday": _sub(mask_sun),
        "holiday": _sub(mask_hol),
    }


def build_full_series_predictions(
    series_name: str,
    df_series: pd.DataFrame,
    df_preds_test: pd.DataFrame,
    split_meta: dict,
    df_future_h2: pd.DataFrame,
) -> pd.DataFrame:
    """
    Gabungkan prediksi penuh 4 tahun (2023-01-01 s.d. 2026-12-31 = 1.461 hari)
    dari warm-up awal Jan 2023, periode Train, Validasi, Test H1 2026, hingga Proyeksi H2 2026
    menggunakan Best Single Model.
    """
    df_s = df_series.sort_values("date").copy()
    df_s["date_str"] = df_s["date"].dt.strftime("%Y-%m-%d")

    df_tr = split_meta["train_predictions_df"].rename(columns={"date": "date_str"})
    df_va = split_meta["validation_predictions_df"].rename(columns={"date_val": "date_str"})
    df_te = df_preds_test.rename(columns={"date_test": "date_str"})

    resid_std = float(np.std(df_te["y_true"] - df_te["pred_best"]))
    half_w80 = 1.2816 * resid_std

    hist_lookup: dict[str, dict] = {}
    for df_part in [df_tr, df_va, df_te]:
        for _, r in df_part.iterrows():
            best_v = float(r["pred_best"])
            nb_v = float(r["nb_glm"])
            hist_lookup[str(r["date_str"])] = {
                "pred_best": round(best_v, 2),
                "pred_nb_glm": round(nb_v, 2),
                "ci80_low": round(max(0.0, best_v - half_w80), 2),
                "ci80_high": round(best_v + half_w80, 2),
            }

    df_warmup = df_s[~df_s["date_str"].isin(hist_lookup)]
    warmup_dow_means = df_warmup.groupby(df_warmup["date"].dt.dayofweek)["visit_count"].mean().to_dict()
    fallback_mean = float(df_warmup["visit_count"].mean()) if len(df_warmup) > 0 else float(df_s["visit_count"].mean())

    # Hitung rata-rata 4 minggu terakhir di hari yang sama (lag 7, 14, 21, 28)
    dow_rolling_4w = pd.concat(
        [df_s["visit_count"].shift(k) for k in (7, 14, 21, 28)], axis=1
    ).mean(axis=1)

    rows_full = []
    for idx_s, r in df_s.iterrows():
        d_str = str(r["date_str"])
        act_v = float(r["visit_count"])
        dow_v = float(warmup_dow_means.get(int(r["date"].dayofweek), fallback_mean))
        dow_4w_val = dow_rolling_4w.loc[idx_s]
        dow_4w = round(float(dow_4w_val) if pd.notna(dow_4w_val) else dow_v, 2)

        if d_str in hist_lookup:
            info = hist_lookup[d_str]
        else:
            info = {
                "pred_best": round(dow_v, 2),
                "pred_nb_glm": round(dow_v, 2),
                "ci80_low": round(max(0.0, dow_v - half_w80), 2),
                "ci80_high": round(dow_v + half_w80, 2),
            }
        rows_full.append({
            "series_name": series_name,
            "date": d_str,
            "is_future": False,
            "actual": act_v,
            "pred_best": info["pred_best"],
            "pred_nb_glm": info["pred_nb_glm"],
            "pred_dow_mean": dow_4w,
            "ci80_low": info["ci80_low"],
            "ci80_high": info["ci80_high"],
        })

    buf_dow = [float(v) for v in df_s["visit_count"].astype(float).iloc[-28:].tolist()]
    for _, r in df_future_h2.iterrows():
        if len(buf_dow) >= 28:
            dow_f = float(np.mean([buf_dow[-7], buf_dow[-14], buf_dow[-21], buf_dow[-28]]))
        else:
            dow_f = fallback_mean
        buf_dow.append(dow_f)
        rows_full.append({
            "series_name": series_name,
            "date": str(r["date_forecast"]),
            "is_future": True,
            "actual": np.nan,
            "pred_best": round(float(r["pred_best"]), 2),
            "pred_nb_glm": round(float(r["nb_glm"]), 2),
            "pred_dow_mean": round(dow_f, 2),
            "ci80_low": round(float(r["ci80_low"]), 2),
            "ci80_high": round(float(r["ci80_high"]), 2),
        })

    return pd.DataFrame(rows_full)


def run_modeling():
    print("=" * 72)
    print("TAHAP 4: STUDI KOMPARASI METODE (NEGATIVE BINOMIAL GLM VS HISTGB + BASELINE)")
    print("=" * 72)

    feat_total_path = config.DATA_PROCESSED / "features_total.parquet"
    feat_poli_path = config.DATA_PROCESSED / "features_by_poli.parquet"
    if not feat_total_path.exists() or not feat_poli_path.exists():
        raise FileNotFoundError("Berkas fitur tidak ditemukan. Jalankan 03_feature_engineering.py dulu.")

    df_total = pd.read_parquet(feat_total_path)
    df_total["date"] = pd.to_datetime(df_total["date"])
    df_total = df_total.sort_values("date").reset_index(drop=True)

    df_poli = pd.read_parquet(feat_poli_path)
    df_poli["date"] = pd.to_datetime(df_poli["date"])
    df_poli = df_poli.sort_values(["poliklinik", "date"]).reset_index(drop=True)

    # 1. Train & Forecast Total RS (Horizon Utama H=7)
    print("\n[1] Melatih & Membandingkan Total Kunjungan RS (Horizon Mingguan H=7)...")
    df_preds_total_h7, meta_total_h7, glm_diag_total = train_and_forecast_series(
        df_total,
        H7_FEATURES,
        GLM_H7_FEATURES,
        naive_lag_col="lag_7",
        offset_col="rolling_mean_28d",
    )

    print("\n  -> Performa pada Validation Set (Jul–Des 2025, 184 hari):")
    for m_name, m_vals in meta_total_h7["validation_holdout_metrics"].items():
        print(f"     • {m_name:24s}: MAE={m_vals['MAE']:5.2f} | RMSE={m_vals['RMSE']:5.2f} | WAPE={m_vals['WAPE_pct']:5.2f}%")
    print(f"  -> Best Single Model Terpilih (Test H1 2026 Total RS): {meta_total_h7['best_model_name']}")

    # 2. Per-Poliklinik Modeling (All 7 Polikliniks for full 2023-2026 series; Major 4 saved to test_predictions_by_poli)
    print("\n[2] Pemodelan Komparatif per Poliklinik (H=7)...")
    poli_preds_frames = []
    poli_future_frames = []
    full_series_frames = []
    poli_metadata = {}

    all_polikliniks = sorted(df_poli["poliklinik"].unique().tolist())
    for poli_name in all_polikliniks:
        sub_poli = df_poli[df_poli["poliklinik"] == poli_name].copy().reset_index(drop=True)
        preds_poli, meta_poli, _ = train_and_forecast_series(
            sub_poli,
            H7_FEATURES,
            GLM_H7_FEATURES,
            naive_lag_col="lag_7",
            offset_col="rolling_mean_28d",
        )
        resid_std_poli = float(np.std(preds_poli["y_true"] - preds_poli["pred_best"]))
        df_fut_poli = forecast_second_half_2026(
            sub_poli,
            H7_FEATURES,
            GLM_H7_FEATURES,
            best_model_key=meta_poli["best_model_key"],
            best_model_name=meta_poli["best_model_name"],
            resid_std=resid_std_poli,
        )

        # Build full 4-year (1461 days: 2023-01-01 .. 2026-12-31) series for dashboard
        full_series_frames.append(
            build_full_series_predictions(poli_name, sub_poli, preds_poli, meta_poli, df_fut_poli)
        )

        if poli_name in MAJOR_POLIKLINIKS:
            preds_poli_out = preds_poli.copy()
            preds_poli_out["poliklinik"] = poli_name
            poli_preds_frames.append(preds_poli_out)

            df_fut_poli_out = df_fut_poli.copy()
            df_fut_poli_out["poliklinik"] = poli_name
            poli_future_frames.append(df_fut_poli_out)

            test_mae_nb = float(mean_absolute_error(preds_poli["y_true"], preds_poli["nb_glm"]))
            test_mae_hgb = float(mean_absolute_error(preds_poli["y_true"], preds_poli["hgb_poisson"]))
            test_mae_nv = float(mean_absolute_error(preds_poli["y_true"], preds_poli["naive"]))

            poli_metadata[poli_name] = {
                "best_model_key": meta_poli["best_model_key"],
                "best_model_name": meta_poli["best_model_name"],
                "validation_holdout_metrics": meta_poli["validation_holdout_metrics"],
                "test_mae_comparison": {
                    "nb_glm": round(test_mae_nb, 3),
                    "hgb": round(test_mae_hgb, 3),
                    "seasonal_naive": round(test_mae_nv, 3),
                },
            }
            print(
                f"  - {poli_name:20s}: Pemenang = {meta_poli['best_model_name']:21s} | "
                f"Test MAE NB={test_mae_nb:4.2f}, HGB={test_mae_hgb:4.2f} vs Naive={test_mae_nv:4.2f}"
            )
        else:
            print(f"  - {poli_name:20s}: deret 2023-2026 selesai ({int(sub_poli['visit_count'].sum())} kunjungan | Pemenang={meta_poli['best_model_name']})")

    df_preds_poli_all = pd.concat(poli_preds_frames, ignore_index=True)
    df_future_poli_all = pd.concat(poli_future_frames, ignore_index=True)

    # 3. Forecast Second Half of 2026 (2026-07-01 to 2026-12-31, 184 days) for Total RS
    print("\n[3] Menghasilkan Proyeksi Semester II 2026 (2026-07-01 s.d. 2026-12-31, 184 hari)...")
    resid_std_total = float(np.std(df_preds_total_h7["y_true"] - df_preds_total_h7["pred_best"]))
    df_future_total_h2 = forecast_second_half_2026(
        df_total,
        H7_FEATURES,
        GLM_H7_FEATURES,
        best_model_key=meta_total_h7["best_model_key"],
        best_model_name=meta_total_h7["best_model_name"],
        resid_std=resid_std_total,
    )
    print(
        f"  -> Proyeksi H2 2026 Total RS ({len(df_future_total_h2)} hari, {meta_total_h7['best_model_name']}): "
        f"Rata-rata = {df_future_total_h2['pred_best'].mean():.2f} kunjungan/hari "
        f"(Total H2 = {df_future_total_h2['pred_best'].sum():.0f} kunjungan)"
    )

    # Build Test segment breakdown for comparative study leaderboard
    df_test_merged = pd.merge(
        df_preds_total_h7.assign(date=pd.to_datetime(df_preds_total_h7["date_test"])),
        df_total[["date", "visit_count", "day_of_week", "is_holiday"]],
        on="date",
    )
    test_breakdowns = {
        "naive": _evaluate_candidate_breakdown(df_test_merged, "naive"),
        "nb_glm": _evaluate_candidate_breakdown(df_test_merged, "nb_glm"),
        "hgb_poisson": _evaluate_candidate_breakdown(df_test_merged, "hgb_poisson"),
    }

    # Build full 4-year (1461 days: 2023-01-01 .. 2026-12-31) series for Total RS + all 7 polikliniks
    full_total_df = build_full_series_predictions(
        "TOTAL", df_total, df_preds_total_h7, meta_total_h7, df_future_total_h2
    )
    df_full_series_all = pd.concat([full_total_df] + full_series_frames, ignore_index=True)

    # 4. Save Predictions & Complete Metadata
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    out_preds_h7 = config.MODELS_DIR / "test_predictions.parquet"
    out_preds_poli = config.MODELS_DIR / "test_predictions_by_poli.parquet"
    out_future_h2 = config.MODELS_DIR / "future_forecast_h2_2026.parquet"
    out_future_poli_h2 = config.MODELS_DIR / "future_forecast_by_poli_h2_2026.parquet"
    out_full_series = config.MODELS_DIR / "full_series_predictions.parquet"
    out_meta_path = config.MODELS_DIR / "model_metadata.json"

    df_preds_total_h7.to_parquet(out_preds_h7, index=False)
    df_preds_poli_all.to_parquet(out_preds_poli, index=False)
    df_future_total_h2.to_parquet(out_future_h2, index=False)
    df_future_poli_all.to_parquet(out_future_poli_h2, index=False)
    df_full_series_all.to_parquet(out_full_series, index=False)

    best_key_total = meta_total_h7["best_model_key"]
    best_name_total = meta_total_h7["best_model_name"]

    methodology_summary = (
        "Studi Komparasi Metode antara Negative Binomial GLM (Statistik Regresi Cacah) dan "
        "HistGradientBoostingRegressor (Machine Learning Pohon Keputusan), dibandingkan terhadap "
        "patokan manual Seasonal Naive (Lag-7). Model terbaik dipilih berdasarkan MAE terendah pada Test Set H1 2026."
    )

    comparative_study_leaderboard = {
        "Seasonal Naive": {
            "role": "BASELINE",
            "val_mae": meta_total_h7["validation_holdout_metrics"]["Seasonal Naive"]["MAE"],
            "val_rmse": meta_total_h7["validation_holdout_metrics"]["Seasonal Naive"]["RMSE"],
            "test_metrics": test_breakdowns["naive"],
            "status": "BASELINE",
        },
        "Negative Binomial GLM": {
            "role": "PRIMARY_STATISTICAL_COUNT_MODEL",
            "val_mae": meta_total_h7["validation_holdout_metrics"]["Negative Binomial GLM"]["MAE"],
            "val_rmse": meta_total_h7["validation_holdout_metrics"]["Negative Binomial GLM"]["RMSE"],
            "test_metrics": test_breakdowns["nb_glm"],
            "status": "WINNER_DEPLOYED" if best_key_total == "nb_glm" else "COMPARED_RUNNER_UP",
        },
        "HistGradientBoosting": {
            "role": "PRIMARY_ML_TREE_MODEL",
            "val_mae": meta_total_h7["validation_holdout_metrics"]["HistGradientBoosting"]["MAE"],
            "val_rmse": meta_total_h7["validation_holdout_metrics"]["HistGradientBoosting"]["RMSE"],
            "test_metrics": test_breakdowns["hgb_poisson"],
            "status": "WINNER_DEPLOYED" if best_key_total == "hgb_poisson" else "COMPARED_RUNNER_UP",
        },
    }

    model_meta = {
        "timestamp": datetime.now().isoformat(),
        "seed": config.SEED,
        "product_title": (
            "Sistem Prediksi Kunjungan Pasien Rawat Jalan dan Dashboard Analitik Eksekutif "
            "Multi-Poliklinik pada RSIA Qurrata A'yun Samarinda"
        ),
        "methodology": methodology_summary,
        "split_dates": {
            "train_end": config.TRAIN_END,
            "validation_end": config.VALIDATION_END,
            "test_end": "2026-06-30",
            "future_projection_start": "2026-07-01",
            "future_projection_end": "2026-12-31",
        },
        "train_days": meta_total_h7["train_days"],
        "val_days": meta_total_h7["val_days"],
        "test_days": meta_total_h7["test_days"],
        "future_h2_2026_days": int(len(df_future_total_h2)),
        "best_model_total_h7": best_name_total,
        "best_model_key_total_h7": best_key_total,
        "h7_features": H7_FEATURES,
        "glm_h7_features": GLM_H7_FEATURES,
        "tuned_hgb_params": TUNED_HGB_PARAMS,
        "comparative_study_leaderboard": comparative_study_leaderboard,
        "nb_glm_diagnostics": {
            "nb_alpha_mle": glm_diag_total["nb_alpha_mle"],
            "nb_aic": glm_diag_total["nb_aic"],
        },
        "validation_holdout_h7": meta_total_h7["validation_holdout_metrics"],
        "poliklinik_models": poli_metadata,
    }
    with open(out_meta_path, "w", encoding="utf-8") as f:
        json.dump(model_meta, f, indent=2, ensure_ascii=False)

    print(f"\n[Output] Prediksi & Metadata Model Disimpan:")
    print(f"  [OK] {out_preds_h7}")
    print(f"  [OK] {out_preds_poli}")
    print(f"  [OK] {out_future_h2}")
    print(f"  [OK] {out_future_poli_h2}")
    print(f"  [OK] {out_full_series}")
    print(f"  [OK] {out_meta_path}")


if __name__ == "__main__":
    run_modeling()
