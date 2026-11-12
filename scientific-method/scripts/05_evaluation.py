#!/usr/bin/env python3
"""
05_evaluation.py — Tahap 5: Evaluasi Independen, Uji Diebold-Mariano & Analisis Segmen
=====================================================================================
Pipeline Scientific Method untuk prediksi kunjungan pasien rawat jalan RSIA Qurrata A'yun
Samarinda (Studi Komparasi Metode: Negative Binomial GLM vs HistGradientBoosting + Baseline).

Evaluasi yang Dilakukan:
  1. Metrik Titik pada Test Set (Jan-Jun 2026, 181 hari) untuk H=7 dan Sensitivitas H=14:
     - MAE, RMSE, WAPE, sMAPE, Mean Bias, R2, dan MASE.
  2. Uji Signifikansi Statistik Diebold-Mariano (DM) dengan koreksi Harvey-Leybourne-Newbold (HLN)
     membandingkan masing-masing metode utama terhadap baseline serta antar kedua metode utama.
  3. Evaluasi Klasifikasi Tingkat Kepadatan (Ambang Statis Latih vs Ambang Relatif Tren 28 Hari).
  4. Analisis Kinerja per Poliklinik Utama (OBGYN, UMUM, ANAK, UNIT IGD) & Segmen Operasional
     (Hari Kerja vs Libur Nasional, Ramadan vs Luar Ramadan, Hari Puncak, dan Hari dalam Seminggu).
  5. Interpretabilitas: IRR Negative Binomial GLM (exp(beta), 95% CI, p-value) & Permutation
     Feature Importance HistGradientBoosting.
  6. Diagnostik Residu Best Single Model (mean, std dev, ACF lag 1, 7, 14).

PRIVACY: Tidak ada data identitas pasien, rekam medis, atau nama dokter yang diproses.
"""

from __future__ import annotations

import json
import sys
import warnings
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    root_mean_squared_error,
)
from statsmodels.tsa.stattools import acf

# Project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config

warnings.filterwarnings("ignore")


def compute_regression_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_train: np.ndarray, seasonality: int = 7
) -> dict:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    sum_true = float(np.sum(y_true))
    wape = float(np.sum(np.abs(y_true - y_pred)) / (sum_true + 1e-5) * 100.0)

    denom = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    smape = float(np.mean(np.abs(y_true - y_pred) / (denom + 1e-5)) * 100.0)
    bias = float(np.mean(y_pred - y_true))
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 2 and np.var(y_true) > 0 else 0.0

    mae_naive_in = float(np.mean(np.abs(y_train[seasonality:] - y_train[:-seasonality])))
    mase = float(mae / (mae_naive_in + 1e-5))

    return {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "WAPE_pct": round(wape, 2),
        "sMAPE_pct": round(smape, 2),
        "Mean_Bias": round(bias, 3),
        "MASE": round(mase, 3),
        "R2": round(r2, 3),
    }


def diebold_mariano_test(
    y_true: np.ndarray, y_pred_1: np.ndarray, y_pred_2: np.ndarray, horizon: int = 1
) -> dict:
    """
    Diebold-Mariano test on absolute error loss d_t = |e_1t| - |e_2t|.
    Negative DM statistic means Model 1 has smaller error than Model 2.
    Includes Harvey, Leybourne, and Newbold (1997) finite-sample correction.
    """
    e1 = np.abs(y_true - y_pred_1)
    e2 = np.abs(y_true - y_pred_2)
    d = e1 - e2
    T = len(d)
    d_mean = float(np.mean(d))
    d_centered = d - d_mean

    gamma0 = float(np.sum(d_centered ** 2) / T)
    var_d = gamma0
    for k in range(1, horizon):
        gamma_k = float(np.sum(d_centered[k:] * d_centered[:-k]) / T)
        weight = 1.0 - (k / horizon)
        var_d += 2.0 * weight * gamma_k

    var_d = max(var_d / T, 1e-12)
    dm_stat = d_mean / np.sqrt(var_d)

    # HLN small-sample adjustment
    hln_factor = np.sqrt((T + 1 - 2 * horizon + (horizon * (horizon - 1)) / T) / T)
    dm_hln = float(dm_stat * hln_factor)
    p_value = float(2.0 * stats.t.sf(np.abs(dm_hln), df=T - 1))

    return {
        "mean_loss_diff_mae": round(d_mean, 4),
        "dm_stat_hln": round(dm_hln, 4),
        "p_value": round(p_value, 6),
        "significant_at_05": bool(p_value < 0.05),
    }


def categorize_load(values: np.ndarray, q1: float, q3: float) -> list[str]:
    labels = []
    for v in values:
        if v < q1:
            labels.append("Sepi")
        elif v <= q3:
            labels.append("Sedang")
        else:
            labels.append("Sibuk")
    return labels


def evaluate_classification(cat_true: list[str], cat_pred: list[str]) -> dict:
    classes = ["Sepi", "Sedang", "Sibuk"]
    cm = confusion_matrix(cat_true, cat_pred, labels=classes).tolist()
    prec_per = precision_score(cat_true, cat_pred, labels=classes, average=None, zero_division=0)
    rec_per = recall_score(cat_true, cat_pred, labels=classes, average=None, zero_division=0)
    f1_per = f1_score(cat_true, cat_pred, labels=classes, average=None, zero_division=0)

    return {
        "confusion_matrix_labels": classes,
        "confusion_matrix": cm,
        "per_class": {
            c: {
                "precision": round(float(prec_per[i]), 3),
                "recall": round(float(rec_per[i]), 3),
                "f1": round(float(f1_per[i]), 3),
            }
            for i, c in enumerate(classes)
        },
        "recall_sibuk": round(float(rec_per[2]), 3),
        "precision_sibuk": round(float(prec_per[2]), 3),
        "f1_macro": round(float(f1_score(cat_true, cat_pred, labels=classes, average="macro", zero_division=0)), 3),
        "f1_weighted": round(float(f1_score(cat_true, cat_pred, labels=classes, average="weighted", zero_division=0)), 3),
    }


def compute_hgb_permutation_importance(
    df_feat: pd.DataFrame, feature_cols: list[str], tuned_params: dict | None = None
) -> dict:
    df_clean = df_feat.dropna(subset=feature_cols).sort_values("date").reset_index(drop=True)
    df_tv = df_clean[df_clean["date"] <= config.VALIDATION_END]
    df_te = df_clean[df_clean["date"] > config.VALIDATION_END]

    def _anchor(sub: pd.DataFrame) -> np.ndarray:
        rm = sub["rolling_mean_28d"].values.astype(float)
        if "ewma_dow_4w" in sub.columns:
            ew = sub["ewma_dow_4w"].values.astype(float)
            return np.maximum(1.0, 0.5 * rm + 0.5 * ew)
        return np.maximum(1.0, rm)

    y_tv = df_tv["visit_count"].values.astype(float)
    base_tv = _anchor(df_tv)
    y_te = df_te["visit_count"].values.astype(float)
    base_te = _anchor(df_te)

    hgb_cfg = tuned_params or {
        "loss": "absolute_error", "learning_rate": 0.03, "max_iter": 120,
        "max_depth": 3, "min_samples_leaf": 25, "l2_regularization": 10.0, "random_state": config.SEED,
    }
    model = HistGradientBoostingRegressor(**hgb_cfg)
    model.fit(df_tv[feature_cols].values, y_tv / base_tv, sample_weight=base_tv)

    X_te_orig = df_te[feature_cols].values.copy()
    baseline_preds = model.predict(X_te_orig) * base_te
    baseline_mae = float(mean_absolute_error(y_te, baseline_preds))

    rng = np.random.RandomState(config.SEED)
    n_repeats = 20
    means = np.zeros(len(feature_cols))
    stds = np.zeros(len(feature_cols))

    for col_idx in range(len(feature_cols)):
        diffs = []
        for _ in range(n_repeats):
            X_perm = X_te_orig.copy()
            X_perm[:, col_idx] = rng.permutation(X_perm[:, col_idx])
            preds_perm = model.predict(X_perm) * base_te
            diffs.append(float(mean_absolute_error(y_te, preds_perm)) - baseline_mae)
        means[col_idx] = float(np.mean(diffs))
        stds[col_idx] = float(np.std(diffs))

    imp_dict = {}
    order = np.argsort(means)[::-1]
    for idx in order:
        fname = feature_cols[idx]
        imp_dict[fname] = {
            "mean_mae_increase": round(float(means[idx]), 4),
            "std_mae_increase": round(float(stds[idx]), 4),
        }
    return imp_dict


def run_evaluation():
    print("=" * 72)
    print("TAHAP 5: EVALUASI INDEPENDEN, UJI DIEBOLD-MARIANO & ANALISIS SEGMEN")
    print("=" * 72)

    preds_h7_path = config.MODELS_DIR / "test_predictions.parquet"
    preds_h14_path = config.MODELS_DIR / "test_predictions_h14.parquet"
    preds_poli_path = config.MODELS_DIR / "test_predictions_by_poli.parquet"
    meta_path = config.MODELS_DIR / "model_metadata.json"
    feat_total_path = config.DATA_PROCESSED / "features_total.parquet"
    feat_poli_path = config.DATA_PROCESSED / "features_by_poli.parquet"

    df_preds_h7 = pd.read_parquet(preds_h7_path)
    df_preds_h14 = pd.read_parquet(preds_h14_path)
    df_preds_poli = pd.read_parquet(preds_poli_path)
    df_feat = pd.read_parquet(feat_total_path)
    df_feat_poli = pd.read_parquet(feat_poli_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        model_meta = json.load(f)

    best_model_name = model_meta.get("best_model_total_h7", "Negative Binomial GLM")
    df_feat["date"] = pd.to_datetime(df_feat["date"])
    df_feat_poli["date"] = pd.to_datetime(df_feat_poli["date"])

    # Training series (strictly <= TRAIN_END) for MASE denominator and static thresholds
    mask_train = df_feat["date"] <= config.TRAIN_END
    df_train = df_feat[mask_train].dropna(subset=model_meta["h7_features"]).reset_index(drop=True)
    y_train = df_train["visit_count"].values.astype(float)
    q1_train = float(np.percentile(y_train, 25))
    q3_train = float(np.percentile(y_train, 75))

    print(f"Ambang Kepadatan dari Data Latih (<= {config.TRAIN_END}, N={len(y_train)} hari):")
    print(f"  - Sepi   : < {q1_train:.1f} kunjungan/hari")
    print(f"  - Sedang : {q1_train:.1f} s.d. {q3_train:.1f} kunjungan/hari")
    print(f"  - Sibuk  : > {q3_train:.1f} kunjungan/hari")

    df_preds_h7["date"] = pd.to_datetime(df_preds_h7["date_test"])
    df_eval = pd.merge(
        df_preds_h7,
        df_feat[["date", "day_of_week", "is_weekend", "is_holiday", "is_ramadan", "is_eid_period", "rolling_mean_28d"]],
        on="date",
    )

    y_test = df_eval["y_true"].values.astype(float)
    models_h7 = {
        "Seasonal Naive": df_eval["naive"].values.astype(float),
        "DOW Mean (4W)": df_eval["dow_mean"].values.astype(float),
        "Negative Binomial GLM": df_eval["nb_glm"].values.astype(float),
        "HistGradientBoosting": df_eval["hgb_poisson"].values.astype(float),
    }

    # 1. Point Forecast Metrics on Test Set (H=7)
    print("\n[1] Metrik Titik pada Test Set (Jan-Jun 2026, 181 hari, Horizon H=7):")
    point_metrics_h7 = {}
    for name, y_pred in models_h7.items():
        m = compute_regression_metrics(y_test, y_pred, y_train, seasonality=7)
        point_metrics_h7[name] = m
        winner_tag = " [BEST SINGLE MODEL]" if name == best_model_name else ""
        print(
            f"  - {name:24s}: MAE={m['MAE']:5.2f} | RMSE={m['RMSE']:5.2f} | "
            f"WAPE={m['WAPE_pct']:5.2f}% | sMAPE={m['sMAPE_pct']:5.2f}% | "
            f"MASE={m['MASE']:5.3f} | Bias={m['Mean_Bias']:+5.2f} | R2={m['R2']:+.3f}{winner_tag}"
        )

    # 2. Sensitivity Horizon H=14 on Test Set
    print("\n[2] Sensitivitas Horizon H=14 pada Test Set (Jan-Jun 2026, 181 hari):")
    y_test_h14 = df_preds_h14["y_true"].values.astype(float)
    models_h14 = {
        "Seasonal Naive (Lag 14)": df_preds_h14["naive"].values.astype(float),
        "DOW Mean (Lag 14-28)": df_preds_h14["dow_mean"].values.astype(float),
        "Negative Binomial GLM": df_preds_h14["nb_glm"].values.astype(float),
        "HistGradientBoosting": df_preds_h14["hgb_poisson"].values.astype(float),
    }
    point_metrics_h14 = {}
    for name, y_pred in models_h14.items():
        m = compute_regression_metrics(y_test_h14, y_pred, y_train, seasonality=7)
        point_metrics_h14[name] = m
        print(
            f"  - [H=14] {name:23s}: MAE={m['MAE']:5.2f} | RMSE={m['RMSE']:5.2f} | "
            f"WAPE={m['WAPE_pct']:5.2f}% | MASE={m['MASE']:5.3f}"
        )

    # 3. Diebold-Mariano Statistical Significance Tests
    print("\n[3] Uji Diebold-Mariano (Signifikansi Selisih Galat MAE di Test Set H=7):")
    dm_tests = {
        "NB_GLM_vs_Seasonal_Naive": diebold_mariano_test(
            y_test, models_h7["Negative Binomial GLM"], models_h7["Seasonal Naive"], horizon=1
        ),
        "HGB_vs_Seasonal_Naive": diebold_mariano_test(
            y_test, models_h7["HistGradientBoosting"], models_h7["Seasonal Naive"], horizon=1
        ),
        "NB_GLM_vs_DOW_Mean_4W": diebold_mariano_test(
            y_test, models_h7["Negative Binomial GLM"], models_h7["DOW Mean (4W)"], horizon=1
        ),
        "HGB_vs_DOW_Mean_4W": diebold_mariano_test(
            y_test, models_h7["HistGradientBoosting"], models_h7["DOW Mean (4W)"], horizon=1
        ),
        "NB_GLM_vs_HGB": diebold_mariano_test(
            y_test, models_h7["Negative Binomial GLM"], models_h7["HistGradientBoosting"], horizon=1
        ),
    }
    for pair_name, dm_res in dm_tests.items():
        print(
            f"  - {pair_name:28s}: d_MAE={dm_res['mean_loss_diff_mae']:+6.3f} | "
            f"DM={dm_res['dm_stat_hln']:+6.3f} | p={dm_res['p_value']:.4f} | Sig(0.05)={dm_res['significant_at_05']}"
        )

    # 4. Workload / Congestion Classification (Static Train Thresholds vs Regime-Relative)
    print("\n[4] Evaluasi Klasifikasi Tingkat Kepadatan (Sepi <25 / Sedang 25-39 / Sibuk >39):")
    cat_true_static = categorize_load(y_test, q1_train, q3_train)
    static_dist_true = {c: int(cat_true_static.count(c)) for c in ["Sepi", "Sedang", "Sibuk"]}
    print(f"  Distribusi aktual Test Set 2026 (Ambang Statis Latih): {static_dist_true}")

    class_metrics = {}
    for name, y_pred in models_h7.items():
        cat_pred = categorize_load(y_pred, q1_train, q3_train)
        cm_res = evaluate_classification(cat_true_static, cat_pred)
        class_metrics[name] = cm_res
        print(
            f"  - {name:24s}: Recall 'Sibuk'={cm_res['recall_sibuk']*100:5.1f}% | "
            f"F1-Macro={cm_res['f1_macro']:.3f} | F1-Weighted={cm_res['f1_weighted']:.3f}"
        )

    train_mean = float(np.mean(y_train))
    scale_factors = df_eval["rolling_mean_28d"].values / train_mean
    q1_rel = q1_train * scale_factors
    q3_rel = q3_train * scale_factors

    def categorize_relative(vals: np.ndarray, q1_arr: np.ndarray, q3_arr: np.ndarray) -> list[str]:
        out = []
        for v, l_b, u_b in zip(vals, q1_arr, q3_arr):
            if v < l_b:
                out.append("Sepi")
            elif v <= u_b:
                out.append("Sedang")
            else:
                out.append("Sibuk")
        return out

    cat_true_rel = categorize_relative(y_test, q1_rel, q3_rel)
    rel_dist_true = {c: int(cat_true_rel.count(c)) for c in ["Sepi", "Sedang", "Sibuk"]}
    class_metrics_relative = {
        name: evaluate_classification(cat_true_rel, categorize_relative(y_pred, q1_rel, q3_rel))
        for name, y_pred in models_h7.items()
    }
    print(f"  Distribusi aktual Test Set 2026 (Ambang Relatif Tren 28h): {rel_dist_true}")
    for name, cm_r in class_metrics_relative.items():
        print(
            f"  - [Relatif] {name:22s}: Recall 'Sibuk'={cm_r['recall_sibuk']*100:5.1f}% | "
            f"F1-Macro={cm_r['f1_macro']:.3f} | F1-Weighted={cm_r['f1_weighted']:.3f}"
        )

    # 5. Per-Poliklinik Evaluation on Test Set (Jan-Jun 2026)
    print("\n[5] Evaluasi Komparatif per Poliklinik Utama pada Test Set (Jan-Jun 2026, H=7):")
    poli_test_metrics = {}
    for poli_name, grp in df_preds_poli.groupby("poliklinik"):
        sub_feat_tr = df_feat_poli[
            (df_feat_poli["poliklinik"] == poli_name) & (df_feat_poli["date"] <= config.TRAIN_END)
        ].dropna(subset=model_meta["h7_features"])
        y_tr_p = sub_feat_tr["visit_count"].values.astype(float)
        y_te_p = grp["y_true"].values.astype(float)
        poli_winner = str(grp["best_model_name"].iloc[0])

        poli_test_metrics[poli_name] = {"best_model": poli_winner}
        poli_cols_map = [
            ("naive", "Seasonal Naive"),
            ("dow_mean", "DOW Mean (4W)"),
            ("nb_glm", "Negative Binomial GLM"),
            ("hgb_poisson", "HistGradientBoosting"),
        ]
        for col_key, m_label in poli_cols_map:
            poli_test_metrics[poli_name][m_label] = compute_regression_metrics(
                y_te_p, grp[col_key].values.astype(float), y_tr_p, seasonality=7
            )
        win_p = poli_test_metrics[poli_name][poli_winner]
        nv_p = poli_test_metrics[poli_name]["Seasonal Naive"]
        print(
            f"  - {poli_name:20s}: Pemenang={poli_winner:21s} MAE={win_p['MAE']:5.2f} "
            f"(WAPE={win_p['WAPE_pct']:5.2f}%, MASE={win_p['MASE']:.3f}) vs Naive MAE={nv_p['MAE']:5.2f}"
        )

    # 6. Segmented Operational Analysis (Best Single Model on Total RS)
    print(f"\n[6] Evaluasi per Segmen Operasional (Best Single Model: {best_model_name}):")
    y_best = df_eval["pred_best"].values.astype(float)
    segmented_eval = {}

    for is_hol, hol_name in [(0, "Hari Kerja Biasa"), (1, "Hari Libur Nasional / Cuti")]:
        sub_idx = df_eval["is_holiday"] == is_hol
        if np.any(sub_idx):
            m = compute_regression_metrics(y_test[sub_idx], y_best[sub_idx], y_train)
            m["n_days"] = int(np.sum(sub_idx))
            segmented_eval[hol_name] = m
            print(f"  • {hol_name:28s} (N={m['n_days']:3d}): MAE={m['MAE']:5.2f} | WAPE={m['WAPE_pct']:5.2f}% | MASE={m['MASE']:5.3f}")

    for is_ram, ram_name in [(0, "Luar Ramadan"), (1, "Bulan Ramadan 1447 H")]:
        sub_idx = df_eval["is_ramadan"] == is_ram
        if np.any(sub_idx):
            m = compute_regression_metrics(y_test[sub_idx], y_best[sub_idx], y_train)
            m["n_days"] = int(np.sum(sub_idx))
            segmented_eval[ram_name] = m
            print(f"  • {ram_name:28s} (N={m['n_days']:3d}): MAE={m['MAE']:5.2f} | WAPE={m['WAPE_pct']:5.2f}% | MASE={m['MASE']:5.3f}")

    peak_q3_idx = y_test > q3_train
    if np.any(peak_q3_idx):
        m_pk = compute_regression_metrics(y_test[peak_q3_idx], y_best[peak_q3_idx], y_train)
        m_pk["n_days"] = int(np.sum(peak_q3_idx))
        segmented_eval[f"Hari Puncak > Q3 Latih ({q3_train:.0f})"] = m_pk
        print(f"  • Hari Puncak > Q3 Latih ({q3_train:.0f})  (N={m_pk['n_days']:3d}): MAE={m_pk['MAE']:5.2f} | WAPE={m_pk['WAPE_pct']:5.2f}% | Bias={m_pk['Mean_Bias']:+5.2f}")

    p90_test = float(np.percentile(y_test, 90))
    peak_p90_idx = y_test >= p90_test
    m_p90 = compute_regression_metrics(y_test[peak_p90_idx], y_best[peak_p90_idx], y_train)
    m_p90["n_days"] = int(np.sum(peak_p90_idx))
    m_p90["threshold_visits"] = p90_test
    segmented_eval["Hari Puncak Top-10% Test Set"] = m_p90
    print(f"  • Hari Puncak Top-10% (>={p90_test:.0f})   (N={m_p90['n_days']:3d}): MAE={m_p90['MAE']:5.2f} | WAPE={m_p90['WAPE_pct']:5.2f}% | Bias={m_p90['Mean_Bias']:+5.2f}")

    dow_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    segmented_dow = {}
    print(f"\n  Performa per Hari dalam Seminggu ({best_model_name}):")
    for dow_i, dow_str in enumerate(dow_names):
        sub_idx = df_eval["day_of_week"] == dow_i
        if np.any(sub_idx):
            m = compute_regression_metrics(y_test[sub_idx], y_best[sub_idx], y_train)
            m["n_days"] = int(np.sum(sub_idx))
            segmented_dow[dow_str] = m
            print(f"    - {dow_str:7s} (N={m['n_days']:2d}): MAE={m['MAE']:5.2f} | WAPE={m['WAPE_pct']:5.2f}% | Bias={m['Mean_Bias']:+5.2f}")

    # 7. Permutation Feature Importance (HistGradientBoosting)
    print("\n[7] Permutation Feature Importance (HistGradientBoosting, Top 8 Fitur):")
    perm_imp = compute_hgb_permutation_importance(
        df_feat, model_meta["h7_features"], tuned_params=model_meta.get("tuned_hgb_params")
    )
    for idx_f, (fname, finfo) in enumerate(perm_imp.items()):
        if idx_f < 8:
            print(f"  {idx_f+1:2d}. {fname:25s}: +{finfo['mean_mae_increase']:.4f} ± {finfo['std_mae_increase']:.4f} MAE")

    # 8. Residual Diagnostics (Best Single Model)
    residuals_best = y_test - y_best
    res_mean = float(np.mean(residuals_best))
    res_std = float(np.std(residuals_best))
    res_acf = acf(residuals_best, nlags=14, fft=True)
    residual_diagnostics = {
        "best_model": best_model_name,
        "mean_residual": round(res_mean, 3),
        "std_residual": round(res_std, 3),
        "acf_lag1": round(float(res_acf[1]), 4),
        "acf_lag7": round(float(res_acf[7]), 4),
        "acf_lag14": round(float(res_acf[14]), 4),
    }
    print(f"\n[8] Diagnostik Residu {best_model_name} pada Test Set:")
    print(f"  Mean Residu (y - y_hat) : {res_mean:+.3f}")
    print(f"  Std Dev Residu          : {res_std:.3f}")
    print(f"  ACF Residu              : Lag 1 = {residual_diagnostics['acf_lag1']:+.3f}, Lag 7 = {residual_diagnostics['acf_lag7']:+.3f}, Lag 14 = {residual_diagnostics['acf_lag14']:+.3f}")

    eval_report = {
        "timestamp": datetime.now().isoformat(),
        "best_model_total_h7": best_model_name,
        "test_period": {
            "start": df_eval["date"].min().strftime("%Y-%m-%d"),
            "end": df_eval["date"].max().strftime("%Y-%m-%d"),
            "total_days": int(len(df_eval)),
            "mean_actual_visits": round(float(np.mean(y_test)), 2),
            "std_actual_visits": round(float(np.std(y_test)), 2),
        },
        "congestion_thresholds": {
            "q1_train": q1_train,
            "q3_train": q3_train,
            "test_actual_distribution_static": static_dist_true,
            "test_actual_distribution_relative": rel_dist_true,
        },
        "point_metrics": point_metrics_h7,
        "point_metrics_h14_sensitivity": point_metrics_h14,
        "diebold_mariano_tests": dm_tests,
        "classification_metrics": class_metrics,
        "classification_metrics_regime_relative": class_metrics_relative,
        "poliklinik_test_metrics": poli_test_metrics,
        "segmented_operational_metrics": segmented_eval,
        "day_of_week_metrics": segmented_dow,
        "permutation_importance_hgb": perm_imp,
        "glm_nb_irr_table": model_meta["poisson_vs_nb_comparison"]["irr_parameters"],
        "residual_diagnostics": residual_diagnostics,
    }

    out_metrics_json = config.TABLES_DIR / "05_evaluation_metrics.json"
    with open(out_metrics_json, "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2, ensure_ascii=False)

    # Plot Forecast vs Actual & Residuals (Komparasi NB GLM vs HistGradientBoosting)
    fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=False)
    axes[0].plot(df_eval["date"], y_test, label="Aktual", color="#0f172a", linewidth=1.6)
    axes[0].plot(
        df_eval["date"],
        df_eval["nb_glm"],
        label=f"Negative Binomial GLM (MAE {point_metrics_h7['Negative Binomial GLM']['MAE']:.2f})",
        color="#2563eb",
        linewidth=1.5,
        linestyle="--",
    )
    axes[0].plot(
        df_eval["date"],
        df_eval["hgb_poisson"],
        label=f"HistGradientBoosting L1 (MAE {point_metrics_h7['HistGradientBoosting']['MAE']:.2f})",
        color="#16a34a",
        linewidth=1.3,
        linestyle="-.",
        alpha=0.85,
    )
    axes[0].plot(
        df_eval["date"],
        df_eval["naive"],
        label=f"Baseline Seasonal Naive (MAE {point_metrics_h7['Seasonal Naive']['MAE']:.2f})",
        color="#94a3b8",
        linewidth=1.0,
        alpha=0.7,
    )
    axes[0].set_title(
        f"Komparasi Prediksi vs Aktual Kunjungan Rawat Jalan (Periode Uji Jan-Jun 2026) | Terbaik: {best_model_name}"
    )
    axes[0].set_ylabel("Kunjungan Pasien / Hari")
    axes[0].legend()
    axes[0].grid(axis="both", linestyle=":", alpha=0.6)

    axes[1].scatter(df_eval["date"], residuals_best, color="#e11d48", alpha=0.7, s=20)
    axes[1].axhline(0, color="#0f172a", linestyle="-", linewidth=1)
    axes[1].axhline(res_std * 2, color="gray", linestyle="--", alpha=0.7, label="±2 Std Dev")
    axes[1].axhline(-res_std * 2, color="gray", linestyle="--", alpha=0.7)
    axes[1].set_title(f"Residu Prediksi Model Terbaik ({best_model_name}): Aktual dikurangi Prediksi")
    axes[1].set_ylabel("Residu (Kunjungan)")
    axes[1].set_xlabel("Tanggal")
    axes[1].legend()
    axes[1].grid(axis="both", linestyle=":", alpha=0.6)

    fig_path = config.FIGURES_DIR / "05_forecast_vs_actual_residuals.png"
    plt.tight_layout()
    plt.savefig(fig_path, dpi=200)
    plt.close()

    print(f"\n[Output] Hasil Evaluasi Disimpan:")
    print(f"  [OK] {out_metrics_json}")
    print(f"  [OK] {fig_path}")


if __name__ == "__main__":
    run_evaluation()
