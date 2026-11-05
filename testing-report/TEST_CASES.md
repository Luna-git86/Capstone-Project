# DAFTAR LENGKAP TEST CASE OTOMATIS (128 SKENARIO)
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda

---

### Bagian 1: Modul 1 – Penjadwalan Otomatis (Cron Job)
*File pengujian: `Backend/tests/deadlineCheckService.test.js` & `Backend/tests/deadlineScheduler.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M1-01 | Deteksi Tiket Mendekati Deadline | Memastikan tiket aktif dengan sisa waktu &le; 24 jam terdeteksi | Tiket status `DIPROSES`, deadline 5 jam dari sekarang | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Mengembalikan action `DEADLINE_SOON` | Action `DEADLINE_SOON` terdeteksi | **PASS** |
| TC-M1-02 | Deteksi Tiket Overdue | Memastikan tiket aktif yang melewati deadline terdeteksi | Tiket status `DIPROSES`, deadline 2 jam lalu | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Mengembalikan action `OVERDUE` | Action `OVERDUE` terdeteksi | **PASS** |
| TC-M1-03 | Pengecualian Tiket Selesai | Mencegah tiket selesai diproses cron job | Tiket status `SELESAI`, deadline kemarin | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `SKIP`, reason `INACTIVE` | Dilewati dengan reason `INACTIVE` | **PASS** |
| TC-M1-04 | Pengecualian Tiket Ditolak | Mencegah tiket ditolak mendapatkan notifikasi | Tiket status `DITOLAK`, deadline kemarin | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `SKIP`, reason `INACTIVE` | Dilewati dengan reason `INACTIVE` | **PASS** |
| TC-M1-05 | Pengecualian Tiket Review | Tiket menunggu validasi tidak boleh ditandai overdue | Tiket status `MENUNGGU_VALIDASI`, deadline lewat | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `SKIP`, reason `IN_REVIEW` | Dilewati dengan reason `IN_REVIEW` | **PASS** |
| TC-M1-06 | Pengecualian Tiket Tanpa Deadline | Tiket tanpa batas waktu dilewati tanpa error | Tiket dengan deadline `null` | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `SKIP`, reason `NO_DEADLINE` | Dilewati dengan reason `NO_DEADLINE` | **PASS** |
| TC-M1-07 | Pengecualian Tiket Tanpa Pelaksana | Tiket belum ditugaskan dilewati | Tiket dengan pelaksanaId `null` | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `SKIP`, reason `NO_ASSIGNEE` | Dilewati dengan reason `NO_ASSIGNEE` | **PASS** |
| TC-M1-08 | Pemeriksaan Tiket HOLD_ESKALASI | Tiket hold eskalasi yang lewat waktu tetap dipantau | Tiket status `HOLD_ESKALASI`, deadline lewat | Panggil `classifyDeadlineTicket(tiket, now, 24)` | Action `OVERDUE` | Action `OVERDUE` terdeteksi | **PASS** |
| TC-M1-09 | Batch Processing Multi-Tiket | Memproses banyak tiket sekaligus secara atomik | 7 tiket dengan status dan deadline acak | Jalankan `checkDeadlines(deps)` | Seluruh tiket terklasifikasi, pengiriman dipicu | 7 tiket diperiksa, hasil klasifikasi akurat | **PASS** |
| TC-M1-10 | Ketahanan Siklus terhadap Error Tiket | Satu tiket error tidak memutus tiket berikutnya | Tiket #1 mock Telegram timeout, Tiket #2 normal | Jalankan `checkDeadlines(deps)` | Tiket #1 dicatat gagal, Tiket #2 tetap terkirim | Tiket #2 berhasil dikirim tanpa crash | **PASS** |
| TC-M1-11 | Pencegahan Cron di Test Environment | Mencegah cron aktif otomatis saat unit testing | Environment `NODE_ENV=test` | Jalankan `startDeadlineScheduler()` | Mengembalikan `null` | Scheduler tidak aktif di mode test | **PASS** |
| TC-M1-12 | Pendaftaran Cron saat Startup Server | Scheduler terdaftar saat backend aktif | Panggil `startDeadlineScheduler({ force: true })` | Ambil status scheduler | Status scheduler bernilai `true` | Scheduler aktif terdaftar | **PASS** |
| TC-M1-13 | Anti-Duplikasi Instance Cron | Mencegah pendaftaran ganda cron job | Panggil `startDeadlineScheduler` dua kali | Periksa return instance | Mengembalikan instance yang sama | Instance kedua tidak diduplikasi | **PASS** |
| TC-M1-14 | Siklus Restart Scheduler | Memastikan scheduler dapat restart bersih | Hentikan scheduler lalu mulai kembali | Periksa lifecycle method | Scheduler nonaktif lalu aktif kembali | Siklus restart berfungsi | **PASS** |
| TC-M1-15 | Penanganan Exception Siklus Cron | Error tidak tertangani dalam cron tidak mematikan server | Mock checkDeadlines melempar error | Eksekusi siklus cron terjadwal | Server tetap hidup, error dicatat | Loop scheduler tetap berjalan | **PASS** |

---

### Bagian 2: Modul 2 – Notifikasi Otomatis (Telegram)
*File pengujian: `Backend/tests/ticketNotificationService.test.js`, `Backend/tests/telegramDeadlineNotify.test.js`, & `Backend/tests/hierarchyWorkflow.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M2-01 | Notifikasi Penugasan Staf | Mengirim `TASK_ASSIGNED` ke pelaksana baru | Tiket baru dibuat dengan pelaksana Staf | Panggil `planTicketNotificationEvents` | Event `TASK_ASSIGNED` dengan recipientId Staf | Event terencana tepat ke Staf | **PASS** |
| TC-M2-02 | Notifikasi Pengalihan Pelaksana | Mengirim `TASK_REASSIGNED` hanya ke pelaksana baru | Pelaksana diubah dari Staf A ke Staf B | Panggil `planTicketNotificationEvents` | Event `TASK_REASSIGNED` ke Staf B | Hanya Staf B yang menerima notifikasi | **PASS** |
| TC-M2-03 | Notifikasi Pengajuan Tugas Selesai | Mengirim `TASK_SUBMITTED` ke Koordinator | Status tiket diubah ke `MENUNGGU_VALIDASI` | Panggil `planTicketNotificationEvents` | Event `TASK_SUBMITTED` ke penanggungJawab | Dikirim ke penanggungJawab | **PASS** |
| TC-M2-04 | Notifikasi Permintaan Revisi | Mengirim `TASK_REVISION_REQUIRED` ke Staf | Status dari `MENUNGGU_VALIDASI` ke `DIPROSES` | Panggil `planTicketNotificationEvents` | Event `TASK_REVISION_REQUIRED` ke pelaksana | Dikirim ke pelaksana | **PASS** |
| TC-M2-05 | Notifikasi Verifikasi Selesai | Mengirim `TASK_VERIFIED` ke Staf pelaksana | Status diubah menjadi `SELESAI` | Panggil `planTicketNotificationEvents` | Event `TASK_VERIFIED` ke pelaksana | Dikirim ke pelaksana | **PASS** |
| TC-M2-06 | Pengecualian Status yang Sama | Mencegah event saat status tidak berubah | Update tiket tanpa perubahan status | Panggil `planTicketNotificationEvents` | Array event kosong | Tidak ada event berulang | **PASS** |
| TC-M2-07 | Pengecualian Event pada Eskalasi | Memastikan eskalasi terkendali sesuai konfigurasi | Status diubah ke `HOLD_ESKALASI` | Panggil tanpa flag escalation | Tidak ada event publik liar | Event terkendali | **PASS** |
| TC-M2-08 | Sanitasi Pesan Bebas Data Pasien | Menjamin kerahasiaan medis (tidak ada RME) | Tiket berisi judul operasional fasilitas | Format via `buildNotificationMessage` | Pesan bersih dari rekam medis pasien | Lolos verifikasi sanitasi data medis | **PASS** |
| TC-M2-09 | Catatan Revisi dalam Pesan | Memastikan instruksi revisi tampil di notifikasi | Event revisi dengan catatan koordinator | Format via `buildNotificationMessage` | Catatan revisi tercantum jelas | Catatan revisi tampil di pesan | **PASS** |
| TC-M2-10 | Isolasi Kegagalan Multikirim | Kegagalan kirim 1 user tidak membatalkan yang lain | Penerima A error 500, Penerima B sukses | Panggil `dispatchTicketNotifications` | Penerima B tetap terkirim | Penerima B sukses terkirim | **PASS** |
| TC-M2-11 | Anti-Duplikasi Notifikasi Deadline | Pengingat tidak dikirim dua kali untuk periode sama | Tiket mendekati deadline diperiksa 2x | Panggil `notifyDeadlineEvent` 2x | Pemanggilan ke-2 menghasilkan `duplicate: true` | Duplikasi dicegah | **PASS** |
| TC-M2-12 | Graceful Error Notifikasi Deadline | Telegram API down tidak melempar uncaught error | Mock fetch melempar timeout | Panggil `notifyDeadlineEvent` | Mengembalikan `sent: false`, log `FAILED` | Error tertangani aman | **PASS** |
| TC-M2-13 | Pembaruan Chat ID Dinamis | Notifikasi memakai Chat ID terbaru di database | User mengubah chat ID Telegram | Panggil `notifyDeadlineEvent` | Membaca Chat ID teranyar | Chat ID terkini digunakan | **PASS** |
| TC-M2-14 s/d TC-M2-30 | Hierarki Workflow & Notifikasi Arahan | Menguji alur arahan Kadiv, Koordinator, dan Staf | 17 Skenario pemetaan tiket induk-anak | Uji integrasi delegasi dan notifikasi | Sesuai hierarki RSIA Qurrata A’yun | Seluruh 17 skenario passing | **PASS** |

---

### Bagian 3: Modul 3 – Rekapitulasi Kinerja (Reporting SLA)
*File pengujian: `Backend/tests/slaReport.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M3-01 | Tugas Selesai Sebelum Deadline | Memastikan kepatuhan SLA tepat waktu dihitung benar | Submission dilakukan 2 jam sebelum deadline | Panggil `getSlaReportData` | `statusSLA: 'SESUAI_SLA'`, selisih 0 menit | Terhitung `SESUAI_SLA` | **PASS** |
| TC-M3-02 | Tugas Tepat pada Deadline | Memastikan batas toleransi deadline tepat | Submission pada detik yang sama dengan deadline | Panggil `getSlaReportData` | `statusSLA: 'SESUAI_SLA'` | Terhitung `SESUAI_SLA` | **PASS** |
| TC-M3-03 | Tugas Melewati Deadline | Memastikan status terlambat dan selisih menit akurat | Submission 30 menit setelah deadline | Panggil `getSlaReportData` | `statusSLA: 'TERLAMBAT'`, selisih 30 menit | Terhitung `TERLAMBAT` (30 menit) | **PASS** |
| TC-M3-04 | Pengecualian Tiket DIPROSES | Tiket yang masih berjalan tidak dimasukkan | Tiket berstatus `DIPROSES` | Panggil `getSlaReportData` | Tiket tidak muncul di daftar selesai | Dikecualikan dari laporan final | **PASS** |
| TC-M3-05 | Pengecualian Tiket MENUNGGU_VALIDASI | Tiket yang belum disahkan tidak dimasukkan | Tiket berstatus `MENUNGGU_VALIDASI` | Panggil `getSlaReportData` | Tiket tidak muncul di daftar selesai | Dikecualikan dari laporan final | **PASS** |
| TC-M3-06 | Tiket SELESAI Masuk Laporan | Tiket selesai diverifikasi terhitung dalam laporan | Tiket berstatus `SELESAI` dengan deadline | Panggil `getSlaReportData` | Tiket muncul dalam daftar laporan | Masuk dalam rekapitulasi | **PASS** |
| TC-M3-07 | Pengecualian Tiket Ditolak | Tiket ditolak tidak dihitung dalam capaian SLA | Tiket berstatus `DITOLAK` | Panggil `getSlaReportData` | Tiket tidak dimasukkan dalam hitungan | Dikecualikan | **PASS** |
| TC-M3-08 | Filter Rentang Tanggal Kustom | Menyaring laporan berdasarkan periode tertentu | Parameter `startDate` & `endDate` | Panggil `getSlaReportData` | Hanya tiket dalam rentang yang tampil | Filter tanggal diterapkan | **PASS** |
| TC-M3-09 | Filter Divisi Spesifik | Menyaring data hanya untuk divisi yang dipilih | Parameter `divisiId=1` | Panggil `getSlaReportData` | Hanya tiket Divisi 1 yang tampil | Filter divisi bekerja | **PASS** |
| TC-M3-10 | Akses Bebas Direktur / Admin | Direktur dapat mengakses laporan semua divisi | User role `DIREKTUR` tanpa filter divisi | Panggil `getSlaReportData` | Data seluruh divisi tampil | Seluruh divisi ditampilkan | **PASS** |
| TC-M3-11 | Isolasi Divisi untuk Kadiv | Kadiv terkunci mutlak pada divisinya sendiri | User role `KADIV` divisiId 2 | Panggil `getSlaReportData` | Hanya divisi 2 yang tampil | Terkunci pada divisi sendiri | **PASS** |
| TC-M3-12 | Penolakan Akses Staf (403) | Staf dilarang melihat laporan kinerja manajerial | User role `STAF` | Panggil `getSlaReportData` | Melempar HTTP 403 Forbidden | Ditolak HTTP 403 | **PASS** |
| TC-M3-13 | Proteksi Bypass Filter Kadiv | Kadiv mencoba memanipulasi parameter divisi lain | Kadiv Divisi 1 request `?divisiId=99` | Panggil `getSlaReportData` | Parameter 99 diabaikan, dipaksa Divisi 1 | Tetap terkunci di Divisi 1 | **PASS** |
| TC-M3-14 | Konsistensi Angka Ringkasan | Total tiket, tepat waktu, dan persentase konsisten | 10 tiket uji (7 tepat waktu, 3 terlambat) | Periksa objek `ringkasan` | Total: 10, Sesuai: 7, Terlambat: 3, 70% | Angka ringkasan 100% konsisten | **PASS** |
| TC-M3-15 | Format Durasi Keterlambatan | Format tampilan hari, jam, dan menit informatif | Selisih 1500 menit (1 hari 1 jam) | Periksa `selisihKeterlambatanFormatted` | Menampilkan string ramah pengguna | Format durasi rapi dan informatif | **PASS** |
| TC-M3-16 | Penanganan Data Kosong (Zero Division) | Menghindari error pembagian nol saat data kosong | Nol tiket selesai dalam periode terpilih | Panggil `getSlaReportData` | `persentaseSLA: 0`, tidak ada `NaN` | Aman, mengembalikan 0% tanpa crash | **PASS** |
| TC-M3-17 | Fallback Waktu Tiket Historis | Menangani tiket lama tanpa audit log submission | Tiket tanpa log status `MENUNGGU_VALIDASI` | Panggil `getSlaReportData` | Fallback jujur ke `completedAt` | Fallback waktu berjalan aman | **PASS** |
| TC-M3-18 | Ekspor Laporan Excel | Menghasilkan berkas attachment XLSX yang valid | Request endpoint `/api/laporan-sla/export/excel` | Periksa response buffer & Content-Type | Header attachment openxmlformats | File Excel valid terunduh | **PASS** |
| TC-M3-19 | Ekspor Laporan PDF Bebas RME | Menghasilkan dokumen PDF bebas data pasien | Request endpoint `/api/laporan-sla/export/pdf` | Periksa PDF stream & isi teks | Header application/pdf, bebas RME | Dokumen PDF resmi terbuat | **PASS** |

---

### Bagian 4: Modul 4 – RBAC dan Data Isolation
*File pengujian: `Backend/tests/rbacDataIsolation.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M4-01 | Akses Tiket Seluruh Divisi (Direktur) | Direktur dapat melihat tiket lintas divisi | User `DIREKTUR` | Panggil `getTickets` | Query `where` tidak dibatasi divisi | Akses seluruh divisi terbuka | **PASS** |
| TC-M4-02 | Larangan Penugasan Staf oleh Direktur | Direktur tidak boleh menugaskan Staf langsung | Direktur buat tugas operasional ke Staf | Panggil `createTicket` | Ditolak HTTP 403 / 400 | Ditolak sesuai hierarki RS | **PASS** |
| TC-M4-03 | Larangan Penugasan Staf oleh Kadiv | Kadiv hanya menugaskan Koordinator | Kadiv buat tugas operasional ke Staf | Panggil `createTicket` | Ditolak HTTP 403 / 400 | Ditolak sesuai hierarki RS | **PASS** |
| TC-M4-04 | Kadiv Terkunci pada Divisinya Sendiri | Query tiket Kadiv dibatasi divisinya | User `KADIV` Divisi 1 | Panggil `getTickets` | Query `where` mencakup divisiId 1 | Terisolasi pada divisinya | **PASS** |
| TC-M4-05 | Penolakan Detail Tiket Lintas Divisi (Kadiv) | Kadiv dilarang buka detail tiket divisi lain | Kadiv Divisi 1 buka tiket Divisi 2 | Panggil `getTicketById` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 Forbidden | **PASS** |
| TC-M4-06 | Hak Pembuatan Tugas Koordinator | Koordinator dapat membuat tiket ke Staf divisinya | User `KOORDINATOR` menugaskan Staf | Panggil `createTicket` | Tugas berhasil dibuat (HTTP 201) | Berhasil dibuat HTTP 201 | **PASS** |
| TC-M4-07 | Larangan Koordinator Tugas Lintas Divisi | Koordinator dilarang menugaskan Staf divisi lain | Koordinator Divisi 1 pilih Staf Divisi 2 | Panggil `createTicket` | Ditolak HTTP 400 / 403 | Ditolak pelanggaran divisi | **PASS** |
| TC-M4-08 | Isolasi Tiket Staf Pelaksana | Staf hanya melihat tugas miliknya sendiri | User `STAF` id 5 | Panggil `getTickets` | Filter memaksa `pelaksanaId: 5` | Staf hanya melihat tugasnya | **PASS** |
| TC-M4-09 | Penolakan Detail Tugas Staf Lain | Staf dilarang mengintip detail tugas Staf lain | Staf id 5 buka tiket milik Staf id 6 | Panggil `getTicketById` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 Forbidden | **PASS** |
| TC-M4-10 | Pembatasan Transisi Status Staf | Staf hanya boleh mengajukan validasi / eskalasi | Staf mencoba langsung ubah ke `SELESAI` | Panggil `updateTicketStatus` | Ditolak HTTP 403 Forbidden | Ditolak, butuh verifikasi | **PASS** |
| TC-M4-11 | Larangan Manipulasi Pelaksana oleh Staf | Staf dilarang mengalihkan pelaksana tiket | Staf kirim body mengubah pelaksanaId | Panggil `updateTicketStatus` | Nilai pelaksanaId diabaikan | Pelaksana tidak berubah | **PASS** |
| TC-M4-12 | Segregation of Duties (Pemeriksa ≠ Pelaksana)| Pelaksana dilarang memverifikasi tugasnya sendiri | Koordinator adalah pelaksana sekaligus pemeriksa | Panggil `updateTicketStatus` ke `SELESAI` | Ditolak HTTP 400 (Pemisahan Tugas) | Ditolak demi integritas audit | **PASS** |
| TC-M4-13 | Hak Akses Laporan SLA Direktur | Direktur diizinkan membuka laporan SLA | User role `DIREKTUR` | Panggil `getLaporanSLA` | HTTP 200 OK | HTTP 200 OK | **PASS** |
| TC-M4-14 | Penolakan Hak Akses Laporan SLA Staf | Staf dilarang keras membuka laporan SLA | User role `STAF` | Panggil `getLaporanSLA` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 Forbidden | **PASS** |
| TC-M4-15 | Imunitas Manipulasi Identitas di Request Body| Nilai `userId` / `role` di body request diabaikan | Hacker mengirim `{ role: 'DIREKTUR' }` di body | Eksekusi controller | Backend menggunakan data JWT asli | Manipulasi body diabaikan | **PASS** |
| TC-M4-16 | Penolakan Request Tanpa Token (401) | Endpoint terproteksi menolak request unauthenticated | Request tanpa header `Authorization` | Middleware `verifyToken` | Ditolak HTTP 401 Unauthorized | Ditolak HTTP 401 Unauthorized | **PASS** |
| TC-M4-17 | Isolasi Ekspor Data Laporan Kadiv | Ekspor laporan oleh Kadiv terkunci pada divisinya | Kadiv Divisi 1 download laporan | Panggil `getSlaReportData` | Parameter divisi luar diabaikan | Data ekspor terkunci Divisi 1 | **PASS** |
| TC-M4-18 | Pencatatan Otomatis pada AuditLog | Setiap mutasi status dan tugas dicatat | Update status tiket operasional | Periksa `prisma.auditLog.create` | Entri audit tercatat lengkap | AuditLog tersimpan otomatis | **PASS** |

---

### Bagian 5: Modul 5 – Notification Log dan Penanganan Gagal
*File pengujian: `Backend/tests/notificationLog.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M5-01 | Pencatatan Notifikasi Sukses | Status dicatat `SENT` dan `sentAt` terisi | Pengiriman notifikasi Telegram berhasil | Panggil `notifyTicketEvent` | `status: 'SENT'`, `sentAt` ada, error `null` | Status `SENT` tercatat | **PASS** |
| TC-M5-02 | Pencatatan Notifikasi Gagal | Status dicatat `FAILED` dan error message disimpan | Telegram API melempar error koneksi | Panggil `notifyTicketEvent` | `status: 'FAILED'`, errorMessage terisi | Status `FAILED` tercatat | **PASS** |
| TC-M5-03 | Penanganan Timeout Telegram | Jaringan lambat dicatat tanpa mematikan proses | Simulasi timeout AbortController | Panggil `notifyTicketEvent` | Status `FAILED`, timeout tertangani | Tercatat gagal tanpa unhandled rejection | **PASS** |
| TC-M5-04 | User Belum Hubungkan Telegram | Status dicatat `FAILED` dengan keterangan unlinked | User memiliki `telegramChatId: null` | Panggil `notifyTicketEvent` | Error: "Telegram belum terhubung" | Tercatat unlinked tanpa crash | **PASS** |
| TC-M5-05 | Stabilitas DedupeKey Anti-Spam | Menjamin pesan sama tidak dikirim berulang | Parameter tiket, tipe, penerima sama | Jalankan pengiriman 2 kali | Pengiriman kedua dilewati (`duplicate: true`) | Duplikasi dicegah | **PASS** |
| TC-M5-06 | DedupeKey Berbeda untuk Event Baru | Event berikutnya pada tiket sama tetap terkirim | Event penugasan diikuti event verifikasi | Bandingkan dedupeKey kedua event | Kunci berbeda dan diizinkan kirim | Kunci unik per event | **PASS** |
| TC-M5-07 | Retry Otomatis Notifikasi Gagal | Cron scheduler mencoba mengirim ulang log gagal | Log berstatus `FAILED`, attempts < 3 | Jalankan `retryFailedNotifications` | Attempts bertambah, status jadi `SENT` | Berhasil dikirim ulang | **PASS** |
| TC-M5-08 | Penghentian Retry Mencapai Batas | Log yang mencapai max retry tidak dikirim lagi | Log berstatus `FAILED`, attempts = 3 | Jalankan `retryFailedNotifications` | Log dilewati dari query retry | Tidak dicoba ulang lagi | **PASS** |
| TC-M5-09 | Retry Mengabaikan User Tanpa Chat ID | Log gagal milik user unlinked tidak di-retry sia-sia | Log gagal tanpa Chat ID | Jalankan `retryFailedNotifications` | Dilewati tanpa memanggil Telegram API | Dilewati secara efisien | **PASS** |
| TC-M5-10 | Sinkronisasi Chat ID saat Retry | Memakai Chat ID terbaru jika user baru menautkan akun | User baru saja menautkan Telegram | Jalankan `retryFailedNotifications` | Chat ID terbaru dipakai, pesan terkirim | Terkirim ke akun baru | **PASS** |
| TC-M5-11 | Hak Akses Log Notifikasi (Admin Only) | Hanya Admin yang boleh mengakses endpoint log | Request via role `ADMIN` | Panggil `getNotificationLogs` | HTTP 200 OK dengan ringkasan & data | HTTP 200 OK | **PASS** |
| TC-M5-12 | Penolakan Akses Log Non-Admin | User non-admin dilarang melihat riwayat notifikasi | Request via role `KADIV` / `STAF` | Panggil `getNotificationLogs` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 Forbidden | **PASS** |
| TC-M5-13 | Filter Status Log Notifikasi | Menyaring log berdasarkan status SENT / FAILED | Query `?status=FAILED` | Panggil `getNotificationLogs` | Hanya log FAILED yang tampil | Filter status berfungsi | **PASS** |
| TC-M5-14 | Filter Jenis Notifikasi | Menyaring log berdasarkan tipe event | Query `?type=TASK_ASSIGNED` | Panggil `getNotificationLogs` | Hanya event penugasan yang tampil | Filter tipe event berfungsi | **PASS** |
| TC-M5-15 | Pencarian ID Tiket / Nama Penerima | Mencari log berdasarkan kata kunci | Query `?search=Kalibrasi` | Panggil `getNotificationLogs` | Hasil pencarian relevan tampil | Pencarian berfungsi | **PASS** |
| TC-M5-16 | Retry Manual Satu Notifikasi (Admin) | Admin mengirim ulang spesifik satu pesan gagal | Admin klik tombol retry pada log #12 | Panggil `retrySingleNotification` | Status terupdate menjadi `SENT` | Log spesifik sukses di-retry | **PASS** |
| TC-M5-17 | Penolakan Retry Notifikasi yang Sudah Sukses | Mencegah spam pesan yang sudah berstatus SENT | Admin mencoba retry notifikasi berstatus SENT | Panggil `retrySingleNotification` | Ditolak HTTP 400 (Sudah terkirim) | Ditolak HTTP 400 | **PASS** |
| TC-M5-18 | Retry Massal oleh Admin | Admin memicu retry seluruh log gagal yang valid | Beberapa notifikasi gagal di database | Panggil `retryAllFailedNotifications` | Memproses batch dengan ringkasan sukses/gagal | Retry massal selesai | **PASS** |

---

### Bagian 6: Modul 6 – Konfigurasi Admin (Admin Configuration)
*File pengujian: `Backend/tests/adminConfig.test.js`*

| ID Test | Nama Test Case | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-M6-01 | Ambil Konfigurasi Sistem (Admin) | Menyajikan seluruh pengaturan operasional ke Admin | User role `ADMIN` | `GET /api/config` | HTTP 200 OK dengan objek konfigurasi lengkap | HTTP 200 OK | **PASS** |
| TC-M6-02 | Penolakan Akses Config (Kadiv) | Kadiv dilarang mengakses konfigurasi sistem | User role `KADIV` | `GET /api/config` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 | **PASS** |
| TC-M6-03 | Penolakan Akses Config (Koordinator) | Koordinator dilarang mengakses konfigurasi sistem | User role `KOORDINATOR` | `GET /api/config` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 | **PASS** |
| TC-M6-04 | Penolakan Akses Config (Staf) | Staf dilarang mengakses konfigurasi sistem | User role `STAF` | `GET /api/config` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 | **PASS** |
| TC-M6-05 | Penolakan Akses Config (Direktur) | Pengaturan operasional terbatas untuk peran Admin | User role `DIREKTUR` | `GET /api/config` | Ditolak HTTP 403 Forbidden | Ditolak HTTP 403 | **PASS** |
| TC-M6-06 | Penolakan Request Tanpa Token | Mencegah akses anonim ke pengaturan sistem | Tanpa token otentikasi | `GET /api/config` | Ditolak HTTP 401 Unauthorized | Ditolak HTTP 401 | **PASS** |
| TC-M6-07 | Masking Kredensial Bot Token | Token bot tidak pernah dikirim polos ke klien | Server memiliki `TELEGRAM_BOT_TOKEN` | Periksa payload `GET /api/config` | Token tidak tampil atau disamarkan (`***`) | Kredensial terlindungi aman | **PASS** |
| TC-M6-08 | Mutasi Master Switch Telegram | Admin dapat mengaktifkan/mematikan bot | Payload `{ telegramEnabled: false }` | `PUT /api/config` | `telegramEnabled` bernilai `false` di store | Master switch berubah | **PASS** |
| TC-M6-09 | Pembaruan Max Retry Attempts | Admin mengatur batas retry (1-10) | Payload `{ maxRetryAttempts: 5 }` | `PUT /api/config` | `maxRetryAttempts` berubah jadi 5 | Batas retry terupdate | **PASS** |
| TC-M6-10 | Validasi Rentang Max Retry | Menolak nilai retry tidak valid (<1 atau >10) | Payload `{ maxRetryAttempts: 0 }` | `PUT /api/config` | Ditolak HTTP 400 Bad Request | Ditolak HTTP 400 | **PASS** |
| TC-M6-11 | Pembaruan Jam Pengingat Deadline | Admin mengatur jam pengingat (misal 12 jam) | Payload `{ reminderHoursBeforeDeadline: 12 }` | `PUT /api/config` | Waktu pengingat berubah jadi 12 jam | Waktu pengingat terupdate | **PASS** |
| TC-M6-12 | Validasi Rentang Jam Pengingat | Menolak jam negatif atau melebihi 168 jam | Payload `{ reminderHoursBeforeDeadline: -5 }` | `PUT /api/config` | Ditolak HTTP 400 Bad Request | Ditolak HTTP 400 | **PASS** |
| TC-M6-13 | Toggle Event Notifikasi Aktif | Admin mengontrol jenis notifikasi yang dikirimkan | Matikan `DIRECTIVE_ASSIGNED`, hidupkan yang lain | `PUT /api/config` | Konfigurasi per event tersimpan di runtime | Toggle event aktif | **PASS** |
| TC-M6-14 | Pembaruan Durasi Standar SLA | Menyesuaikan standar waktu selesai per prioritas | Payload `{ slaHours: { RENDAH: 96, URGENT: 4 } }` | `PUT /api/config` | Standar SLA diperbarui di config store | SLA default terupdate | **PASS** |
| TC-M6-15 | Pencatatan Audit Perubahan Konfigurasi | Setiap perubahan admin wajib tercatat di AuditLog | Admin mengubah konfigurasi | Periksa tabel `AuditLog` di database | Entri `UPDATE_SYSTEM_CONFIG` tersimpan | AuditLog tercatat lengkap | **PASS** |
| TC-M6-16 | Health Check Koneksi Bot Telegram | Menguji komunikasi server backend dengan Telegram | `GET /api/config/telegram-status` | Memeriksa respon endpoint | Status bot (`CONNECTED` / `ERROR`) tampil | Health check aktif | **PASS** |
| TC-M6-17 | Ringkasan Keterhubungan Akun Pegawai | Agregasi pegawai terhubung vs belum per role | `GET /api/config/recipients-summary` | Memeriksa struktur agregasi | Menampilkan statistik akun per peran | Agregasi akurat | **PASS** |
| TC-M6-18 | Riwayat Log Perubahan Konfigurasi | Menampilkan riwayat perubahan sistem di antarmuka | `GET /api/config/audit-logs` | Memeriksa respon endpoint | Daftar log perubahan sistem tampil | Riwayat log dapat diakses | **PASS** |

---

### Bagian 7: Pengujian Integrasi End-to-End (7 Skenario)
*File pengujian: `Backend/tests/integrationE2E.test.js`*

| ID Test | Nama Skenario E2E | Tujuan Pengujian | Data Awal | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|:---:|
| TC-E2E-01 | Skenario 1: Alur Normal Tiket | Menguji siklus hidup tiket penuh dari awal hingga selesai | Direktur &rarr; Kadiv &rarr; Koordinator &rarr; Staf | Buat arahan, delegasi, submit, verifikasi | Status `SELESAI`, SLA dihitung tepat waktu | Alur tuntas, SLA valid | **PASS** |
| TC-E2E-02 | Skenario 2: Alur Revisi Pekerjaan | Menguji siklus revisi dari Koordinator ke Staf | Koordinator minta revisi | Kirim revisi, Staf perbaiki, submit ulang | Status kembali diproses lalu selesai | Alur revisi tuntas | **PASS** |
| TC-E2E-03 | Skenario 3: Deadline dan Overdue | Menguji penandaan mendekati deadline dan overdue | 4 tiket dengan kondisi berbeda | Klasifikasi dengan cron service | Mendekati, overdue, dan review dibedakan tepat | Deteksi waktu akurat | **PASS** |
| TC-E2E-04 | Skenario 4: Perpindahan Pelaksana | Memastikan notifikasi penugasan beralih ke staf baru | Koordinator ubah pelaksana Staf A &rarr; B | Update pelaksana tiket | Staf B menerima notif, Staf A dikeluarkan | Notifikasi tepat sasaran | **PASS** |
| TC-E2E-05 | Skenario 5: Alur Eskalasi Kendala | Menguji kendala staf dieskalasikan ke Kadiv | Tiket diubah ke `HOLD_ESKALASI` | Pemicuan event eskalasi | Kadiv menerima notifikasi eskalasi | Eskalasi terdata di Kadiv | **PASS** |
| TC-E2E-06 | Skenario 6: Isolasi Data Antardivisi | Menguji keamanan data Kadiv vs Direktur | 2 divisi berbeda di database | Akses tiket dan laporan via role Kadiv & Direktur | Kadiv terisolasi, Direktur melihat semua | Isolasi data terjamin | **PASS** |
| TC-E2E-07 | Skenario 7: Ketahanan Sistem (Resilience) | Menguji ketahanan aplikasi saat Telegram gagal | Simulasi Telegram down (504) | Eksekusi transaksi tiket dan auto-retry | Tiket tetap sukses, log FAILED, retry sukses | Sistem tangguh & pulih | **PASS** |
| TC-E2E-08 | Validasi Rumus Perhitungan SLA | Memastikan kalkulasi kepatuhan tepat tanpa pembagian nol | Tiket tepat waktu vs terlambat | Uji formula SLA | Persentase konsisten dengan data detail | Perhitungan matematis akurat | **PASS** |
| TC-E2E-09 | Validasi Hak Unduh Laporan | Memastikan hanya peran berhak yang dapat unduh | Request export PDF/Excel | Uji via berbagai role | Staf diblokir 403, Direktur/Kadiv berhasil | Kontrol unduhan aman | **PASS** |
| TC-E2E-10 | Integritas Audit Trail Sistem | Memastikan setiap mutasi meninggalkan jejak audit | Transaksi pembuatan & status tiket | Periksa entri di `AuditLog` | Seluruh aktivitas tercatat dengan timestamp | Audit trail konsisten | **PASS** |
