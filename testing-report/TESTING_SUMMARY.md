# LAPORAN RINGKASAN PENGUJIAN MENYELURUH (END-TO-END TESTING)
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda
**Modul 1 sampai Modul 6 (Berdasarkan Dokumen UAT Capstone Project 2026)**

---

## 1. Ringkasan Eksekutif Hasil Pengujian

Pengujian menyeluruh telah dilaksanakan terhadap seluruh komponen backend, frontend, integrasi database PostgreSQL, bot notifikasi Telegram, scheduler Cron Job, pelaporan kinerja SLA, kontrol hak akses berbasis peran (RBAC), log notifikasi, dan konfigurasi admin.

| Metrik Pengujian | Nilai Aktual | Keterangan |
|---|---|---|
| **Total Test Case Otomatis** | **128 Skenario** | Mencakup unit, integrasi, RBAC, SLA, dan E2E |
| **Jumlah Lulus (PASS)** | **128 (100%)** | Seluruh asersi pengujian terpenuhi |
| **Jumlah Gagal (FAIL)** | **0 (0%)** | Tidak ada kegagalan fungsi |
| **Jumlah Tertunda (BLOCKED)** | **0** | Lingkungan testing lokal siap dan berfungsi |
| **Jumlah Belum Ada (NOT IMPLEMENTED)** | **0** | Seluruh kebutuhan UAT 1.1 s/d 6.4 terimplementasi |
| **Persentase Keberhasilan** | **100%** | Siap untuk tahap User Acceptance Testing (UAT) |
| **Status Build Frontend (Vite/TS)** | **SUCCESS (0 Error)** | Bundle production berhasil dikompilasi |
| **Konektivitas Database PostgreSQL** | **CONNECTED** | Relasi antar-tabel dan integritas data valid |

---

## 2. Tabel Hasil Pengujian Per Modul

| Modul | Nama Fitur / Modul Utama | Total Test | PASS | FAIL | BLOCKED | NOT IMPLEMENTED | Kesimpulan |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Modul 1** | Penjadwalan Otomatis (Cron Job) | 15 | 15 | 0 | 0 | 0 | **Sangat Baik**: Deteksi mendekati deadline dan overdue berjalan akurat, tidak memproses tiket selesai/review, tahan restart. |
| **Modul 2** | Notifikasi Otomatis (Telegram) | 30 | 30 | 0 | 0 | 0 | **Sangat Baik**: Seluruh event tiket terpetakan, dedupeKey stabil, format pesan bersih tanpa kebocoran data medis/pasien. |
| **Modul 3** | Rekapitulasi Kinerja (Reporting SLA) | 19 | 19 | 0 | 0 | 0 | **Sangat Baik**: Perhitungan SLA berbasis waktu *submission* staf, filter divisi & tanggal akurat, ekspor PDF & Excel bekerja penuh. |
| **Modul 4** | Isolasi Data & Hak Akses (RBAC) | 18 | 18 | 0 | 0 | 0 | **Sangat Baik**: Proteksi backend ketat, Kadiv terisolasi pada divisinya, Segregation of Duties terpasang (pelaksana ≠ pemeriksa). |
| **Modul 5** | Log Notifikasi & Penanganan Gagal | 18 | 18 | 0 | 0 | 0 | **Sangat Baik**: Seluruh pesan tercatat (SENT/FAILED), auto-retry bekerja, retry massal dan per-item aman terhadap race condition. |
| **Modul 6** | Konfigurasi Admin & Integrasi | 18 | 18 | 0 | 0 | 0 | **Sangat Baik**: Pengaturan tersimpan dinamis, health check bot aktif, masking token aman, tercatat di AuditLog. |
| **E2E** | Integrasi Antarmodul (7 Skenario) | 10 | 10 | 0 | 0 | 0 | **Sangat Baik**: Alur normal, revisi, eskalasi, reassign, dan ketahanan terhadap kegagalan jaringan terverifikasi end-to-end. |
| **TOTAL** | **Semua Modul 1 – 6** | **128** | **128** | **0** | **0** | **0** | **LULUS SEMUA (100% READY)** |

---

## 3. Matriks Kesesuaian Dokumen UAT

Berdasarkan Dokumen UAT Resmi Capstone Project 2026 Mitra RSIA Qurrata A’yun Samarinda:

| ID UAT | Skenario Pengujian UAT | Implementasi Teknis | Status Uji |
|---|---|---|:---:|
| **UAT-1.1** | Sistem mengecek tiket belum selesai berkala tanpa manual Admin | `deadlineScheduler.js` + `deadlineCheckService.js` berjalan tiap interval | **PASS** |
| **UAT-1.2** | Sistem mengenali tiket tenggat hampir habis (mendekati SLA) | Logika `classifyDeadlineTicket` mendeteksi jendela &le; 24 jam (`DEADLINE_SOON`) | **PASS** |
| **UAT-1.3** | Sistem mengenali tiket sudah lewat tenggat dan belum selesai | Logika deteksi `OVERDUE` pada tiket aktif yang melewati deadline | **PASS** |
| **UAT-1.4** | Tiket selesai / diajukan verifikasi tidak dianggap bermasalah | Pengecualian otomatis untuk status `SELESAI`, `DITOLAK`, dan `MENUNGGU_VALIDASI` | **PASS** |
| **UAT-2.1** | Staf yang ditugaskan menerima pesan tugas baru di Telegram | Event `TASK_ASSIGNED` otomatis dikirim ke Chat ID pelaksana | **PASS** |
| **UAT-2.2** | Pesan peringatan terkirim saat tiket melewati tenggat | Event `OVERDUE` otomatis dikirim ke Staf pelaksana dan penanggung jawab | **PASS** |
| **UAT-2.3** | Pesan notifikasi jelas, memuat urgensi, judul, tenggat | Formatter pesan menyertakan Prioritas, Kode Tiket, Judul, Batas Waktu | **PASS** |
| **UAT-2.4** | Tiket urgensi "Darurat" (Tinggi/Urgent) tampil dengan penanda jelas | Header peringatan khusus dengan penanda visual emoji dan tingkat urgensi | **PASS** |
| **UAT-3.1** | Laporan menampilkan tugas selesai tepat waktu & terlambat per divisi | `slaController.js` mengelompokkan data berdasarkan SLA dan divisi | **PASS** |
| **UAT-3.2** | Laporan dapat diunduh dalam bentuk PDF | `slaExportController.js` membuat buffered PDFKit sesuai format resmi | **PASS** |
| **UAT-3.3** | Laporan dapat diunduh dalam bentuk Excel | `slaExportController.js` membuat file XLSX via ExcelJS dengan styling rapi | **PASS** |
| **UAT-3.4** | Jumlah tugas dan capaian persentase SLA tepat | Rumus: `(Tepat Waktu / Total Tiket Selesai) * 100%` dengan fallback 0% | **PASS** |
| **UAT-3.5** | Kepala Divisi hanya melihat laporan divisinya sendiri | Filter isolasi wajib di backend mengunci `divisiId` sesuai JWT Kadiv | **PASS** |
| **UAT-4.1** | Notifikasi dan laporan hanya berisi data tugas fasilitas (Bebas RME) | Verifikasi sanitasi: tidak ada field pasien, diagnosis, atau rekam medis | **PASS** |
| **UAT-4.2** | Menu laporan hanya bisa dibuka peran berhak (Direktur/Kadiv/Admin) | Middleware `checkRole(['DIREKTUR', 'KADIV', 'ADMIN', 'KOORDINATOR'])` | **PASS** |
| **UAT-4.3** | Modul terisolasi mandiri dan tidak terhubung ke database RME | Database schema murni untuk E-Ticketing operasional fasilitas RS | **PASS** |
| **UAT-5.1** | Setiap pesan sistem tercatat di Log Notifikasi | Tabel `NotificationLog` menyimpan status, penerima, message, dan timestamp | **PASS** |
| **UAT-5.2** | Sistem tetap berjalan saat Telegram gagal / tidak dapat diakses | Error handling membungkus API call; status dicatat `FAILED`, server tidak crash | **PASS** |
| **UAT-5.3** | Pesan tiket yang sama tidak dikirim terus-menerus (Anti-Spam) | Kunci `dedupeKey` berbasis `ticketId:type:occurrenceToken:recipientId` | **PASS** |
| **UAT-5.4** | Pengecekan otomatis aktif lagi setelah server restart | Startup handler memanggil `startDeadlineScheduler()` secara otomatis | **PASS** |
| **UAT-6.1** | Admin dapat mengubah jadwal pengecekan dan batas pengingat | Endpoint `PUT /api/config` dan halaman UI `PengaturanAdmin.tsx` | **PASS** |
| **UAT-6.2** | Perubahan akun Telegram staf langsung dipakai | Query selalu mengambil `telegramChatId` terkini dari database User | **PASS** |
| **UAT-6.3** | Notifikasi mengikuti perubahan penugasan tiket di sistem | Event `TASK_REASSIGNED` mengirim notifikasi hanya ke staf penerima baru | **PASS** |
| **UAT-6.4** | Tiket yang baru selesai langsung masuk ke laporan SLA | Query laporan membaca data real-time dari PostgreSQL tanpa delay sinkronisasi | **PASS** |

---

## 4. Rekomendasi Sebelum Pelaksanaan Demo / Sidang UAT
1. **Jalankan Background Services**: Pastikan backend dijalankan dengan perintah standar (`node index.js`) agar scheduler cron dan bot Telegram standby.
2. **Koneksi Bot Telegram**: Pastikan bot Telegram memiliki koneksi internet aktif saat demo pengiriman pesan sungguhan ke smartphone penguji.
3. **Akun Uji Penguji**: Gunakan akun penguji yang telah disiapkan di database lokal untuk demonstrasi masing-masing peran (Direktur, Kadiv, Koordinator, Staf, Admin).
