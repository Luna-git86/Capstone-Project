# PANDUAN PENGUJIAN MANUAL (MANUAL TESTING GUIDE)
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda
**Modul 1 sampai Modul 6 (Berdasarkan Dokumen UAT Capstone Project 2026)**

---

Panduan ini disusun langkah demi langkah dalam bahasa Indonesia sederhana agar dapat dipraktikkan langsung oleh penguji atau evaluator tanpa kebingungan teknis.

---

## 1. Persiapan Lingkungan Pengujian

### A. Memeriksa Status Koneksi Database
Jalankan perintah berikut di PowerShell atau Command Prompt pada folder `C:\capstone\Capstone-Project`:
```powershell
node -e "const p = require('./Backend/db'); p.user.count().then(c => console.log('KONEKSI DATABASE: SUKSES (Jumlah User: ' + c + ')')).catch(e => console.error('KONEKSI DATABASE: GAGAL', e.message))"
```
*Hasil yang diharapkan*: Muncul pesan `KONEKSI DATABASE: SUKSES (Jumlah User: 8)`.

### B. Menjalankan Server Backend
Buka terminal baru di folder `C:\capstone\Capstone-Project\Backend`:
```powershell
node index.js
```
*Hasil yang diharapkan*:
```text
Server Backend berjalan di http://localhost:3000
[Telegram] Bot berhasil dimulai.
[Deadline Cron] Scheduler aktif (*/15 * * * *, Asia/Makassar).
```

### C. Menjalankan Aplikasi Frontend
Buka terminal baru di folder `C:\capstone\Capstone-Project\Frontend`:
```powershell
npm run dev
```
*Hasil yang diharapkan*: Muncul tautan lokal browser: `http://localhost:5173`. Buka alamat tersebut di Google Chrome atau browser favorit Anda.

### D. Memeriksa File `.env` Secara Aman
Pastikan variabel environment telah terpasang tanpa membuka atau membagikan secret:
```powershell
node -e "console.log('DATABASE_URL:', Boolean(process.env.DATABASE_URL), '| BOT_TOKEN:', Boolean(process.env.TELEGRAM_BOT_TOKEN), '| JWT_SECRET:', Boolean(process.env.JWT_SECRET))"
```
*Hasil yang diharapkan*: Seluruh nilai bernilai `true`.

---

## 2. Akun Uji yang Telah Disiapkan di Sistem

Gunakan akun pengujian lokal berikut untuk menguji masing-masing hak akses peran:

| Peran (Role) | Nama Pengguna | Email Login | Password Default | Divisi Asal |
|---|---|---|---|---|
| **ADMIN** | Super Admin RSIA | `admin@rsia.com` | `admin123` | Sistem & TI |
| **DIREKTUR** | dr. Direktur Utama | `direktur@rsia.com` | `direktur123` | Lintas Divisi (Direksi) |
| **KADIV** | dr. Kadiv Pelayanan Medis | `kadiv.medis@rsia.com` | `kadiv123` | Pelayanan Medis |
| **KOORDINATOR** | Koordinator Poli Rawat Jalan | `koor.poli@rsia.com` | `koor123` | Pelayanan Medis |
| **STAF** | Perawat Rawat Jalan | `staf.perawat@rsia.com` | `staf123` | Pelayanan Medis |

*(Catatan: Jika Anda telah mengganti password akun tertentu pada sesi sebelumnya, gunakan password terbaru tersebut).*

---

## 3. Langkah Pengujian Peran & Modul (Langkah demi Langkah)

### Skenario A: Pengujian Peran DIREKTUR & Modul 3 (Laporan Kinerja SLA)
1. Buka `http://localhost:5173/login`.
2. Masukkan email `direktur@rsia.com` dan password `direktur123`, lalu klik **Masuk**.
3. Sistem akan mengarahkan ke halaman **Beranda Eksekutif / Dashboard Direktur**.
4. Di bilah menu samping (Sidebar), klik menu **"Laporan Kinerja"** (`/laporan-sla`).
5. **Uji Filter Divisi & Periode**:
   - Pada dropdown **Divisi**, pilih *"Semua Divisi"* atau pilih *"Pelayanan Medis"*.
   - Pada pilihan **Periode**, pilih *"30 Hari Terakhir"*.
   - Perhatikan kartu metrik di bagian atas:
     - Total Tiket Selesai
     - Selesai Sesuai SLA
     - Terlambat
     - Persentase Capaian SLA
   - Perhatikan bahwa Direktur dapat melihat seluruh divisi tanpa dibatasi.
6. **Uji Ekspor Laporan**:
   - Klik tombol **"Ekspor PDF"**. Berkas PDF resmi laporan kinerja RSIA Qurrata A’yun akan terunduh. Buka file tersebut dan pastikan tabel memuat ID tiket, nama tugas, tenggat, dan status SLA tanpa memuat data identitas pasien.
   - Klik tombol **"Ekspor Excel"**. Berkas `.xlsx` akan terunduh dan dapat dibuka dengan rapi di Microsoft Excel.

---

### Skenario B: Pengujian Peran KADIV & Modul 4 (Isolasi Data Divisi)
1. Klik tombol **Logout** di pojok bawah Sidebar.
2. Login sebagai Kepala Divisi: email `kadiv.medis@rsia.com`, password `kadiv123`.
3. Buka menu **"Laporan Kinerja"**.
4. Perhatikan bahwa pilihan Divisi **terkunci otomatis** hanya pada divisi miliknya (*Pelayanan Medis*). Kadiv tidak dapat melihat data divisi lain.
5. Buka menu **"Buat Tugas"** (`/tambah-tugas`):
   - Masukkan judul: *"Arahan Pemeliharaan Rutin USG Poli"*.
   - Pilih jenis: Arahan Divisi.
   - Pilih penerima: Koordinator Poli.
   - Klik tombol **Kirim / Simpan**.
   - *Hasil*: Arahan berhasil diterbitkan kepada Koordinator. Kadiv tidak dapat menugaskan langsung ke Staf pelaksana (menjaga rantai komando RS).

---

### Skenario C: Pengujian Peran KOORDINATOR & Pembuatan Tiket Operasional
1. Logout, lalu login sebagai Koordinator: email `koor.poli@rsia.com`, password `koor123`.
2. Buka menu **"Daftar Tugas"** (`/semua-tugas`).
3. Cari tugas arahan dari Kadiv yang baru saja dibuat.
4. Buka menu **"Buat Tugas"**:
   - Tautkan dengan Arahan Induk dari Kadiv.
   - Masukkan judul tiket: *"Kalibrasi dan Pemeriksaan Probe USG Poli 1"*.
   - Pilih prioritas: *"Sedang"* (atau *"Tinggi"* untuk uji darurat).
   - Tentukan tenggat waktu (deadline).
   - Tentukan Staf Pelaksana: pilih *"Perawat Rawat Jalan"*.
   - Tentukan Pemeriksa: Koordinator sendiri.
   - Klik tombol **"Delegasikan Tugas"**.
5. *Hasil*: Tiket operasional dibuat, dan sistem otomatis merencanakan pengiriman notifikasi Telegram `TASK_ASSIGNED` ke Staf.

---

### Skenario D: Pengujian Peran STAF (Pengerjaan, Unggah Bukti, & Submission)
1. Logout, lalu login sebagai Staf Pelaksana: email `staf.perawat@rsia.com`, password `staf123`.
2. Sistem akan mengarahkan ke dashboard tugas Staf.
3. Buka menu **"Tugas Saya"** (`/semua-tugas-staff`).
4. Perhatikan bahwa Staf **hanya melihat tugas miliknya sendiri** dan tidak melihat tugas staf lain.
5. Klik tiket *"Kalibrasi dan Pemeriksaan Probe USG Poli 1"*.
6. Klik **"Mulai Mengerjakan"** (status berubah jadi `DIPROSES`).
7. Tuliskan keterangan pengerjaan dan lampirkan catatan hasil kerja (misal: *"Kalibrasi probe selesai, gambar jernih"*).
8. Klik tombol **"Tugas Selesai (Kirim untuk Diperiksa)"**.
9. *Hasil*: Tiket berpindah status menjadi `MENUNGGU_VALIDASI`. Waktu penyerahan tugas ini dicatat sistem sebagai patokan waktu SLA.

---

### Skenario E: Verifikasi Pekerjaan & Permintaan Revisi (Koordinator)
1. Logout, lalu login kembali sebagai Koordinator (`koor.poli@rsia.com`).
2. Buka tiket yang berstatus `MENUNGGU_VALIDASI`.
3. **Uji Alur Revisi**:
   - Jika hasil belum sesuai, klik tombol **"Minta Revisi"** dan masukkan catatan: *"Mohon lampirkan foto fisik probe"*.
   - Tiket akan kembali berstatus `DIPROSES` dan notifikasi revisi dikirim ke Staf.
4. **Uji Verifikasi Selesai**:
   - Jika hasil sudah sesuai, klik tombol **"Verifikasi & Selesai"**.
   - Tiket berpindah status menjadi `SELESAI`.
   - Tiket ini langsung masuk ke **Laporan Kinerja SLA** secara otomatis tanpa perlu sinkronisasi manual.

---

### Skenario F: Pengujian ADMIN (Modul 5 Log Notifikasi & Modul 6 Pengaturan)
1. Logout, lalu login sebagai Admin: email `admin@rsia.com`, password `admin123`.
2. **Uji Modul 5 – Log Notifikasi** (`/monitoring-notifikasi`):
   - Klik menu **"Log Notifikasi"** di Sidebar.
   - Perhatikan tabel log: memuat ID tiket, nama penerima, jenis event (`TASK_ASSIGNED`, `TASK_SUBMITTED`, dll.), status (`SENT` atau `FAILED`), dan waktu kirim.
   - Gunakan filter status: pilih *"FAILED"* untuk melihat pesan yang gagal.
   - Pada baris yang berstatus FAILED, klik tombol **"Kirim Ulang (Retry)"**.
   - Klik tombol **"Retry Massal"** di kanan atas untuk mencoba mengirimkan seluruh log gagal.
3. **Uji Modul 6 – Pengaturan Sistem** (`/pengaturan-admin`):
   - Klik menu **"Pengaturan Sistem"** di Sidebar.
   - Periksa **Kartu Status Bot**: Klik tombol *"Uji Koneksi Bot"* untuk memverifikasi komunikasi dengan Telegram API.
   - Buka tab **"Parameter Operasional & Cron"**:
     - Ubah *Pengingat Mendekati Deadline* dari 24 jam menjadi 12 jam.
     - Ubah *Batas Maksimum Percobaan Retry* menjadi 5 kali.
     - Klik tombol **"Simpan Perubahan"**.
   - Buka tab **"Event Notifikasi Aktif"**:
     - Matikan atau hidupkan jenis notifikasi tertentu melalui checkbox.
     - Klik **"Simpan Perubahan"**.
   - Buka tab **"Keterhubungan Akun Pegawai"**:
     - Lihat tabel status pegawai yang sudah menautkan Telegram vs belum.
   - Buka tab **"Audit Log Konfigurasi"**:
     - Pastikan perubahan yang baru saja Anda simpan tercatat di tabel riwayat lengkap dengan jam dan admin pengeksekusi.

---

## 4. Cara Pengujian Menghubungkan Akun Telegram Testing

Jika penguji memiliki akun Telegram pribadi untuk menguji notifikasi langsung ke smartphone:
1. Login sebagai akun Staf atau Koordinator pada web E-Ticketing.
2. Buka menu profil atau klik tombol **"Hubungkan Telegram"**.
3. Sistem akan menghasilkan tautan bot berformat:
   `https://t.me/RSIA_Ticketing_Bot?start=<token_rahasia>`
4. Klik tautan tersebut untuk membuka aplikasi Telegram, lalu tekan tombol **START** di bot.
5. Bot akan membalas:
   ```text
   Berhasil! Telegram kamu sudah terhubung dengan akun E-Ticketing RSIA Qurrata A’yun atas nama [Nama Pegawai].
   ```
6. Akun Anda kini resmi menerima notifikasi tugas operasional.

---

## 5. Cara Memeriksa Data Langsung di Database (Query Aman Read-Only)

Jalankan perintah aman berikut di terminal untuk memeriksa isi tabel tanpa merusak data:

### Memeriksa 5 Tiket Terakhir & Statusnya
```powershell
node -e "const p = require('./Backend/db'); p.ticket.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, judul: true, status: true, prioritas: true, completedAt: true } }).then(console.log)"
```

### Memeriksa 5 Log Notifikasi Terakhir
```powershell
node -e "const p = require('./Backend/db'); p.notificationLog.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, ticketId: true, type: true, status: true, attempts: true, sentAt: true } }).then(console.log)"
```

### Memeriksa 5 Catatan Audit Trail Terakhir
```powershell
node -e "const p = require('./Backend/db'); p.auditLog.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, action: true, entityType: true, userId: true, createdAt: true } }).then(console.log)"
```

---

## 6. Lembar Checklist Pengujian Manual Penguji (Print / Centang)

| No | Komponen yang Diuji | Langkah Verifikasi | Hasil yang Didapat | Status |
|:---:|---|---|---|:---:|
| 1 | **Login Sistem** | Login dengan akun Admin, Direktur, Kadiv, Koordinator, Staf | Berhasil masuk ke dashboard masing-masing | [ ] Sesuai |
| 2 | **Isolasi Laporan Kadiv** | Login Kadiv Medis, buka menu Laporan Kinerja | Hanya data Divisi Medis yang tampil | [ ] Sesuai |
| 3 | **Laporan SLA Direktur** | Login Direktur, pilih Semua Divisi & klik Tampilkan | Seluruh divisi tampil dengan angka metrik | [ ] Sesuai |
| 4 | **Ekspor PDF Laporan** | Klik tombol "Ekspor PDF" di halaman Laporan SLA | File PDF terunduh & rapi tanpa data pasien | [ ] Sesuai |
| 5 | **Ekspor Excel Laporan** | Klik tombol "Ekspor Excel" di halaman Laporan SLA | File XLSX terunduh & dapat dibuka di Excel | [ ] Sesuai |
| 6 | **Pencegahan Staf Buka Laporan**| Login Staf, coba buka alamat `/laporan-sla` | Muncul peringatan "Akses Ditolak" | [ ] Sesuai |
| 7 | **Delegasi Tugas Koordinator** | Buat tugas baru ke Staf dari menu Tambah Tugas | Tugas dibuat & Staf pelaksana terpilih | [ ] Sesuai |
| 8 | **Submission Tugas Staf** | Login Staf, klik "Tugas Selesai (Kirim Review)" | Status tiket berubah jadi MENUNGGU_VALIDASI | [ ] Sesuai |
| 9 | **Pemisahan Peran Pemeriksa** | Koordinator memvalidasi tugas Staf jadi SELESAI | Berhasil verifikasi (Pelaksana ≠ Pemeriksa)| [ ] Sesuai |
| 10 | **Monitoring Log Notifikasi** | Login Admin, buka menu Log Notifikasi | Riwayat notifikasi tampil lengkap (SENT/FAIL)| [ ] Sesuai |
| 11 | **Retry Notifikasi Gagal** | Klik tombol "Kirim Ulang" pada notifikasi gagal | Status log diperbarui dan dicoba ulang | [ ] Sesuai |
| 12 | **Pengaturan Sistem Admin** | Ubah batas retry atau jam reminder, klik Simpan | Konfigurasi tersimpan dan tercatat di Audit| [ ] Sesuai |
| 13 | **Health Check Bot Telegram** | Klik "Uji Koneksi Bot" di Pengaturan Sistem | Muncul status bot Telegram TERHUBUNG | [ ] Sesuai |
