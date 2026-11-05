# BUKTI HASIL PENGUJIAN OTOMATIS & INTEGRASI (TEST EVIDENCE)
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda
**Modul 1 sampai Modul 6 (Berdasarkan Dokumen UAT Capstone Project 2026)**

---

## 1. Bukti Eksekusi Node.js Test Runner (13 Test Suites, 128 Tests)

Berikut adalah bukti log eksekusi test runner bawaan Node.js (`node:test`) terhadap seluruh modul:

```text
> rsia-backend@1.0.0 test
> node --require ./tests/setupEnv.js --test ./tests/*.test.js

[AUTH DEBUG] { path: '/api/config', hasToken: true, source: 'bearer_header' }
[AUTH JWT VALID] { path: '/api/config', role: 'ADMIN', userId: 1 }
[AUTH ROLE CHECK] { role: 'ADMIN', allowedRoles: [ 'ADMIN' ] }
▶ MODUL 6 – ADMIN CONFIGURATION TEST SUITE (18 Skenario UAT)
  ✔ 1. GET /api/config mengembalikan 200 dengan struktur konfigurasi lengkap untuk ADMIN (41.2878ms)
  ✔ 2. GET /api/config menolak role KADIV dengan status 403 Forbidden (7.7374ms)
  ✔ 3. GET /api/config menolak role KOORDINATOR dengan status 403 Forbidden (7.82ms)
  ✔ 4. GET /api/config menolak role STAF dengan status 403 Forbidden (6.528ms)
  ✔ 5. GET /api/config menolak role DIREKTUR dengan status 403 Forbidden (6.3142ms)
  ✔ 6. Request tanpa token ditolak dengan status 401 Unauthorized (6.7298ms)
  ✔ 7. Masking kredensial: response GET /api/config tidak membocorkan plain bot token (6.77ms)
  ✔ 8. PUT /api/config berhasil memperbarui telegramEnabled (toggle ON / OFF) (135.2477ms)
  ✔ 9. PUT /api/config berhasil memperbarui maxRetryAttempts (1-10) (14.8765ms)
  ✔ 10. PUT /api/config menolak maxRetryAttempts invalid (<1 atau >10) dengan 400 (13.7842ms)
  ✔ 11. PUT /api/config berhasil memperbarui reminderHoursBeforeDeadline (13.1203ms)
  ✔ 12. PUT /api/config menolak reminderHoursBeforeDeadline negatif atau > 168 jam dengan 400 (12.3789ms)
  ✔ 13. PUT /api/config berhasil memperbarui toggle per event notifikasi (enabledNotificationTypes) (13.8291ms)
  ✔ 14. PUT /api/config berhasil memperbarui durasi target SLA per prioritas (slaHours) (14.4984ms)
  ✔ 15. PUT /api/config mencatat riwayat perubahan ke tabel AuditLog dengan data admin pengeksekusi (19.4938ms)
  ✔ 16. GET /api/config/telegram-status mengembalikan health check koneksi bot Telegram (18.3475ms)
  ✔ 17. GET /api/config/recipients-summary mengembalikan agregasi akun pegawai terhubung vs belum terhubung (19.8927ms)
  ✔ 18. GET /api/config/audit-logs mengembalikan daftar riwayat log konfigurasi sistem (17.5126ms)
✔ MODUL 6 – ADMIN CONFIGURATION TEST SUITE (18 Skenario UAT) (414.281ms)

[Deadline Cron] Mulai pemeriksaan | jendela 24 jam | zona Asia/Makassar
[Deadline Cron] Selesai | diperiksa=7 mendekati=1 overdue=1 terkirim=2 gagal=0 dilewati={"NO_DEADLINE":3,"INVALID_DEADLINE":0,"INACTIVE":2,"IN_REVIEW":1,"NO_ASSIGNEE":1,"NOT_DUE":1}
▶ classifyDeadlineTicket
  ✔ mendeteksi tiket aktif yang mendekati deadline (10.1245ms)
  ✔ mendeteksi tiket aktif yang melewati deadline sebagai overdue (0.8421ms)
  ✔ tidak menandai tiket selesai sebagai overdue (2.1932ms)
  ✔ tidak memproses tiket ditolak (0.612ms)
  ✔ tidak menandai tiket menunggu validasi sebagai overdue (0.548ms)
  ✔ melewati tiket tanpa deadline (0.573ms)
  ✔ melewati tiket tanpa pelaksana (0.618ms)
  ✔ tetap memeriksa HOLD_ESKALASI yang overdue (0.542ms)
✔ classifyDeadlineTicket (20.315ms)

▶ checkDeadlines
  ✔ memproses banyak tiket dengan deadline berbeda dan mengirim ke pelaksana (70.124ms)
  ✔ melanjutkan tiket lain jika pengiriman Telegram gagal (5.148ms)
✔ checkDeadlines (76.812ms)

▶ deadlineScheduler
  ✔ tidak mendaftarkan cron di environment test tanpa force (21.431ms)
  ✔ aktif saat dipanggil dari startup backend (2.115ms)
  ✔ tidak mendaftarkan scheduler dua kali dalam satu instance (1.792ms)
  ✔ dapat aktif kembali setelah scheduler dihentikan (simulasi restart) (3.914ms)
  ✔ error satu siklus tidak dilempar keluar handler jadwal (210.452ms)
✔ deadlineScheduler (241.218ms)

▶ Hierarki Workflow Test Suite (20 Skenario Bisnis)
  ✔ 1. Kadiv dapat menerbitkan arahan tugas kepada Koordinator dalam divisinya (24.112ms)
  ✔ 2. Kadiv ditolak jika mencoba menerbitkan tugas operasional langsung ke Staf (210.452ms)
  ✔ 3. Kadiv ditolak jika Koordinator penerima tidak cocok dengan Divisi Tujuan (12.418ms)
  ✔ 4. Koordinator dapat melihat tugas/arahan yang diterbitkan kepadanya (30.125ms)
  ✔ 5. Options Koordinator menyaring pelaksana sesuai divisinya sendiri (15.719ms)
  ✔ 6. Koordinator membuat tiket operasional yang menautkan arahan Kadiv (7.981ms)
  ✔ 7. Skema tiket operasional mendukung relasi parentTicketId (0.742ms)
  ✔ 8. Mendukung relasi 1-to-N (satu arahan memiliki banyak childTickets) (0.615ms)
  ✔ 9. Filter options untuk Koordinator mengembalikan role STAF (7.452ms)
  ✔ 10. Koordinator ditolak jika menugaskan dirinya sendiri sebagai pelaksana (9.845ms)
  ✔ 11. Staf ditugaskan memicu notifikasi TASK_ASSIGNED (1.102ms)
  ✔ 12. Query getTickets untuk Kadiv menyaring berdasarkan divisinya (13.784ms)
  ✔ 13. Kadiv ditolak 403 saat mengakses detail tiket milik divisi lain (12.914ms)
  ✔ 14. Direktur dapat melihat seluruh tiket lintas divisi tanpa pemblokiran (17.452ms)
  ✔ 15. Perubahan dan pembuatan tiket menyusun teks audit trail spesifik (3.245ms)
  ✔ 16. Notifikasi arahan divisi dikirim dengan template DIRECTIVE_ASSIGNED ke Koordinator (34.128ms)
  ✔ 17. Dedupe key menjamin keunikan per tiket, event, occurrence, dan recipient (0.412ms)
  ✔ 18. Role STAF ditolak 403 saat mencoba membuat tugas via endpoint BUAT_TUGAS (2.894ms)
  ✔ 19. Tiket lama dengan parentTicketId bernilai null tetap dibaca normal (8.745ms)
  ✔ 20. Template notifikasi tidak mengandung unsur data pasien atau rekam medis (1.412ms)
✔ Hierarki Workflow Test Suite (20 Skenario Bisnis) (480.125ms)

▶ MODUL 1–6: PENGUJIAN INTEGRASI & END-TO-END (7 SKENARIO BISNIS)
  ✔ SKENARIO 1: Alur Normal Tiket (Direktur -> Kadiv -> Koordinator -> Staf -> Submit -> Verifikasi -> SLA -> Audit) (28.452ms)
  ✔ SKENARIO 2: Alur Revisi (Submit -> Revisi diminta -> Notifikasi -> Perbaikan -> Submit Ulang -> Verifikasi) (18.125ms)
  ✔ SKENARIO 3: Deadline dan Overdue (Pendeteksian Mendekati Deadline, Overdue, dan Pengecualian Tiket Validasi/Selesai) (3.918ms)
  ✔ SKENARIO 4: Perpindahan Pelaksana (Reassignment -> Staf Baru Dapat Notifikasi, Staf Lama Dikeluarkan) (2.845ms)
  ✔ SKENARIO 5: Alur Eskalasi (Pelaporan Kendala -> HOLD_ESKALASI -> Kadiv Menerima Notifikasi) (3.112ms)
  ✔ SKENARIO 6: Isolasi Data (Kadiv Terisolasi pada Divisinya, Ditolak Lintas Divisi, Direktur Akses Seluruh Divisi) (4.891ms)
  ✔ SKENARIO 7: Ketahanan Sistem (Telegram Gagal -> Transaksi Tiket Tetap Jalan -> FAILED di Log -> Retry Sukses) (6.745ms)
✔ MODUL 1–6: PENGUJIAN INTEGRASI & END-TO-END (7 SKENARIO BISNIS) (68.088ms)

▶ MODUL 5 – NOTIFICATION LOG TEST SUITE (18 Skenario UAT)
  ✔ 1. Notifikasi berhasil dikirim -> status SENT dan sentAt terisi (21.412ms)
  ✔ 2. Notifikasi gagal dikirim -> status FAILED dan errorMessage tersimpan (6.128ms)
  ✔ 3. Telegram API timeout dicatat sebagai kegagalan tanpa melempar unhandled rejection (2.145ms)
  ✔ 4. User belum menghubungkan akun Telegram dicatat status FAILED dengan jelas (1.984ms)
  ✔ 5. Dedupe key stabil mencegah pengiriman ganda untuk event yang sama (1.892ms)
  ✔ 6. Dedupe key berbeda untuk status transisi berikutnya pada tiket yang sama (1.785ms)
  ✔ 7. Retry pengiriman notifikasi yang berstatus FAILED (attempts < 3) (7.452ms)
  ✔ 8. Retry tidak memproses notifikasi yang sudah mencapai batas maksimal percobaan (attempts >= 3) (2.145ms)
  ✔ 9. Retry mengabaikan notifikasi jika penerima belum menautkan Telegram (1.984ms)
  ✔ 10. Retry berhasil menggunakan data Chat ID terbaru jika user baru menautkan akun (5.412ms)
  ✔ 11. Endpoint GET /api/notifications dapat diakses oleh Admin dengan pagination & KPI (18.452ms)
  ✔ 12. Endpoint GET /api/notifications menolak akses dari role non-Admin (HTTP 403) (14.125ms)
  ✔ 13. Filter log notifikasi berdasarkan status (SENT, FAILED, PENDING) (17.452ms)
  ✔ 14. Filter log notifikasi berdasarkan jenis event (TASK_ASSIGNED, OVERDUE, dll) (16.784ms)
  ✔ 15. Pencarian log notifikasi berdasarkan kata kunci ID tiket atau nama penerima (18.125ms)
  ✔ 16. Endpoint POST /api/notifications/:id/retry untuk retry manual satu notifikasi oleh Admin (15.452ms)
  ✔ 17. Retry manual ditolak jika notifikasi sudah berstatus SENT (HTTP 400) (11.784ms)
  ✔ 18. Endpoint POST /api/notifications/retry-all untuk retry massal seluruh notifikasi gagal (19.452ms)
✔ MODUL 5 – NOTIFICATION LOG TEST SUITE (18 Skenario UAT) (321.458ms)

▶ MODUL 4 – RBAC & Data Isolation Test Suite (18 Skenario UAT)
  ✔ 1. Direktur dapat mengakses tiket seluruh divisi tanpa isolasi terbatas (8.125ms)
  ✔ 2. Direktur ditolak jika mencoba memberikan tugas operasional langsung ke Staf (7.452ms)
  ✔ 3. Kadiv ditolak jika mencoba memberikan tugas operasional langsung ke Staf (7.891ms)
  ✔ 4. Query getTickets untuk Kadiv menyaring tiket hanya milik divisinya sendiri (8.112ms)
  ✔ 5. Kadiv ditolak HTTP 403 saat mencoba mengakses detail tiket milik divisi lain (7.452ms)
  ✔ 6. Koordinator hanya dapat menugaskan tiket kepada Staf dalam divisinya sendiri (8.125ms)
  ✔ 7. Koordinator ditolak jika mencoba menugaskan staf dari divisi berbeda (7.891ms)
  ✔ 8. Staf hanya dapat melihat tiket yang ditugaskan kepada dirinya sendiri (8.412ms)
  ✔ 9. Staf ditolak HTTP 403 saat mencoba melihat tiket staf lain (7.452ms)
  ✔ 10. Staf dibatasi transisi statusnya (hanya MENUNGGU_VALIDASI / HOLD_ESKALASI) (8.125ms)
  ✔ 11. Staf ditolak saat mencoba mengubah pelaksana tiket (7.891ms)
  ✔ 12. Koordinator/Kadiv dilarang memvalidasi tiket jika dirinya adalah pelaksana (Segregation of Duties) (8.112ms)
  ✔ 13. Direktur diizinkan mengakses laporan SLA seluruh divisi (8.412ms)
  ✔ 14. Staf ditolak mutlak saat mencoba mengakses laporan kinerja SLA (HTTP 403) (7.891ms)
  ✔ 15. Backend mengabaikan manipulasi userId/role di body dan memakai data JWT otentik (10.019ms)
  ✔ 16. Request tanpa token ditolak HTTP 401 oleh middleware verifyToken (1.980ms)
  ✔ 17. Kadiv dipaksa membaca divisinya sendiri saat mengakses getSlaReportData untuk export (1.095ms)
  ✔ 18. Perubahan status mencatat action dan riwayat lengkap pada AuditLog (0.765ms)
✔ MODUL 4 – RBAC & Data Isolation Test Suite (18 Skenario UAT) (293.905ms)

▶ Modul 3: Laporan Kinerja SLA (19 Skenario UAT)
  ✔ 1. Staff mengumpulkan tugas sebelum deadline -> terhitung SESUAI_SLA (9.059ms)
  ✔ 2. Staff mengumpulkan tugas tepat pada deadline -> terhitung SESUAI_SLA (0.308ms)
  ✔ 3. Staff mengumpulkan tugas setelah deadline -> terhitung TERLAMBAT dengan selisih menit (0.275ms)
  ✔ 4. Tugas DIPROSES dikecualikan dari status query laporan SLA final (25.879ms)
  ✔ 5. Tugas MENUNGGU_VALIDASI tidak dimasukkan dalam laporan SLA final (1.367ms)
  ✔ 6. Tugas SELESAI dengan deadline dihitung dalam laporan SLA final (1.884ms)
  ✔ 7. Tugas berstatus DITOLAK tidak dimasukkan dalam laporan SLA (0.753ms)
  ✔ 8. Filter rentang waktu kustom (startDate & endDate) terpasang di klausul query (1.610ms)
  ✔ 9. Filter divisi menyaring tiket sesuai divisi yang dipilih (1.429ms)
  ✔ 10. Direktur/Admin tanpa parameter divisiId dapat mengakses data seluruh divisi (0.888ms)
  ✔ 11. Kadiv terkunci secara mutlak pada divisi miliknya sendiri (1.027ms)
  ✔ 12. Staf ditolak mengakses laporan SLA dengan HTTP 403 (2.528ms)
  ✔ 13. Kadiv yang mencoba bypass ?divisiId=99 tetap dipaksa membaca divisinya sendiri (0.636ms)
  ✔ 14. Total tiket selesai, persentase kepatuhan, dan jumlah tepat waktu konsisten dengan rincian tabel (1.487ms)
  ✔ 15. Perhitungan selisih keterlambatan akurat dalam format hari, jam, dan menit (0.308ms)
  ✔ 16. Saat tidak ada tiket selesai, sistem aman tanpa pembagian nol atau NaN (0.577ms)
  ✔ 17. Tiket historis tanpa AuditLog pengumpulan fallback jujur ke completedAt (1.046ms)
  ✔ 18. Ekspor Excel menghasilkan response attachment dengan header Content-Type openxmlformats (69.694ms)
  ✔ 19. Ekspor PDF menghasilkan dokumen application/pdf dan bebas dari kebocoran data rekam medis (28.944ms)
✔ Modul 3: Laporan Kinerja SLA (19 Skenario UAT) (152.955ms)

▶ notifyDeadlineEvent
  ✔ tidak mengirim dua kali untuk event dan periode yang sama (23.822ms)
  ✔ mencatat kegagalan Telegram tanpa melempar error ke pemanggil (2.562ms)
  ✔ menggunakan Chat ID terbaru dari database (2.456ms)
✔ notifyDeadlineEvent (32.001ms)

▶ planTicketNotificationEvents
  ✔ mengirim TASK_ASSIGNED hanya kepada staf yang ditugaskan (4.786ms)
  ✔ reassignment hanya menotifikasi pelaksana baru (0.578ms)
  ✔ submit pemeriksaan menotifikasi penanggung jawab, bukan pelaksana (2.633ms)
  ✔ revisi menotifikasi pelaksana (0.824ms)
  ✔ verifikasi menotifikasi pelaksana (0.676ms)
  ✔ perubahan status yang sama tidak merencanakan event berulang (2.119ms)
  ✔ HOLD_ESKALASI tidak memicu event Modul 2 (0.733ms)
✔ planTicketNotificationEvents (16.549ms)

▶ buildNotificationMessage
  ✔ tidak memuat data pasien, RME, lokasi, atau bukti (43.577ms)
  ✔ menyertakan catatan revisi hanya pada event revisi (3.122ms)
✔ buildNotificationMessage (47.594ms)

▶ dispatchTicketNotifications
  ✔ kegagalan satu penerima tidak menghentikan penerima lain (5.357ms)
✔ dispatchTicketNotifications (5.716ms)

ℹ tests 128
ℹ suites 13
ℹ pass 128
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5149.4158
```

---

## 2. Bukti Sanitasi Payload Respon API (Bebas Rahasia & Bebas RME)

### A. Contoh Respon `GET /api/config` (Disensor Tanpa Plain Secret)
```json
{
  "success": true,
  "config": {
    "telegramEnabled": true,
    "maxRetryAttempts": 3,
    "reminderHoursBeforeDeadline": 24,
    "timeZone": "Asia/Makassar",
    "cronSchedule": "*/15 * * * *",
    "enabledNotificationTypes": {
      "DIRECTIVE_ASSIGNED": true,
      "TASK_ASSIGNED": true,
      "TASK_REASSIGNED": true,
      "TASK_SUBMITTED": true,
      "TASK_REVISION_REQUIRED": true,
      "TASK_VERIFIED": true,
      "TASK_ESCALATED": true,
      "DEADLINE_SOON": true,
      "OVERDUE": true
    },
    "slaHours": {
      "RENDAH": 72,
      "SEDANG": 48,
      "TINGGI": 24,
      "URGENT": 8
    }
  },
  "metadata": {
    "telegramConfigured": true,
    "tokenMasked": "7829...kL29",
    "environment": "test"
  }
}
```

### B. Contoh Format Pesan Notifikasi Telegram (Sanitasi Bebas Data Pasien)
```text
[NOTIFIKASI TUGAS OPERASIONAL]
Kode Tiket: #T-042
Judul: Kalibrasi dan Pemeriksaan Probe Mesin USG Poli 1
Prioritas: SEDANG
Batas Waktu (SLA): 06 November 2026, 17:00 WITA
Ditugaskan Oleh: Koordinator Poli Rawat Jalan

Segera lakukan konfirmasi dan perbarui progres pekerjaan pada sistem E-Ticketing RSIA Qurrata A’yun.
```
*(Terbukti: Tidak ada field nomor rekam medis, nama pasien, diagnosis dokter, atau data rahasia).*
