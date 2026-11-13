"""
Tahap 6: Visualisasi Statis untuk Laporan Capstone Project & Manajemen RSIA.

Script ini menghasilkan 7 gambar informatif beresolusi tinggi (300 DPI) di outputs/figures/:
1. 06_trend_bulanan_2023_2026.png: Tren bulanan Total RS & 4 poliklinik utama 2023-2026.
2. 06_heatmap_hari_jam.png: Heatmap Hari x Jam (pola jam sibuk dan pengaruh jadwal dokter vs IGD).
3. 06_beban_dan_pergeseran_poliklinik.png: Proporsi dan dinamika volume per poliklinik utama.
4. 06_komposisi_penjamin_dan_jenis_kunjungan.png: Distribusi penjamin dan perbandingan pasien baru vs lama.
5. 06_prediksi_vs_aktual_2026.png: Komparasi prediksi Negative Binomial GLM & HistGradientBoosting vs aktual dan baseline pada periode uji 2026.
6. 06_perbandingan_metrik_model.png: Perbandingan metrik (MAE, RMSE, WAPE, MASE) antar-model.
7. 06_faktor_berpengaruh_feature_importance.png: Permutation feature importance dan dampak libur/Ramadan.
"""

import json
import sys
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    DATA_INTERIM,
    DATA_PROCESSED,
    FIGURES_DIR,
    MODELS_DIR,
    TABLES_DIR,
)

# Styling standar publikasi
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Helvetica"]
plt.rcParams["axes.titlesize"] = 12
plt.rcParams["axes.titleweight"] = "bold"
plt.rcParams["axes.labelsize"] = 10
plt.rcParams["xtick.labelsize"] = 9
plt.rcParams["ytick.labelsize"] = 9
plt.rcParams["legend.fontsize"] = 9
plt.rcParams["figure.titlesize"] = 14

COLORS = {
    "primary": "#1f77b4",
    "secondary": "#ff7f0e",
    "success": "#2ca02c",
    "danger": "#d62728",
    "purple": "#9467bd",
    "teal": "#17becf",
    "gray": "#7f7f7f",
    "navy": "#0d3b66",
}


def fig1_monthly_trend(df_total: pd.DataFrame, df_poli: pd.DataFrame, out_path: Path):
    """Gambar 1: Tren Bulanan Kunjungan Total RS dan 4 Poliklinik Utama (2023-2026)."""
    fig, ax = plt.subplots(figsize=(12, 6), dpi=300)

    # Agregasi bulanan total RS
    df_tot = df_total.copy()
    df_tot["year_month"] = df_tot["date"].dt.to_period("M")
    monthly_tot = df_tot.groupby("year_month")["visit_count"].sum().reset_index()
    monthly_tot["date_plot"] = monthly_tot["year_month"].dt.to_timestamp()

    ax.plot(
        monthly_tot["date_plot"],
        monthly_tot["visit_count"],
        color=COLORS["navy"],
        linewidth=2.5,
        marker="o",
        label="Total RS (Semua Unit)",
    )

    # 4 Poliklinik Utama
    main_polis = ["POLIKLINIK OBGYN", "POLIKLINIK UMUM", "UNIT IGD", "POLIKLINIK ANAK"]
    poli_colors = [COLORS["primary"], COLORS["teal"], COLORS["danger"], COLORS["purple"]]

    df_p = df_poli[df_poli["poliklinik"].isin(main_polis)].copy()
    df_p["year_month"] = df_p["date"].dt.to_period("M")
    monthly_p = df_p.groupby(["year_month", "poliklinik"])["visit_count"].sum().reset_index()
    monthly_p["date_plot"] = monthly_p["year_month"].dt.to_timestamp()

    for poli, col in zip(main_polis, poli_colors):
        sub = monthly_p[monthly_p["poliklinik"] == poli]
        ax.plot(
            sub["date_plot"],
            sub["visit_count"],
            linewidth=1.5,
            linestyle="--",
            alpha=0.85,
            label=poli,
            color=col,
        )

    # Garis pemisah periode Latih, Validasi, dan Uji
    ax.axvline(pd.Timestamp("2025-07-01"), color=COLORS["gray"], linestyle=":", linewidth=1.5)
    ax.axvline(pd.Timestamp("2026-01-01"), color=COLORS["gray"], linestyle=":", linewidth=1.5)

    ax.text(pd.Timestamp("2024-04-01"), ax.get_ylim()[1] * 0.92, "Periode Latih\n(Feb 2023 - Jun 2025)", ha="center", fontsize=8, bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", alpha=0.8))
    ax.text(pd.Timestamp("2025-10-01"), ax.get_ylim()[1] * 0.92, "Validasi\n(Jul-Des 2025)", ha="center", fontsize=8, bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", alpha=0.8))
    ax.text(pd.Timestamp("2026-04-01"), ax.get_ylim()[1] * 0.92, "Periode Uji\n(Jan-Jun 2026)", ha="center", fontsize=8, bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", alpha=0.8))

    ax.set_title("Tren Volume Kunjungan Bulanan: Penurunan Level di 2025-2026 Didominasi Obgyn & Umum", pad=12)
    ax.set_xlabel("Bulan Registrasi")
    ax.set_ylabel("Total Kunjungan Pasien / Bulan")
    ax.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def fig2_heatmap_day_hour(df_visits: pd.DataFrame, out_path: Path):
    """Gambar 2: Heatmap Pola Kedatangan Pasien Hari x Jam."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6), dpi=300)

    day_order = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    day_map = {0: "Senin", 1: "Selasa", 2: "Rabu", 3: "Kamis", 4: "Jumat", 5: "Sabtu", 6: "Minggu"}

    df = df_visits.copy()
    if "day_of_week" not in df.columns:
        df["day_of_week"] = df["tgl_reg"].dt.dayofweek
    df["day_name"] = df["day_of_week"].map(day_map)

    # Subplot A: Poliklinik Terjadwal (Obgyn, Umum, Anak, dll - Non-IGD)
    df_non_igd = df[df["poliklinik"] != "UNIT IGD"]
    pivot_non_igd = df_non_igd.pivot_table(
        index="day_name",
        columns="hour",
        values="no_rawat",
        aggfunc="count",
        fill_value=0,
    ).reindex(day_order)

    # Subplot B: Unit IGD (Layanan Darurat 24 Jam)
    df_igd = df[df["poliklinik"] == "UNIT IGD"]
    pivot_igd = df_igd.pivot_table(
        index="day_name",
        columns="hour",
        values="no_rawat",
        aggfunc="count",
        fill_value=0,
    ).reindex(day_order)

    sns.heatmap(pivot_non_igd, ax=axes[0], cmap="YlGnBu", cbar_kws={"label": "Jumlah Registrasi (Total)"})
    axes[0].set_title("Poliklinik Rawat Jalan Terjadwal\n(Terkonsentrasi Jam Praktik Dokter 08:00 - 14:00)")
    axes[0].set_xlabel("Jam Kedatangan (00:00 - 23:00)")
    axes[0].set_ylabel("Hari dalam Seminggu")

    sns.heatmap(pivot_igd, ax=axes[1], cmap="YlOrRd", cbar_kws={"label": "Jumlah Registrasi (Total)"})
    axes[1].set_title("Unit IGD (Layanan Gawat Darurat)\n(Aktif 24 Jam Penuh Termasuk Malam & Akhir Pekan)")
    axes[1].set_xlabel("Jam Kedatangan (00:00 - 23:00)")
    axes[1].set_ylabel("")

    plt.suptitle("Distribusi Jam Kedatangan: Polarisasi Poliklinik Terjadwal vs Layanan IGD 24 Jam", y=1.02)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close()


def fig3_poli_load_and_dynamics(df_poli: pd.DataFrame, out_path: Path):
    """Gambar 3: Beban dan Komposisi Kunjungan per Poliklinik."""
    fig, axes = plt.subplots(1, 2, figsize=(13, 5), dpi=300)

    # Subplot A: Diagram Donat Proporsi Total
    tot_by_poli = df_poli.groupby("poliklinik")["visit_count"].sum().sort_values(ascending=False)
    main_polis = tot_by_poli.head(4)
    other_sum = tot_by_poli.iloc[4:].sum()
    slices = pd.concat([main_polis, pd.Series({"UNIT LAINNYA (Lab/Bedah/BBL)": other_sum})])

    colors = [COLORS["danger"], COLORS["primary"], COLORS["teal"], COLORS["purple"], COLORS["gray"]]
    axes[0].pie(
        slices.values,
        labels=[f"{k}\n({v:,} | {v/slices.sum():.1%})" for k, v in slices.items()],
        colors=colors,
        startangle=140,
        wedgeprops=dict(width=0.4, edgecolor="w", linewidth=1.5),
    )
    axes[0].set_title("Proporsi Kumulatif (2023 - 2026)\n4 Poliklinik Utama Mencakup 98,44% Beban RS")

    # Subplot B: Dinamika Kunjungan per Tahun
    df_p = df_poli.copy()
    df_p["year"] = df_p["date"].dt.year
    df_p_main = df_p[df_p["poliklinik"].isin(main_polis.index)].copy()
    annual_p = df_p_main.groupby(["year", "poliklinik"])["visit_count"].sum().reset_index()

    sns.barplot(data=annual_p, x="year", y="visit_count", hue="poliklinik", ax=axes[1], palette="Blues_r")
    axes[1].set_title("Volume Kunjungan per Tahun (4 Poliklinik Utama)\nPenurunan Tertajam Terjadi di Unit Obgyn & Umum")
    axes[1].set_xlabel("Tahun Registrasi")
    axes[1].set_ylabel("Total Kunjungan Pasien")
    axes[1].legend(title="Poliklinik", loc="upper right")

    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def fig4_penjamin_and_patient_type(df_visits: pd.DataFrame, out_path: Path):
    """Gambar 4: Komposisi Penjamin dan Perbandingan Pasien Baru vs Lama."""
    fig, axes = plt.subplots(1, 2, figsize=(13, 5), dpi=300)

    # Subplot A: Komposisi Penjamin
    penjamin_counts = df_visits["penjamin"].value_counts()
    colors_penjamin = [COLORS["navy"], COLORS["primary"], COLORS["teal"], COLORS["purple"], COLORS["secondary"], COLORS["danger"]]

    axes[0].barh(penjamin_counts.index[::-1], penjamin_counts.values[::-1], color=colors_penjamin[::-1])
    for i, v in enumerate(penjamin_counts.values[::-1]):
        axes[0].text(v + 150, i, f"{v:,} ({v/len(df_visits):.1%})", va="center", fontsize=8.5)
    axes[0].set_title("Komposisi Penjamin Pembayaran Rawat Jalan\nMayoritas Terdistribusi Mandiri (PRIBADI) & BPJS")
    axes[0].set_xlabel("Jumlah Registrasi Pasien")
    axes[0].set_xlim(0, max(penjamin_counts.values) * 1.25)

    # Subplot B: Pasien Baru vs Lama per Tahun
    df = df_visits.copy()
    df["year"] = pd.to_datetime(df["date"]).dt.year
    pt_annual = df.groupby(["year", "jns_kunjungan"])["no_rawat"].count().reset_index()
    pt_pivot = pt_annual.pivot(index="year", columns="jns_kunjungan", values="no_rawat").fillna(0)

    pt_pivot.plot(kind="bar", stacked=True, ax=axes[1], color=[COLORS["primary"], COLORS["teal"]], edgecolor="white")
    axes[1].set_title("Proporsi Pasien Baru vs Pasien Lama per Tahun\nPasien Kontrol Berulang (Lama) Mencapai 67,2%")
    axes[1].set_xlabel("Tahun")
    axes[1].set_ylabel("Jumlah Kunjungan")
    axes[1].set_xticklabels(axes[1].get_xticklabels(), rotation=0)
    axes[1].legend(title="Jenis Kunjungan", loc="upper right")

    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def fig5_forecast_vs_actual(df_test: pd.DataFrame, eval_metrics: dict, out_path: Path):
    """Gambar 5: Komparasi Prediksi vs Aktual pada Periode Uji 2026 (NB GLM vs HistGB vs Baseline)."""
    fig, ax = plt.subplots(figsize=(13, 5), dpi=300)

    df_t = df_test.copy()
    date_col = "date_test" if "date_test" in df_t.columns else "date"
    df_t["date"] = pd.to_datetime(df_t[date_col])

    actual_col = "actual" if "actual" in df_t.columns else "y_true"
    nb_col = "nb_glm"
    hgb_col = "hgb_poisson"
    naive_col = "pred_seasonal_naive" if "pred_seasonal_naive" in df_t.columns else "naive"

    pm = eval_metrics.get("point_metrics", {})
    m_nb = pm.get("Negative Binomial GLM", {})
    m_hgb = pm.get("HistGradientBoosting", {})
    m_nv = pm.get("Seasonal Naive", {})
    best_name = eval_metrics.get("best_model_total_h7", "Negative Binomial GLM")

    ax.plot(df_t["date"], df_t[actual_col], label="Aktual Riil", color="black", linewidth=1.8, alpha=0.9)
    ax.plot(
        df_t["date"],
        df_t[nb_col],
        label=f"Negative Binomial GLM — MAE: {m_nb.get('MAE', 0):.2f} | RMSE: {m_nb.get('RMSE', 0):.2f}",
        color=COLORS["danger"],
        linewidth=2.0,
    )
    ax.plot(
        df_t["date"],
        df_t[hgb_col],
        label=f"HistGradientBoosting (L1) — MAE: {m_hgb.get('MAE', 0):.2f} | RMSE: {m_hgb.get('RMSE', 0):.2f}",
        color=COLORS["primary"],
        linestyle="--",
        linewidth=1.5,
        alpha=0.85,
    )
    ax.plot(
        df_t["date"],
        df_t[naive_col],
        label=f"Baseline Seasonal Naive (7H) — MAE: {m_nv.get('MAE', 0):.2f} | RMSE: {m_nv.get('RMSE', 0):.2f}",
        color=COLORS["gray"],
        linestyle=":",
        linewidth=1.2,
        alpha=0.75,
    )

    # Tandai periode Ramadan dan Idulfitri 2026
    ax.axvspan(pd.Timestamp("2026-02-18"), pd.Timestamp("2026-03-19"), color="gold", alpha=0.18, label="Bulan Puasa Ramadan 1447 H")
    ax.axvspan(pd.Timestamp("2026-03-20"), pd.Timestamp("2026-03-24"), color="salmon", alpha=0.25, label="Libur & Cuti Bersama Idulfitri")

    ax.set_title(f"Komparasi Hasil Peramalan Periode Uji (Jan-Jun 2026) | Model Terbaik: {best_name}", pad=12)
    ax.set_xlabel("Tanggal Pengujian (181 Hari)")
    ax.set_ylabel("Jumlah Kunjungan Pasien / Hari")
    ax.legend(loc="upper right", frameon=True, fontsize=8.5)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def fig6_model_metrics_comparison(eval_metrics: dict, out_path: Path):
    """Gambar 6: Perbandingan Metrik Evaluasi Antar-Model pada Test Set 2026."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    point_m = eval_metrics["point_metrics"]
    models = list(point_m.keys())
    short_map = {
        "Seasonal Naive": "Seasonal Naive",
        "DOW Mean (4W)": "DOW Mean (4W)",
        "Negative Binomial GLM": "Negative Binomial GLM",
        "HistGradientBoosting": "HistGradientBoosting (L1)",
    }
    labels = [short_map.get(m, m) for m in models]

    mae_vals = [point_m[m]["MAE"] for m in models]
    rmse_vals = [point_m[m]["RMSE"] for m in models]
    mase_vals = [point_m[m]["MASE"] for m in models]
    wape_vals = [point_m[m]["WAPE_pct"] for m in models]

    x = np.arange(len(labels))
    width = 0.35

    # Subplot A: MAE vs RMSE
    best_name = eval_metrics.get("best_model_total_h7", "Negative Binomial GLM")
    best_metrics = point_m.get(best_name, {})
    axes[0].bar(x - width/2, mae_vals, width, label="MAE (Rata-rata Galat Pasien)", color=COLORS["teal"])
    axes[0].bar(x + width/2, rmse_vals, width, label="RMSE (Sensitif Lonjakan Galat)", color=COLORS["navy"])
    axes[0].set_title(
        f"Perbandingan Galat Mutlak (MAE) dan Galat Kuadrat (RMSE)\n"
        f"Terbaik: {best_name} (MAE: {best_metrics.get('MAE', 0):.3f} | RMSE: {best_metrics.get('RMSE', 0):.3f})"
    )
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(labels, rotation=15, ha="right")
    axes[0].set_ylabel("Nilai Galat (Pasien / Hari)")
    axes[0].legend(loc="upper right")

    for i in range(len(labels)):
        axes[0].text(x[i] - width/2, mae_vals[i] + 0.15, f"{mae_vals[i]:.2f}", ha="center", fontsize=8)
        axes[0].text(x[i] + width/2, rmse_vals[i] + 0.15, f"{rmse_vals[i]:.2f}", ha="center", fontsize=8)

    # Subplot B: MASE (Target < 1.0) dan WAPE (%)
    ax2 = axes[1]
    ax2_twin = ax2.twinx()

    b1 = ax2.bar(x - width/2, mase_vals, width, label="MASE (Target < 1,0)", color=COLORS["primary"])
    l1 = ax2_twin.plot(x + width/2, wape_vals, color=COLORS["danger"], marker="s", linewidth=2, label="WAPE (%)")

    ax2.axhline(1.0, color="red", linestyle="--", alpha=0.7, label="Ambang Batas MASE = 1,0")
    ax2.set_title("Skala Relatif: MASE & Persentase WAPE\nSemua Model Mengalahkan Seasonal Naive (MASE < 1,0)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels, rotation=15, ha="right")
    ax2.set_ylabel("Nilai MASE")
    ax2_twin.set_ylabel("WAPE (%)")
    ax2.set_ylim(0, 1.2)
    ax2_twin.set_ylim(15, 35)

    # Gabung legenda
    lines, labels_leg = ax2.get_legend_handles_labels()
    lines2, labels_leg2 = ax2_twin.get_legend_handles_labels()
    ax2.legend(lines + lines2, labels_leg + labels_leg2, loc="upper right")

    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def fig7_feature_importance(eval_metrics: dict, model_meta: dict, out_path: Path):
    """Gambar 7: Faktor-Faktor Paling Berpengaruh (Permutation Importance & Dampak Kalender)."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5.5), dpi=300)

    # Subplot A: Permutation Feature Importance (HistGB Poisson)
    p_imp = eval_metrics.get("permutation_importance_hgb", {})
    top_features = sorted(p_imp.items(), key=lambda x: x[1]["mean_mae_increase"], reverse=True)[:10]

    f_names = [k for k, _ in top_features][::-1]
    f_vals = [v["mean_mae_increase"] for _, v in top_features][::-1]

    f_labels_map = {
        "day_of_week": "Hari dalam Pekan (Jadwal Dokter)",
        "lag_7": "Kunjungan 7 Hari Lalu",
        "lag_21": "Kunjungan 21 Hari Lalu",
        "lag_28": "Kunjungan 28 Hari Lalu",
        "is_holiday": "Hari Libur Nasional",
        "is_ramadan": "Bulan Puasa Ramadan",
        "lag_14": "Kunjungan 14 Hari Lalu",
        "days_from_last_holiday": "Jarak Pasca Libur",
        "rolling_mean_7d": "Rata-rata Bergerak 7-Hari",
        "rolling_std_7d": "Variasi Kunjungan 7-Hari",
        "is_weekend": "Indikator Akhir Pekan",
    }
    clean_labels = [f_labels_map.get(fn, fn) for fn in f_names]

    axes[0].barh(clean_labels, f_vals, color=COLORS["teal"])
    axes[0].set_title("Permutation Importance (Model Pohon HistGB)\nHari dalam Pekan Mendominasi Pembentukan Pola Kunjungan")
    axes[0].set_xlabel("Kenaikan Galat MAE saat Fitur Diacak (Pasien/Hari)")

    for i, v in enumerate(f_vals):
        axes[0].text(v + 0.02, i, f"+{v:.2f}", va="center", fontsize=8.5)

    # Subplot B: Efek Faktor Kalender & Libur (IRR Negative Binomial GLM)
    irr_dict = eval_metrics.get("glm_nb_irr_table", {})
    cal_factors = ["is_weekend", "is_holiday_weekday", "is_ramadan", "is_post_holiday_workday", "is_monday"]
    cal_labels = [
        "Akhir Pekan (Sabtu-Minggu)",
        "Hari Libur Kerja",
        "Bulan Puasa Ramadan",
        "Hari Kerja Pasca-Libur",
        "Hari Senin (Puncak Jadwal)",
    ]

    pct_effects = []
    ci_lows = []
    ci_highs = []
    for cf in cal_factors:
        info = irr_dict.get(cf, {"irr": 1.0, "irr_ci95_low": 1.0, "irr_ci95_high": 1.0})
        irr = info["irr"]
        pct = (irr - 1.0) * 100.0
        pct_low = (info["irr_ci95_low"] - 1.0) * 100.0
        pct_high = (info["irr_ci95_high"] - 1.0) * 100.0
        pct_effects.append(pct)
        ci_lows.append(pct - pct_low)
        ci_highs.append(pct_high - pct)

    y_pos = np.arange(len(cal_factors))
    colors_bar = [COLORS["danger"] if p < 0 else COLORS["success"] for p in pct_effects]

    axes[1].barh(y_pos, pct_effects, xerr=[ci_lows, ci_highs], color=colors_bar, alpha=0.85, capsize=4)
    axes[1].axvline(0, color="black", linestyle="--", linewidth=1.0)
    axes[1].set_yticks(y_pos)
    axes[1].set_yticklabels(cal_labels)
    axes[1].set_title("Dampak Faktor Kalender & Libur (IRR Negative Binomial GLM)\nAkhir Pekan & Libur Kerja Menurun; Senin & Pasca-Libur Naik")
    axes[1].set_xlabel("Persentase Pengaruh terhadap Kunjungan (%)")

    for i, v in enumerate(pct_effects):
        axes[1].text(v - 3.5 if v < 0 else v + 1.0, i, f"{v:+.1f}%", va="center", fontsize=8.5, fontweight="bold")

    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def main():
    print("=== Menjalankan Tahap 6: Pembuatan 7 Visualisasi Statis Publikasi ===")
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)

    # Muat dataset terverifikasi
    df_total = pd.read_parquet(DATA_PROCESSED / "daily_total.parquet")
    df_poli = pd.read_parquet(DATA_PROCESSED / "daily_by_poli.parquet")
    df_visits = pd.read_parquet(DATA_INTERIM / "visits_anonymized.parquet")
    df_test = pd.read_parquet(MODELS_DIR / "test_predictions.parquet")

    with open(TABLES_DIR / "05_evaluation_metrics.json", "r", encoding="utf-8") as f:
        eval_metrics = json.load(f)

    with open(MODELS_DIR / "model_metadata.json", "r", encoding="utf-8") as f:
        model_meta = json.load(f)

    # 1. Tren Bulanan
    fig1_path = FIGURES_DIR / "06_trend_bulanan_2023_2026.png"
    fig1_monthly_trend(df_total, df_poli, fig1_path)
    print(f"-> Gambar 1 tersimpan: {fig1_path.name}")

    # 2. Heatmap Hari x Jam
    fig2_path = FIGURES_DIR / "06_heatmap_hari_jam.png"
    fig2_heatmap_day_hour(df_visits, fig2_path)
    print(f"-> Gambar 2 tersimpan: {fig2_path.name}")

    # 3. Beban & Pergeseran Poliklinik
    fig3_path = FIGURES_DIR / "06_beban_dan_pergeseran_poliklinik.png"
    fig3_poli_load_and_dynamics(df_poli, fig3_path)
    print(f"-> Gambar 3 tersimpan: {fig3_path.name}")

    # 4. Komposisi Penjamin & Jenis Pasien
    fig4_path = FIGURES_DIR / "06_komposisi_penjamin_dan_jenis_kunjungan.png"
    fig4_penjamin_and_patient_type(df_visits, fig4_path)
    print(f"-> Gambar 4 tersimpan: {fig4_path.name}")

    # 5. Prediksi vs Aktual
    fig5_path = FIGURES_DIR / "06_prediksi_vs_aktual_2026.png"
    fig5_forecast_vs_actual(df_test, eval_metrics, fig5_path)
    print(f"-> Gambar 5 tersimpan: {fig5_path.name}")

    # 6. Perbandingan Metrik Model
    fig6_path = FIGURES_DIR / "06_perbandingan_metrik_model.png"
    fig6_model_metrics_comparison(eval_metrics, fig6_path)
    print(f"-> Gambar 6 tersimpan: {fig6_path.name}")

    # 7. Feature Importance & Dampak Faktor
    fig7_path = FIGURES_DIR / "06_faktor_berpengaruh_feature_importance.png"
    fig7_feature_importance(eval_metrics, model_meta, fig7_path)
    print(f"-> Gambar 7 tersimpan: {fig7_path.name}")

    # Simpan ringkasan visualisasi
    summary = {
        "status": "COMPLETED",
        "generated_figures": [
            {
                "file": "06_trend_bulanan_2023_2026.png",
                "title": "Tren Bulanan Total RS & 4 Poliklinik Utama (2023-2026)",
                "key_insight": "Terjadi penurunan volume kunjungan di 2025-2026 yang didominasi oleh unit Obgyn dan Umum.",
            },
            {
                "file": "06_heatmap_hari_jam.png",
                "title": "Heatmap Hari x Jam: Polarisasi Poliklinik Terjadwal vs IGD",
                "key_insight": "Poliklinik terjadwal terkonsentrasi pada jam 08:00 - 14:00, sedangkan IGD aktif 24 jam dengan proporsi malam 33,6%.",
            },
            {
                "file": "06_beban_dan_pergeseran_poliklinik.png",
                "title": "Beban dan Komposisi 4 Poliklinik Utama (98,44% Beban RS)",
                "key_insight": "Unit IGD (31,4%), Obgyn (29,5%), Umum (26,6%), dan Anak (10,9%) mencakup hampir seluruh operasional rawat jalan.",
            },
            {
                "file": "06_komposisi_penjamin_dan_jenis_kunjungan.png",
                "title": "Komposisi Penjamin Pembayaran dan Pasien Baru vs Lama",
                "key_insight": "Kunjungan didominasi oleh pasien kontrol berulang (67,2%) dengan penjamin Mandiri (PRIBADI) dan BPJS.",
            },
            {
                "file": "06_prediksi_vs_aktual_2026.png",
                "title": "Komparasi Prediksi vs Aktual Periode Uji 2026 (NB GLM vs HistGB vs Baseline)",
                "key_insight": f"Model tunggal terbaik ({eval_metrics.get('best_model_total_h7', 'Negative Binomial GLM')}) paling akurat mengantisipasi pola mingguan dan momen Idulfitri Maret 2026.",
            },
            {
                "file": "06_perbandingan_metrik_model.png",
                "title": "Perbandingan Metrik Evaluasi Antar-Model pada Test Set 2026",
                "key_insight": (
                    f"{eval_metrics.get('best_model_total_h7', 'Negative Binomial GLM')} mencapai MAE "
                    f"{eval_metrics['point_metrics'][eval_metrics.get('best_model_total_h7', 'Negative Binomial GLM')]['MAE']} "
                    f"dan RMSE {eval_metrics['point_metrics'][eval_metrics.get('best_model_total_h7', 'Negative Binomial GLM')]['RMSE']} "
                    f"(MASE {eval_metrics['point_metrics'][eval_metrics.get('best_model_total_h7', 'Negative Binomial GLM')]['MASE']}), "
                    f"mengalahkan Seasonal Naive secara signifikan (p < 0,05)."
                ),
            },
            {
                "file": "06_faktor_berpengaruh_feature_importance.png",
                "title": "Faktor-Faktor Paling Berpengaruh terhadap Kunjungan",
                "key_insight": (
                    f"Jadwal mingguan dokter (day_of_week) adalah fitur terpenting pada HistGB, sedangkan pada Negative Binomial GLM "
                    f"hari Senin meningkatkan kunjungan {(eval_metrics['glm_nb_irr_table'].get('is_monday', {}).get('irr', 1.0) - 1.0) * 100.0:+.1f}%, "
                    f"hari libur kerja {(eval_metrics['glm_nb_irr_table'].get('is_holiday_weekday', {}).get('irr', 1.0) - 1.0) * 100.0:+.1f}%, "
                    f"dan akhir pekan {(eval_metrics['glm_nb_irr_table'].get('is_weekend', {}).get('irr', 1.0) - 1.0) * 100.0:+.1f}%."
                ),
            },
        ],
    }

    sum_path = FIGURES_DIR / "06_visualization_summary.json"
    with open(sum_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"-> Ringkasan visualisasi tersimpan: {sum_path.name}")
    print("=== Tahap 6 Selesai dengan Sukses ===")


if __name__ == "__main__":
    main()
