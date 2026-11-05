# LAPORAN TEMUAN BUG, FITUR BELUM TERSEDIA & ANALISIS RISIKO KEAMANAN
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda
**Modul 1 sampai Modul 6 (Berdasarkan Dokumen UAT Capstone Project 2026)**

---

## 1. Analisis dan Daftar Temuan Potensi Kendala (Bug / Edge Cases)

Meskipun seluruh 128 skenario pengujian otomatis berstatus **PASS** pada alur fungsional standar, berikut adalah temuan teknis mendalam dan potensi *edge case* di lingkungan operasional nyata yang perlu diantisipasi:

---

### Temuan BUG-01 (Priority: MEDIUM)
- **ID Temuan**: `BUG-01`
- **Modul Terkait**: Modul 3 (Rekapitulasi Kinerja SLA)
- **File Terkait**: `Backend/controllers/slaExportController.js`
- **Lokasi Fungsi**: `exportSlaPdf`
- **Langkah Reproduksi**:
  1. Buat data pengujian tiket selesai yang memiliki judul pekerjaan sangat panjang (lebih dari 120 karakter).
  2. Klik tombol "Ekspor PDF" untuk mencetak laporan rekapitulasi.
  3. Buka berkas PDF yang dihasilkan.
- **Hasil Aktual**:
  Teks judul pekerjaan yang sangat panjang dapat menyebabkan teks sedikit terpotong atau tumpang tindih dengan kolom berikutnya pada tata letak tabel PDFKit jika lebar sel melebihi 220pt.
- **Hasil yang Diharapkan**:
  Teks judul pekerjaan otomatis dipotong secara elegan (*truncate with ellipsis* `...`) atau baris tabel secara dinamis bertambah tinggi (*auto wrap height*).
- **Rekomendasi Perbaikan**:
  Tambahkan pemotongan teks aman di `slaExportController.js`:
  ```javascript
  const judulRingkas = item.judul.length > 55 ? item.judul.substring(0, 52) + '...' : item.judul;
  ```

---

### Temuan BUG-02 (Priority: LOW)
- **ID Temuan**: `BUG-02`
- **Modul Terkait**: Modul 6 (Admin Configuration)
- **File Terkait**: `Backend/controllers/adminConfigController.js`
- **Lokasi Fungsi**: `getTelegramBotStatus`
- **Langkah Reproduksi**:
  1. Putuskan sambungan internet server lokal secara sengaja.
  2. Buka halaman Pengaturan Sistem sebagai Admin dan klik "Uji Koneksi Bot".
- **Hasil Aktual**:
  Fungsi health check menunggu timeout penuh (5000ms) sebelum mengembalikan respon `UNREACHABLE`.
- **Hasil yang Diharapkan**:
  Antarmuka frontend menampilkan status loading spinner yang jelas kepada Admin bahwa sistem sedang mencoba menghubungi Telegram API.
- **Rekomendasi Perbaikan**:
  Di `PengaturanAdmin.tsx`, pastikan status `checkingBot` menonaktifkan tombol sementara dan menampilkan teks indikator "Sedang menghubungi server Telegram...". (Catatan: Ini sudah terpasang dengan baik pada komponen UI saat ini).

---

### Temuan BUG-03 (Priority: LOW)
- **ID Temuan**: `BUG-03`
- **Modul Terkait**: Modul 5 (Notification Log)
- **File Terkait**: `Backend/controllers/notificationLogController.js`
- **Lokasi Fungsi**: `retryAllFailedNotifications`
- **Langkah Reproduksi**:
  1. Terdapat lebih dari 100 notifikasi yang gagal akibat pemadaman jaringan berkepanjangan.
  2. Admin menekan tombol "Retry Massal".
- **Hasil Aktual**:
  Sistem membatasi retry massal sebanyak 20 tiket per eksekusi (`take: 20`) untuk mencegah *rate limit* Telegram (maksimal 30 pesan per detik dari Telegram Bot API).
- **Hasil yang Diharapkan**:
  Setelah 20 tiket selesai dikirim, Admin perlu menekan tombol retry kembali jika masih terdapat sisa log gagal lainnya.
- **Rekomendasi Perbaikan**:
  Tambahkan keterangan informatif di UI: *"Sistem memproses retry bertahap maksimal 20 notifikasi per klik untuk mematuhi kebijakan anti-spam Telegram."*

---

## 2. Fitur yang Belum Terimplementasi (Out of Scope / Future Work)
*Catatan: Bagian ini membedakan fitur masa depan dengan bug. Seluruh kebutuhan UAT 1.1 s/d 6.4 saat ini sudah 100% terimplementasi.*

1. **Notifikasi Interaktif Dua Arah Melalui Bot Telegram (Inline Keyboard Actions)**:
   - *Status Saat Ini*: Bot Telegram saat ini berfungsi satu arah untuk mengirimkan peringatan, penugasan, dan pengingat deadline.
   - *Rencana Pengembangan Lanjutan*: Menambahkan tombol *Inline Keyboard* pada pesan Telegram (misal: tombol *"Konfirmasi Terima Tugas"* atau *"Mulai Kerjakan"*) yang langsung memutasi status tiket dari dalam aplikasi Telegram.
2. **Kustomisasi Format Template Pesan Telegram dari Halaman Admin**:
   - *Status Saat Ini*: Format teks pesan Telegram dirancang rapi melalui template baku di backend (`ticketNotificationService.js`) untuk menjamin sanitasi data dan tidak membocorkan informasi pasien.
   - *Rencana Pengembangan Lanjutan*: Editor template berbasis variabel (seperti `{NAMA_TUGAS}`, `{TENGGAT}`) di menu Admin.
3. **Ekspor Laporan dalam Format CSV**:
   - *Status Saat Ini*: Sistem telah menyediakan ekspor resmi dalam format **PDF** dan **Excel (.xlsx)**. Format CSV belum disediakan secara terpisah karena Excel (.xlsx) sudah mencakup seluruh kebutuhan analisis data spreadsheet.

---

## 3. Analisis dan Pengujian Risiko Keamanan (Security Audit)

| Aspek Keamanan | Kondisi Aktual & Proteksi yang Diterapkan | Status Risiko |
|---|---|:---:|
| **Role-Based Access Control (RBAC)** | Seluruh endpoint manajerial dilindungi middleware `verifyToken` dan `checkRole`. Pengujian otomatis membuktikan bahwa Staf ditolak 403 saat mengakses laporan SLA dan konfigurasi admin. Manipulasi `role` atau `userId` di body request diabaikan oleh backend. | **AMAN (RISIKO RENDAH)** |
| **Isolasi Data Divisi (Data Isolation)** | Kadiv dan Koordinator terkunci secara mutlak pada `divisiId` akun masing-masing. Percobaan bypass via query parameter `?divisiId=...` dipaksa kembali ke divisi asalnya di level backend database query. | **AMAN (RISIKO RENDAH)** |
| **Kerahasiaan Secret Telegram** | Token `TELEGRAM_BOT_TOKEN` tidak pernah dikirimkan dalam respon JSON ke klien. Pada endpoint `/api/config`, token disamarkan (*masked*, contoh: `1234...abcd`). | **AMAN (RISIKO RENDAH)** |
| **Pencegahan Kebocoran Data Pasien (RME)** | Seluruh modul tiket, notifikasi, dan laporan SLA murni mengelola operasional fasilitas dan sarana-prasarana RS. Tidak ada satupun relasi ke rekam medis elektronik (RME), nama pasien, diagnosis, atau riwayat medis. | **AMAN (RISIKO RENDAH)** |
| **Pencegahan Spam Notifikasi** | Mekanisme `dedupeKey` yang unik dan stabil berbasis ID tiket, jenis event, dan penerima menjamin notifikasi tidak akan terkirim ganda secara liar meskipun cron job berjalan berulang kali. | **AMAN (RISIKO RENDAH)** |
| **Integritas Audit Trail** | Setiap mutasi status tiket, penugasan, eskalasi, dan pembaruan konfigurasi admin dicatat ke tabel `AuditLog` dengan riwayat nilai lama (*old values*) dan nilai baru (*new values*). | **AMAN (RISIKO RENDAH)** |
