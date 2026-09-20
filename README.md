# Capstone-Project
Proposal Capstone Project POLNES: Integrasi Sistem Manajemen Tugas dan Analisis Prediktif Kepadatan Pasien menggunakan K-Means &amp; XGBoost untuk RSIA Qurrata A'yun.
# Integrasi Sistem Manajemen Tugas dan Analisis Prediktif Kepadatan Pasien RSIA Qurrata A'yun

Repository ini berisi dokumen Proposal Capstone Project dan rancangan sistem hibrida untuk RSIA Qurrata A'yun Samarinda. Proyek ini dikembangkan oleh tim mahasiswa D3 Teknik Informatika, Politeknik Negeri Samarinda (POLNES) angkatan 2024.

Proyek ini menggabungkan dua skema utama secara komprehensif, yaitu **Engineering Process Design (EPD)** dan **Scientific Method (SM)**, guna menciptakan sistem pendukung keputusan manajerial yang proaktif bagi jajaran direksi rumah sakit.

## 🚀 Ruang Lingkup Proyek

1. **Sistem E-Ticketing & Pemantauan (EPD 1)**
   Pengembangan antarmuka tersentralisasi untuk pencatatan masalah operasional rumah sakit dengan fitur pelacakan status *real-time* dan kalkulasi batas waktu *Service Level Agreement* (SLA).

2. **Keamanan & Role-Based Access Control (EPD 2)**
   Implementasi matriks hak akses (*Access Control Matrix*) untuk memisahkan wewenang antara Direktur, Kadiv, Koordinator, dan Staf. Modul ini mengamankan alur persetujuan (*approval flow*) dan mencatat seluruh rekam jejak pendelegasian ke dalam *Immutable Audit Trail*.

3. **Automasi Notifikasi & Rekapitulasi (EPD 3)**
   Pembangunan modul *backend* mandiri menggunakan *Cron Job* untuk memberikan peringatan tugas *overdue* secara otomatis dan menghasilkan laporan (*generator*) kinerja per divisi tanpa menyentuh privasi data medis (RME).

4. **Analisis Prediktif Kepadatan Pasien (SM 1)**
   Penerapan pipeline *Machine Learning* menggunakan metode *Ensemble* (penggabungan algoritma K-Means dan XGBoost) pada lingkungan Python. Model ini berfungsi memprediksi probabilitas lonjakan pasien di poliklinik pada hari berikutnya, yang hasilnya divisualisasikan pada dasbor manajerial untuk memicu penerbitan tiket tugas preventif secara otomatis.

## 🛠️ Stack Teknologi (Direncanakan)
* **Backend E-Ticketing:** Node.js, Express.js
* **Machine Learning & Data Processing:** Python, Pandas/Polars, Scikit-Learn (K-Means), XGBoost
* **Arsitektur:** REST API (menghubungkan engine Python dengan backend Node.js)

## 👥 Tim Pengembang
1. Muhammad Hafidz Naufal (246151045) - *Frontend & SLA Monitoring*
2. Rava Zain Alwan Syaluna (246151043) - *RBAC, Security & Approval Flow*
3. Muhammad Rifan Ainur Hakim (246151040) - *Automated Notification & Reporting*
4. Muhammad Syahidan (246151038) - *Predictive Analysis & Machine Learning Pipeline*
