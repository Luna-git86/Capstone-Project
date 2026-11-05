# LAPORAN PENGUJIAN INTEGRASI ANTARMODUL (END-TO-END SCENARIOS)
## Aplikasi E-Ticketing RSIA Qurrata A’yun Samarinda
**Hasil Eksekusi 7 Skenario Bisnis End-to-End**

---

Pengujian integrasi antarmodul memverifikasi kesinambungan aliran data dari Modul 1 (Cron Job), Modul 2 (Telegram), Modul 3 (Laporan SLA), Modul 4 (RBAC & Isolasi), Modul 5 (Log Notifikasi), hingga Modul 6 (Konfigurasi Admin).

---

### Skenario 1 — Alur Normal Tiket Penuh
- **Rangkaian Alur Bisnis**:
  1. Direktur menetapkan target strategis rumah sakit.
  2. Kadiv Pelayanan Medis menerbitkan arahan divisi kepada Koordinator Poli.
  3. Koordinator memecah arahan menjadi tiket operasional dengan pelaksana Staf dan pemeriksa Koordinator.
  4. Staf menerima notifikasi `TASK_ASSIGNED` di Telegram.
  5. Staf mengerjakan tugas, mengisi progres, dan mengajukan penyelesaian (*submission*).
  6. Waktu submission dicatat sistem; Koordinator menerima notifikasi `TASK_SUBMITTED`.
  7. Koordinator memeriksa dan mengesahkan hasil kerja menjadi `SELESAI` (`TASK_VERIFIED`).
  8. Laporan SLA mencatat status `SESUAI_SLA` berbasis waktu submission staf.
  9. Seluruh aktivitas terekam di `NotificationLog` dan `AuditLog`.
- **Hasil Aktual Pengujian**:
  - Penugasan terencana tepat sasaran ke Staf (`recipientId: 4`).
  - Transisi status `MENUNGGU_VALIDASI` mencatat timestamp penyerahan tugas pada audit trail.
  - Verifikasi akhir menghasilkan status `SELESAI`.
  - Fungsi `getSlaReportData` mengonfirmasi `statusSLA: 'SESUAI_SLA'`.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-01` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 27ms).

---

### Skenario 2 — Alur Revisi Hasil Pekerjaan
- **Rangkaian Alur Bisnis**:
  1. Koordinator memeriksa tugas yang diajukan Staf (`MENUNGGU_VALIDASI`).
  2. Koordinator mendapati pekerjaan belum lengkap dan menekan tombol *"Minta Revisi"*.
  3. Status tiket kembali menjadi `DIPROSES` disertai catatan revisi.
  4. Staf menerima notifikasi Telegram `TASK_REVISION_REQUIRED` yang memuat instruksi perbaikan.
  5. Staf melakukan perbaikan dan mengajukan kembali tugas tersebut (*resubmission*).
  6. Koordinator memvalidasi hasil perbaikan menjadi `SELESAI`.
  7. Perhitungan kepatuhan SLA tetap merujuk pada waktu submission yang sah.
- **Hasil Aktual Pengujian**:
  - Event `TASK_REVISION_REQUIRED` terencana dengan target pelaksana.
  - Pesan notifikasi menyertakan catatan revisi koordinator secara jelas.
  - Resubmission staf tercatat di audit log dan SLA dihitung akurat.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-02` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 18ms).

---

### Skenario 3 — Penanganan Batas Waktu (Deadline & Overdue)
- **Rangkaian Alur Bisnis**:
  1. Tiket aktif dibuat dengan batas waktu penyelesaian.
  2. Simulasi waktu mendekati deadline (< 24 jam) diproses scheduler cron.
  3. Sistem menandai tiket sebagai `DEADLINE_SOON` dan mengirim pengingat satu kali.
  4. Simulasi waktu melewati batas deadline diproses scheduler cron.
  5. Sistem menandai tiket sebagai `OVERDUE` dan memicu peringatan keterlambatan.
  6. Tiket yang sudah diajukan untuk verifikasi (`MENUNGGU_VALIDASI`) atau `SELESAI` secara ketat **dikecualikan** dari status overdue.
- **Hasil Aktual Pengujian**:
  - `classifyDeadlineTicket` mengembalikan `action: 'DEADLINE_SOON'` saat sisa waktu 5 jam.
  - `classifyDeadlineTicket` mengembalikan `action: 'OVERDUE'` saat waktu terlewat 2 jam.
  - Tiket berstatus `MENUNGGU_VALIDASI` dan `SELESAI` dilewati dengan reason `IN_REVIEW` dan `INACTIVE`.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-03` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 4ms).

---

### Skenario 4 — Pengalihan Pelaksana (Reassignment)
- **Rangkaian Alur Bisnis**:
  1. Koordinator memindahkan tanggung jawab tiket dari Staf A ke Staf B.
  2. Staf A tidak lagi tercatat sebagai penerima penugasan aktif.
  3. Staf B menerima notifikasi penugasan baru `TASK_REASSIGNED`.
  4. Tidak ada notifikasi yang salah sasaran atau terkirim ke kedua belah pihak secara membingungkan.
- **Hasil Aktual Pengujian**:
  - Event `TASK_REASSIGNED` hanya diterbitkan dengan target `recipientId` Staf B.
  - Log audit mencatat pengalihan pelaksana tiket secara transparan.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-04` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 3ms).

---

### Skenario 5 — Alur Eskalasi Kendala Operasional
- **Rangkaian Alur Bisnis**:
  1. Pelaksana / Koordinator mengalami hambatan besar dalam pekerjaan fasilitas rumah sakit.
  2. Status tiket diubah menjadi `HOLD_ESKALASI` disertai alasan kendala.
  3. Sistem menerbitkan event notifikasi `TASK_ESCALATED` langsung kepada Kepala Divisi terkait.
  4. Kadiv memantau tiket yang tertahan di halaman Daftar Eskalasi untuk memberikan arahan solusi.
- **Hasil Aktual Pengujian**:
  - Event `TASK_ESCALATED` terencana dengan target `penanggungJawabId` (Kadiv).
  - Pesan peringatan eskalasi memuat status darurat tanpa mengekspos rahasia medis.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-05` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 3ms).

---

### Skenario 6 — Isolasi Data Antardivisi (Data Isolation)
- **Rangkaian Alur Bisnis**:
  1. Terdapat dua divisi terdaftar di database: Pelayanan Medis dan Sarana Prasarana (Umum).
  2. Kadiv Pelayanan Medis login dan melihat daftar tugas dan laporan SLA.
  3. Kadiv mencoba mengakses tiket atau laporan Divisi Umum via API / query parameter manipulasi.
  4. Sistem backend menolak akses dan memaksakan isolasi data hanya pada Divisi Medis.
  5. Direktur login dan dapat melihat seluruh data kedua divisi tanpa pemblokiran.
- **Hasil Aktual Pengujian**:
  - Filter `getTickets` untuk Kadiv secara mutlak memaksakan `divisiId: 1`.
  - Akses detail tiket divisi lain via `getTicketById` langsung ditolak dengan **HTTP 403 Forbidden**.
  - Query Direktur tidak memiliki klausul pembatas divisi.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-06` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 5ms).

---

### Skenario 7 — Ketahanan Sistem terhadap Kegagalan Jaringan (Resilience)
- **Rangkaian Alur Bisnis**:
  1. Simulasi kegagalan koneksi Telegram (misal: HTTP 504 Gateway Timeout).
  2. Transaksi tiket pada aplikasi web tetap berjalan normal tanpa mengalami error 500 (*fail-safe*).
  3. Kegagalan pengiriman dicatat rapi pada tabel `NotificationLog` dengan status `FAILED`.
  4. Saat koneksi pulih, cron job / fungsi retry otomatis mencoba mengirim ulang pesan yang gagal.
  5. Setelah terkirim, status log diperbarui menjadi `SENT`.
- **Hasil Aktual Pengujian**:
  - Fungsi `notifyTicketEvent` mengembalikan `sent: false` dan mencatat status `FAILED`.
  - Fungsi `retryFailedNotifications` berhasil memproses ulang log gagal dan mengubah status menjadi `SENT` setelah Telegram normal.
- **Status Skenario**: **PASS**
- **Bukti Uji**: `TC-E2E-07` pada suite `integrationE2E.test.js` berjalan sukses (durasi: 7ms).
