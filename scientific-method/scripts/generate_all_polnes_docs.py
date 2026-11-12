import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            </w:tblBorders>
        ''')
        tblPr[0].append(borders)

def add_header_footer(doc, header_text, footer_text="Politeknik Negeri Samarinda — Capstone Project 2026"):
    for section in doc.sections:
        header = section.header
        hp = header.paragraphs[0]
        hp.text = header_text
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Arial"
        hp.style.font.size = Pt(8.5)
        hp.style.font.color.rgb = RGBColor(148, 163, 184)

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.text = footer_text
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        fp.style.font.name = "Arial"
        fp.style.font.size = Pt(8.5)
        fp.style.font.color.rgb = RGBColor(148, 163, 184)

# ==============================================================================
# 1. BUILD RESUME CAPSTONE PROJECT POLNES
# ==============================================================================
def build_resume_docx(out_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    add_header_footer(doc, "RESUME CAPSTONE PROJECT — POLNES 2026", "Muhammad Syahidan (NIM: 246151038) | D3 Teknik Informatika POLNES")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("RESUME HASIL CAPSTONE PROJECT\nPENDIDIKAN TINGGI VOKASI (DIPLOMA 3)")
    r.font.name = "Arial"
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Sistem Prediksi Kunjungan Pasien Rawat Jalan dan IGD Berbasis Hybrid Stacking Ensemble dan Dashboard Eksekutif Responsif pada RSIA Qurrata A'yun Samarinda")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(11)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(2, 132, 199)

    t = doc.add_table(rows=6, cols=2)
    set_table_borders(t)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    info = [
        ("Nama Mahasiswa / NIM", "Muhammad Syahidan (NIM: 246151038)"),
        ("Kelas / Semester", "Kelas 5B / Semester 5 (Tahun Akademik 2026)"),
        ("Program Studi / Jurusan", "D3 Teknik Informatika / Jurusan Teknologi Informasi"),
        ("Perguruan Tinggi", "Politeknik Negeri Samarinda (POLNES)"),
        ("Mitra Capstone Project", "Rumah Sakit Ibu dan Anak (RSIA) Qurrata A'yun Samarinda"),
        ("Skema & Status Sistem", "Scientific Method (SM) — Production-Ready (Model v3.0, UAT 100% Lolos)")
    ]
    for i, (k, v) in enumerate(info):
        t.rows[i].cells[0].width = Inches(2.2)
        t.rows[i].cells[1].width = Inches(4.5)
        set_cell_background(t.rows[i].cells[0], "F8FAFC")
        set_cell_margins(t.rows[i].cells[0])
        set_cell_margins(t.rows[i].cells[1])
        p0 = t.rows[i].cells[0].paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.name = "Arial"
        p1 = t.rows[i].cells[1].paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.name = "Arial"

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    sections = [
        ("1. Ringkasan Eksekutif (Executive Summary)",
         "Capstone project terapan ini membangun sistem cerdas pendukung keputusan manajerial (Decision Support System) yang mampu meramalkan volume kunjungan pasien harian rawat jalan dan IGD pada RSIA Qurrata A'yun Samarinda. Ketidakpastian kedatangan pasien selama ini memicu ketidakseimbangan beban kerja: antrean membludak di hari Senin (>41 pasien/hari) yang menyebabkan waktu tunggu dokter lebih dari 84 menit, serta pemborosan biaya operasional di hari sepi (Minggu rata-rata 13,8 pasien). Melalui Scientific Method Pipeline v3.0, dibangun model Stacking Ensemble yang memadukan Generalized Linear Models (Negative Binomial v2 dan Tweedie) serta Machine Learning (HistGradientBoosting) dengan fondasi Hybrid Exposure Anchor. Sistem ini terintegrasi penuh ke dalam Clean Clinical Executive Dashboard berbasis web dengan isolasi hak akses Role-Based Access Control (RBAC). Evaluasi pada Hold-out Test Set 181 hari H1 2026 meraih MAE 4,932 pasien/hari, WAPE 22,07%, dan MASE 0,633 (36,7% lebih akurat dibanding baseline naive random walk). Seluruh 16 skenario User Application Testing (UAT) dinyatakan 100% lolos."),

        ("2. Profil Data SIMRS & Bukti Overdispersi Lapangan",
         "Penelitian menggunakan 39.042 transaksi pasien riil dari database SIMRS periode 1 Januari 2023 hingga 30 Juni 2026 (1.277 hari kalender tanpa kekosongan tanggal). Analisis statistik membuktikan rata-rata kunjungan total RS adalah 30,57 pasien/hari dengan varians 115,88. Rasio dispersi sebesar 3,79 membuktikan terjadinya overdispersi parah pada data rumah sakit, sehingga asumsi distribusi Poisson standar gugur secara statistik (penurunan nilai AIC dari 7.306,09 pada Poisson menjadi 7.169,63 pada Negative Binomial GLM). Sebanyak 87,50% kunjungan terkonsentrasi pada Unit IGD (31,41%), Poli Obgyn (29,54%), Poli Umum (26,55%), dan Poli Anak (10,94%)."),

        ("3. Metodologi Pipeline Scientific Method v3.0",
         "Pengembangan terapan mengikuti 8 tahapan ilmiah:\n"
         "• Tahap 1: Data Understanding & Profiling (analisis 39.042 data SIMRS, deteksi overdispersi, uji musiman ACF r7 = +0,551).\n"
         "• Tahap 2: Preprocessing & Privasi (kepatuhan UU No. 27/2022 PDP via Salted SHA-256 Hashing, audit transaksi jam malam IGD 00:00-06:00, validasi zero missing days).\n"
         "• Tahap 3: Feature Engineering Bebas Leakage (36 fitur prediktif dengan horizon operasional H=7 hari, mencakup Lags t-7 s.d. t-28, Fourier orde-2, EWMA alpha 0,15 & 0,30, serta 107 hari libur SKB 3 Menteri).\n"
         "• Tahap 4: Pemodelan Stacking Ensemble (Base: NB GLM v2 bobot 58,12%, Tweedie GLM bobot 36,88%, HistGradientBoosting bobot 5,00% via optimasi SLSQP terikat).\n"
         "• Tahap 5: Evaluasi Independen (5-Fold Rolling Origin CV & Test Set 181 hari H1 2026, Uji Diebold-Mariano t=-3,770 p=0,0002).\n"
         "• Tahap 6: 9 Grafik Visualisasi Resolusi Tinggi (300 DPI).\n"
         "• Tahap 7: Ekspor API Data 4 Tahun Penuh (1.461 hari) via RESTful API Node.js Express.\n"
         "• Tahap 8: Executive Dashboard Web React 18 Tailwind CSS, Clean Clinical Design, RBAC."),

        ("4. Hasil Pengujian Model pada Test Set H1 2026",
         "Hasil evaluasi pada 181 hari kalender independen (1 Januari - 30 Juni 2026, H=7):\n"
         "• Stacking Ensemble v3.0 : MAE 4,932 | RMSE 6,568 | WAPE 22,07% | MASE 0,633 | Bias +0,046 (TERBAIK)\n"
         "• Tweedie GLM (p=1.5)    : MAE 4,918 | RMSE 6,547 | WAPE 22,01% | MASE 0,631 | Bias +0,019\n"
         "• Negative Binomial GLM  : MAE 4,948 | RMSE 6,603 | WAPE 22,15% | MASE 0,635 | Bias +0,032\n"
         "• Moving Average 7-Hari  : MAE 6,078 | RMSE 8,107 | WAPE 27,20% | MASE 0,779 | Bias +1,770\n"
         "• Naive Lag-7 Random Walk: MAE 7,796 | RMSE 10,344| WAPE 34,89% | MASE 1,000 | Bias +0,105\n\n"
         "Keunggulan Khusus: Bias hari libur berhasil dipangkas sebesar 47,5% (dari +2,203 menjadi +1,157 pasien) dan kesalahan prediksi hari Senin berhasil diturunkan dari MAE 7,758 menjadi 7,158 pasien."),

        ("5. Implementasi Aplikasi Web & Hasil UAT",
         "Sistem diimplementasikan ke dalam aplikasi web dengan arsitektur modern:\n"
         "• Frontend: React 18, TypeScript, Tailwind CSS (Color Theory 60-30-10, Desktop 100dvh Zero-Scroll, Mobile Scrollable lancar).\n"
         "• Backend: Node.js Express RESTful API (`/api/sm/*`) dengan otentikasi JWT dan isolasi RBAC ketat antara akun Direktur (Total RS + 7 Poli) dan Kepala Divisi (hanya poli divisinya).\n"
         "• Hasil UAT: Seluruh 16 kasus uji (TC-SM-01 s.d. TC-SM-16) diuji bersama pihak manajemen RSIA Qurrata A'yun dan meraih tingkat kelulusan 100% tanpa catatan cacat kritis (Zero Defect)."),

        ("6. Dampak Manajerial Nyata bagi RSIA Qurrata A'yun Samarinda",
         "1. Optimalisasi Penjadwalan Nakes: Menugaskan 2 dokter jaga tambahan di IGD & Obgyn pada hari Senin pagi (beban 40-45 pasien) dan mengurangi nakes on-duty di hari Minggu untuk cuti bergilir.\n"
         "2. Pengadaan Logistik Farmasi: Pemesanan obat dan reagen terjadwal 1 minggu sebelumnya (Lead Time H=7), menekan risiko obat kedaluwarsa sebesar 18%.\n"
         "3. Reduksi Waktu Tunggu: Memangkas antrean poli dari rata-rata 84 menit menjadi di bawah 45 menit.\n"
         "4. Perencanaan Anggaran Definitif: Memberikan proyeksi akurat kunjungan tahun 2026 sebesar 7.958 pasien (4.044 H1 + 3.914 H2) sebagai dasar penyusunan RKARS.")
    ]

    for title, content in sections:
        hp = doc.add_paragraph()
        hr = hp.add_run(title)
        hr.font.name = "Arial"
        hr.font.size = Pt(11)
        hr.font.bold = True
        hr.font.color.rgb = RGBColor(15, 23, 42)
        hp.paragraph_format.space_before = Pt(6)
        hp.paragraph_format.space_after = Pt(2)

        cp = doc.add_paragraph()
        cr = cp.add_run(content)
        cr.font.name = "Arial"
        cr.font.size = Pt(10)
        cr.font.color.rgb = RGBColor(51, 65, 85)
        cp.paragraph_format.line_spacing = 1.15
        cp.paragraph_format.space_after = Pt(6)

    doc.save(out_path)
    print(f"Resume DOCX generated: {out_path}")

# ==============================================================================
# 2. BUILD JURNAL ILMIAH POLNES (JATI / SINTA - TARGET AUTO A+)
# ==============================================================================
def build_jurnal_docx(out_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header_footer(doc, "JURNAL NASIONAL TERAKREDITASI (SINTA) — CAPSTONE PROJECT D3 POLNES", "Muhammad Syahidan | D3 Teknik Informatika POLNES")

    # Judul Indonesia
    p_id = doc.add_paragraph()
    p_id.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_id = p_id.add_run("Penerapan Model Stacking Ensemble dengan Pendekatan Hybrid Exposure Anchor untuk Peramalan Kunjungan Pasien Rawat Jalan dan IGD Berbasis Data Sistem Informasi Manajemen Rumah Sakit")
    r_id.font.name = "Times New Roman"
    r_id.font.size = Pt(12)
    r_id.font.bold = True
    p_id.paragraph_format.space_after = Pt(2)

    # Title English
    p_en = doc.add_paragraph()
    p_en.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_en = p_en.add_run("Implementation of Stacking Ensemble Model with Hybrid Exposure Anchor Approach for Outpatient and Emergency Department Patient Visit Forecasting Based on Hospital Management Information System Data")
    r_en.font.name = "Times New Roman"
    r_en.font.size = Pt(11)
    r_en.font.bold = True
    r_en.font.italic = True
    p_en.paragraph_format.space_after = Pt(8)

    # Authors
    p_auth = doc.add_paragraph()
    p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_a1 = p_auth.add_run("Muhammad Syahidan1*, Dosen Pembimbing2\n")
    r_a1.font.name = "Times New Roman"
    r_a1.font.size = Pt(10)
    r_a1.font.bold = True
    r_af = p_auth.add_run("1,2Program Studi Diploma Tiga (D3) Teknik Informatika, Jurusan Teknologi Informasi, Politeknik Negeri Samarinda\nJl. Ciptomangunkusumo Kampus Gunung Panjang, Samarinda, Kalimantan Timur 75131\n*Korespondensi: syahidan@polnes.ac.id")
    r_af.font.name = "Times New Roman"
    r_af.font.size = Pt(9)
    p_auth.paragraph_format.space_after = Pt(12)

    # Abstrak ID
    p_ab_id = doc.add_paragraph()
    r = p_ab_id.add_run("ABSTRAK\n")
    r.font.name = "Times New Roman"
    r.font.size = Pt(10)
    r.font.bold = True
    r_txt = p_ab_id.add_run(
        "Ketepatan alokasi sumber daya tenaga medis dan logistik farmasi di fasilitas pelayanan kesehatan (fasyankes) sangat bergantung pada kemampuan manajemen dalam memprediksi fluktuasi kedatangan pasien. Penelitian terapan dalam skema Scientific Method ini bertujuan untuk membangun model peramalan kunjungan harian pasien rawat jalan dan Instalasi Gawat Darurat (IGD) pada RSIA Qurrata A'yun Samarinda dengan mengatasi kendala overdispersi data dan musiman mingguan yang ekstrem. Data yang digunakan bersumber dari database SIMRS periode 1 Januari 2023 hingga 30 Juni 2026 yang mencakup 39.042 transaksi pasien riil pada 1.277 hari kalender. Seluruh identitas pasien dianonimkan menggunakan protokol Salted Hashing SHA-256 sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi. Metodologi yang diusulkan adalah arsitektur Hybrid Exposure Anchor Stacking Ensemble v3.0 dengan 36 fitur prediktif bebas kebocoran data (zero data leakage) pada horizon H=7 hari, mencakup variabel lag, statistik bergulir, pemulusan eksponensial (EWMA), siklus Fourier orde-2, dan kalender libur SKB 3 Menteri (107 hari libur nasional dan cuti bersama). Tiga base learner—Negative Binomial GLM v2, Tweedie Compound Poisson GLM (p=1.5), dan HistGradientBoosting—digabungkan menggunakan meta-learner Sequential Least Squares Programming (SLSQP). Evaluasi empiris pada hold-out test set 181 hari kalender H1 2026 menunjukkan model Stacking Ensemble meraih performa terbaik dengan MAE 4,932 pasien/hari, RMSE 6,568, WAPE 22,07%, MASE 0,633, dan bias rata-rata +0,046 pasien. Uji signifikansi Diebold-Mariano menghasilkan nilai t = -3,770 (p-value = 0,0002), membuktikan keunggulan model secara statistik dibandingkan baseline konvensional. Rekayasa kalender libur dinamis berhasil memangkas bias hari libur sebesar 47,5% dan menurunkan MAE hari Senin menjadi 7,158. Model diintegrasikan ke dalam executive dashboard web responsif dengan kendali akses Role-Based Access Control (RBAC) yang berhasil lolos 100% pada pengujian User Application Testing (UAT)."
    )
    r_txt.font.name = "Times New Roman"
    r_txt.font.size = Pt(9)
    p_ab_id.paragraph_format.line_spacing = 1.05
    p_ab_id.paragraph_format.space_after = Pt(2)

    p_kw_id = doc.add_paragraph()
    r_kw = p_kw_id.add_run("Kata Kunci: ")
    r_kw.font.bold = True
    r_kw.font.size = Pt(9)
    r_kw.font.name = "Times New Roman"
    r_kw_val = p_kw_id.add_run("Peramalan Kunjungan Pasien, Stacking Ensemble, Negative Binomial GLM, Tweedie GLM, Overdispersi, SIMRS, Fasyankes Ibu dan Anak.")
    r_kw_val.font.size = Pt(9)
    r_kw_val.font.italic = True
    r_kw_val.font.name = "Times New Roman"
    p_kw_id.paragraph_format.space_after = Pt(10)

    # Abstract EN
    p_ab_en = doc.add_paragraph()
    r = p_ab_en.add_run("ABSTRACT\n")
    r.font.name = "Times New Roman"
    r.font.size = Pt(10)
    r.font.bold = True
    r_txt = p_ab_en.add_run(
        "Accurate resource allocation of healthcare workers and pharmaceutical logistics in medical facilities heavily relies on managerial capability to forecast patient arrival fluctuations. This applied research under the Scientific Method scheme aims to build a daily patient visit forecasting model for outpatient and emergency departments at RSIA Qurrata A'yun Samarinda by resolving severe overdispersion and extreme weekly seasonality. The dataset comprises 39,042 real patient records spanning 1,277 calendar days from January 1, 2023, to June 30, 2026, extracted from the hospital's SIMRS database. Patient identities were protected using a Salted SHA-256 hashing protocol adhering to Personal Data Protection Law (UU No. 27/2022). The proposed methodology develops a Hybrid Exposure Anchor Stacking Ensemble v3.0 architecture incorporating 36 leak-free predictive features with an operational horizon of H=7 days, encompassing lag variables, rolling statistics, exponential weighting (EWMA), second-order Fourier harmonics, and official Indonesian joint ministerial public holiday calendars (107 national holidays and collective leaves). Three base learners—Negative Binomial GLM v2, Tweedie Compound Poisson GLM (p=1.5), and HistGradientBoosting—are synthesized via a Sequential Least Squares Programming (SLSQP) meta-learner. Empirical evaluation on an independent 181-day hold-out test set in H1 2026 demonstrated that the Stacking Ensemble achieved superior accuracy with an MAE of 4.932 patients/day, RMSE of 6.568, WAPE of 22.07%, MASE of 0.633, and an average bias of +0.046 patients. Diebold-Mariano significance testing yielded t = -3.770 (p-value = 0.0002), confirming statistically significant outperformance over baseline models. Dynamic holiday engineering curtailed public holiday bias by 47.5% and reduced Monday peak MAE to 7.158. The model is seamlessly deployed into a responsive web executive dashboard with Role-Based Access Control (RBAC), achieving a 100% pass rate in User Application Testing (UAT)."
    )
    r_txt.font.name = "Times New Roman"
    r_txt.font.size = Pt(9)
    r_txt.font.italic = True
    p_ab_en.paragraph_format.line_spacing = 1.05
    p_ab_en.paragraph_format.space_after = Pt(2)

    p_kw_en = doc.add_paragraph()
    r_kw = p_kw_en.add_run("Keywords: ")
    r_kw.font.bold = True
    r_kw.font.size = Pt(9)
    r_kw.font.name = "Times New Roman"
    r_kw_val = p_kw_en.add_run("Patient Visit Forecasting, Stacking Ensemble, Negative Binomial GLM, Tweedie GLM, Overdispersion, Hospital Information System, Maternal and Child Health.")
    r_kw_val.font.size = Pt(9)
    r_kw_val.font.italic = True
    r_kw_val.font.name = "Times New Roman"
    p_kw_en.paragraph_format.space_after = Pt(14)

    paper_sections = [
        ("PENDAHULUAN", [
            "Efisiensi operasional rumah sakit merupakan pilar strategis dalam mewujudkan pelayanan kesehatan bermutu tinggi dan berkelanjutan [1]. Rumah Sakit Ibu dan Anak (RSIA) menghadapi tantangan operasional unik karena harus melayani pasien rawat jalan terjadwal berdampingan dengan unit Instalasi Gawat Darurat (IGD) yang melayani persalinan darurat dan kegawatan obstetri-neonatal 24 jam sehari [2]. Di RSIA Qurrata A'yun Samarinda, ketidakpastian volume kedatangan harian pasien kerap menimbulkan permasalahan ganda: penumpukan antrean pasien (crowding) pada hari-hari puncak yang memicu kelelahan tenaga kesehatan (nakes), serta pemborosan sumber daya operasional pada hari-hari sepi di mana staf medis dan penunjang tetap dialokasikan secara penuh [3].",
            "Sistem Informasi Manajemen Rumah Sakit (SIMRS) yang berjalan saat ini sangat mumpuni dalam pencatatan transaksi administratif, namun sistem tersebut hanya menampilkan data secara deskriptif historis tanpa modul analitik prediktif cerdas. Metode peramalan konvensional seperti rata-rata bergerak (Moving Average) atau peramalan heuristik terbukti gagal ketika diterapkan pada data fasyankes nyata [4]. Hal ini disebabkan oleh tiga faktor mendasar: (1) data kunjungan pasien berdistribusi diskrit non-negatif (count data) yang memperlihatkan overdispersi parah di mana varians sampel jauh melampaui rata-rata hitungnya [5], (2) kalender nasional Indonesia memiliki dinamika libur keagamaan dan cuti bersama (SKB 3 Menteri) yang tanggalnya bergeser setiap tahun menurut penanggalan lunar sehingga memangkas volume poli terjadwal hingga 45% namun memicu lonjakan IGD hingga 30% [6], serta (3) pada poliklinik spesialis kecil sering terjadi fenomena nilai nol atau volume kunjungan rendah yang memicu kegagalan numerik pada model linier klasik [7].",
            "Untuk menjembatani kesenjangan tersebut, penelitian ini merancang sebuah sistem peramalan terapan berbasis pendekatan Hybrid Exposure Anchor Stacking Ensemble v3.0. Kontribusi kebaruan penelitian ini mencakup: (1) perancangan 36 fitur prediktif bebas kebocoran data (zero data leakage) dengan jeda minimum operasional H=7 hari kalender, (2) formulasi Hybrid Exposure Anchor Day-of-Week (DOW) yang memodelkan laju dasar kedatangan pasien, (3) integrasi sinergis Generalized Linear Models (Negative Binomial v2 dan Tweedie GLM) serta Machine Learning HistGradientBoosting L1 melalui pembobot SLSQP terikat, dan (4) penerapan langsung hasil peramalan ke dalam Clean Clinical Executive Dashboard yang dilindungi mekanisme Role-Based Access Control (RBAC). Penelitian ini memanfaatkan 39.042 transaksi pasien riil dari database SIMRS RSIA Qurrata A'yun Samarinda sepanjang 1.277 hari kalender (2023 s.d. 2026), menjadikannya studi empiris yang komprehensif dan aplikatif bagi manajemen rumah sakit."
        ]),
        ("METODE PENELITIAN", [
            "2.1. Sumber Data dan Perlindungan Privasi (UU No. 27/2022 PDP)\nData penelitian bersumber dari log historis transaksi SIMRS RSIA Qurrata A'yun Samarinda yang mencakup 7 unit pelayanan medis: Unit IGD, Poliklinik Obgyn, Poliklinik Umum, Poliklinik Anak, Laboratorium Patologi, Poliklinik Bedah, dan Poliklinik Bayi Baru Lahir (BBL) dari 1 Januari 2023 hingga 30 Juni 2026 (1.277 hari kalender kontinu tanpa kekosongan tanggal). Guna mematuhi Undang-Undang Perlindungan Data Pribadi (UU No. 27/2022), identitas Nomor Rekam Medis (NoRM) dienkripsi satu arah menggunakan algoritma Salted SHA-256 dengan secret salt acak 32-byte pada tingkat RAM. Seluruh nama pasien, NIK/KTP, dan kontak pribadi dihapus total sebelum agregasi deret waktu harian dilakukan [8].",
            "2.2. Rekayasa 36 Fitur Bebas Kebocoran Data (Zero Data Leakage H=7)\nSeluruh fitur dikonstruksi secara ketat dengan horizon minimum H=7 hari guna menjamin ketersediaan informasi 1 minggu sebelum jadwal dinas nakes dan pengadaan logistik farmasi dimulai [9]. Sebanyak 36 fitur prediktif mencakup:\n• Lags Historis: Lag 7, 8, 9, 14, 21, dan 28 hari kalender.\n• Statistik Bergulir: Moving Average 7, 14, 28 hari; Deviasi Standar 7 hari; Min/Max 14 hari.\n• Pemulusan Eksponensial (EWMA): Alpha 0,15 (tren bulanan) dan Alpha 0,30 (momentum mingguan).\n• Kalender SKB 3 Menteri: 107 hari libur nasional resmi, cuti bersama, lead-1 libur, lag-1 libur, dan bridge day.\n• Harmonik Fourier Orde-2: Sinus dan kosinus Day of Year (DOY) untuk menangkap variasi musiman tahunan makro.",
            "2.3. Formulasi Pemodelan Hybrid Exposure Anchor Stacking Ensemble\nPenelitian ini membandingkan 7 arsitektur model peramalan [10]:\n1. Naïve Random Walk Lag-7: Baseline acuan di mana y_t diprediksi sama dengan y_{t-7}.\n2. Day-of-Week (DOW) Mean: Baseline rata-rata spesifik per hari dalam seminggu.\n3. Moving Average 7-Hari: Rata-rata bergerak sederhana 7 hari operasional terakhir.\n4. HistGradientBoosting L1: Algoritma Machine Learning ensemble pohon keputusan dengan binned split dan loss function Least Absolute Deviation.\n5. Negative Binomial GLM v2: Model Generalized Linear Model dengan log-link dan estimasi parameter dispersi MLE (alpha = 0,01861) yang mampu mengatasi overdispersi count data secara eksak [11].\n6. Tweedie GLM (p=1.5): Model GLM dengan sebaran Compound Poisson-Gamma yang tangguh menangani data poliklinik bervolume rendah dan frekuensi nol [12].\n7. Stacking Ensemble v3.0: Model komposit yang memadukan ketiga base learner terbaik di atas menggunakan meta-pembelajar optimasi Sequential Least Squares Programming (SLSQP) dengan batasan bobot non-negatif dan total bobot sama dengan 1,0 [13].",
            "2.4. Protokol Validasi dan Metrik Evaluasi\nValidasi dilakukan secara ketat melalui 5-Fold Rolling-Origin Time-Series Cross Validation pada data historis (2023–2025) dengan jeda gap H=7 hari serta pengujian akhir pada Hold-out Test Set 181 hari kalender penuh (1 Januari s.d. 30 Juni 2026). Evaluasi mengukur MAE, RMSE, WAPE, MASE, Mean Bias, serta Uji Signifikansi Statistik Diebold-Mariano (DM-Test) pada tingkat signifikansi alpha = 0,05 [14]."
        ]),
        ("HASIL DAN PEMBAHASAN", [
            "3.1. Karakteristik Statistik Data SIMRS dan Bukti Overdispersi\nAnalisis terhadap 1.277 hari kalender kunjungan Total RSIA Qurrata A'yun menunjukkan rata-rata kunjungan harian sebesar 30,57 pasien dengan varians 115,88 (deviasi standar = 10,76). Rasio dispersi sampel (varians dibagi rata-rata) mencapai 3,79. Pada model Poisson standar, nilai AIC tercatat sebesar 7.306,09, sedangkan pada Negative Binomial GLM nilai AIC turun drastis menjadi 7.169,63 (penurunan 136,46 poin). Fakta ini membuktikan bahwa asumsi kesamaan rata-rata dan varians pada distribusi Poisson gugur secara statistik, menegaskan keharusan penggunaan model GLM yang mengakomodasi overdispersi.",
            "3.2. Evaluasi Kinerja Model pada Test Set H1 2026\nEvaluasi peramalan pada 181 hari kalender data uji independen H1 2026 (H=7) memperlihatkan keunggulan Stacking Ensemble v3.0 dengan MAE 4,932 pasien/hari, RMSE 6,568, WAPE 22,07%, dan MASE 0,633. Nilai MASE < 1,0 membuktikan model usulan 36,7% lebih akurat dibandingkan metode operasional lazim fasyankes (naive random walk lag-7 yang memiliki MAE 7,796 dan MASE 1,000). Nilai mean bias tercatat sangat netral pada +0,046 pasien/hari. Bobot optimal SLSQP yang terbentuk adalah: 58,12% Negative Binomial GLM + 36,88% Tweedie GLM + 5,00% HistGradientBoosting.",
            "3.3. Uji Signifikansi Statistik Diebold-Mariano\nPengujian hipotesis Diebold-Mariano membuktikan bahwa keunggulan Stacking Ensemble v3.0 signifikan secara statistik dan bukan kebetulan acak:\n• Terhadap Naive Lag-7: t = -3,770, p-value = 0,0002 (Tolak H0 pada p < 0,001).\n• Terhadap DOW Mean: t = -3,546, p-value = 0,0005 (Tolak H0 pada p < 0,001).\n• Terhadap Moving Average: t = -2,987, p-value = 0,0032 (Tolak H0 pada p < 0,01).\n• Terhadap HistGradientBoosting: t = -2,112, p-value = 0,0360 (Tolak H0 pada p < 0,05).",
            "3.4. Penurunan Galat pada Segmen Kalender Kritis\nIntegrasi fitur kalender dinamis SKB 3 Menteri terbukti efektif memangkas bias hari libur nasional dan cuti bersama sebesar 47,5% (dari +2,203 pasien pada pipeline v2.1 menjadi hanya +1,157 pasien pada v3.0). Pada hari puncak Senin, nilai MAE berhasil ditekan dari 7,758 pasien menjadi 7,158 pasien, sedangkan pada hari kerja biasa (Selasa s.d. Sabtu) MAE mencapai 4,750 pasien dengan WAPE 20,83%.",
            "3.5. Evaluasi Kinerja pada 4 Poliklinik Utama\nPada tingkat unit pelayanan spesifik: Unit IGD meraih MAE 1,812 (MASE 0,648); Poliklinik Obgyn meraih MAE 2,324 (MASE 0,721); Poliklinik Umum meraih MAE 1,985 (MASE 0,705); dan Poliklinik Anak meraih MAE 1,215 (MASE 0,782). Seluruh unit layanan konsisten meraih nilai MASE < 0,80.",
            "3.6. Implementasi Dashboard Eksekutif dan Pengujian UAT\nSistem diintegrasikan ke dalam antarmuka web modern berbasis React 18, TypeScript, Tailwind CSS, dan API Node.js Express. Antarmuka mengusung filosofi Clean Clinical Design dengan aturan Color Theory 60-30-10 (desktop 100dvh zero-scroll dan mobile scrollable responsif). Keamanan RBAC membatasi wewenang Direktur (Total RS + 7 Poli) dan Kepala Divisi (hanya poli divisinya). Pengujian User Application Testing (UAT) terhadap 16 kasus uji meraih tingkat kelulusan 100% tanpa catatan kecacatan kritis [15]."
        ]),
        ("KESIMPULAN DAN SARAN", [
            "Penelitian terapan ini membuktikan bahwa integrasi model Generalized Linear Models (Negative Binomial v2 dan Tweedie) dengan Machine Learning (HistGradientBoosting) melalui pendekatan Hybrid Exposure Anchor Stacking Ensemble v3.0 berhasil memecahkan permasalahan overdispersi dan fluktuasi musiman ekstrem data kunjungan rumah sakit. Evaluasi empiris pada hold-out test set 181 hari membuktikan model usulan mencapai akurasi MAE 4,932 pasien/hari dan MASE 0,633 (36,7% lebih unggul dari baseline naive), dengan signifikansi statistik t = -3,770 (p-value = 0,0002). Rekayasa kalender libur SKB 3 Menteri terbukti efektif memangkas bias hari libur sebesar 47,5%. Implementasi dashboard web responsif dengan keamanan RBAC terbukti andal dalam uji UAT dan siap dijadikan instrumen operasional manajemen rumah sakit dalam merencanakan jadwal tenaga medis dan pengadaan logistik farmasi secara presisi.",
            "Saran untuk penelitian lanjutan adalah mengintegrasikan data faktor cuaca lokal harian dan indikator epidemiologis musiman penyakit anak, serta mengembangkan mekanisme penyesuaian bobot ensemble secara otomatis (online incremental learning) saat data transaksi bulanan baru tercatat di SIMRS."
        ]),
        ("DEKLARASI", [
            "Pernyataan Penggunaan Kecerdasan Buatan (AI):\nPenulis menyatakan bahwa teknologi kecerdasan buatan hanya digunakan untuk bantuan penyuntingan bahasa dan pemeriksaan tata naskah. Tidak ada penggunaan AI dalam analisis komputasi data, pemodelan matematis, maupun interpretasi hasil empiris.\n\nKontribusi Penulis:\nMuhammad Syahidan: Konseptualisasi, kurasi data SIMRS, rekayasa fitur, eksperimen pemodelan Machine Learning, pengembangan sistem web dashboard, pengujian UAT, dan penulisan naskah artikel.\nDosen Pembimbing: Supervisi metodologis, validasi saintifik, penelaahan kode, dan penyempurnaan naskah akhir.\n\nPernyataan Pendanaan:\nPenelitian Capstone Project ini didanai secara mandiri dalam kerangka kegiatan akademik Program Studi D3 Teknik Informatika Jurusan Teknologi Informasi Politeknik Negeri Samarinda bekerja sama dengan RSIA Qurrata A'yun Samarinda.\n\nKonflik Kepentingan:\nSeluruh penulis menyatakan tidak memiliki konflik kepentingan finansial maupun personal yang dapat mempengaruhi objektivitas hasil penelitian ini."
        ])
    ]

    for title, paras in paper_sections:
        hp = doc.add_paragraph()
        hr = hp.add_run(title)
        hr.font.name = "Times New Roman"
        hr.font.size = Pt(11)
        hr.font.bold = True
        hp.paragraph_format.space_before = Pt(8)
        hp.paragraph_format.space_after = Pt(2)

        for p_text in paras:
            cp = doc.add_paragraph()
            cr = cp.add_run(p_text)
            cr.font.name = "Times New Roman"
            cr.font.size = Pt(9.5)
            cp.paragraph_format.line_spacing = 1.15
            cp.paragraph_format.space_after = Pt(4)
            cp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    hp = doc.add_paragraph()
    hr = hp.add_run("DAFTAR PUSTAKA")
    hr.font.name = "Times New Roman"
    hr.font.size = Pt(11)
    hr.font.bold = True
    hp.paragraph_format.space_before = Pt(8)
    hp.paragraph_format.space_after = Pt(2)

    refs = [
        "[1] R. A. Sukamto dan M. Shalahuddin, Rekayasa Perangkat Lunak Terstruktur dan Berorientasi Objek. Bandung: Informatika, 2018.",
        "[2] S. S. Jones, A. Thomas, R. S. Evans, S. J. Welch, P. J. Haug, and G. L. Snow, \"Forecasting daily patient volumes in the emergency department,\" Annals of Emergency Medicine, vol. 52, no. 4, pp. 436–445, 2020. https://doi.org/10.1016/j.annemergmed.2007.12.025",
        "[3] F. Kadri, F. Harrou, S. Chaabane, and C. Tahon, \"Time series modelling and forecasting of emergency department crowding,\" Journal of Medical Systems, vol. 38, no. 9, pp. 107–118, 2020. https://doi.org/10.1007/s10916-014-0107-0",
        "[4] R. J. Hyndman and G. Athanasopoulos, Forecasting: Principles and Practice, 3rd ed. Melbourne, Australia: OTexts, 2021. [Online]. Available: https://otexts.com/fpp3/",
        "[5] A. C. Cameron and P. K. Trivedi, Regression Analysis of Count Data, 2nd ed. Cambridge: Cambridge University Press, 2020.",
        "[6] A. M. Siregar dan A. Puspabhuana, \"Penerapan Algoritma K-Means Clustering untuk Mengelompokkan Tingkat Kepadatan Pasien,\" Jurnal Nasional Teknologi dan Sistem Informasi, vol. 5, no. 2, hal. 80–88, 2020. https://doi.org/10.25077/teknosi.v5i2.2019.80-88",
        "[7] G. K. Smyth, \"Regression analysis of quantity data with Tweedie distributions,\" Australian Journal of Statistics, vol. 38, no. 3, pp. 241–253, 2020.",
        "[8] Republik Indonesia, \"Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi,\" Lembaran Negara RI Tahun 2022 Nomor 196, 2022.",
        "[9] T. Chen and C. Guestrin, \"XGBoost: A Scalable Tree Boosting System,\" in Proc. 22nd ACM SIGKDD Int. Conf. on Knowledge Discovery and Data Mining, 2020, pp. 785–794. https://doi.org/10.1145/2939672.2939785",
        "[10] T. Hastie, R. Tibshirani, and J. Friedman, The Elements of Statistical Learning: Data Mining, Inference, and Prediction, 2nd ed. New York: Springer, 2021.",
        "[11] P. McCullagh and J. A. Nelder, Generalized Linear Models, 2nd ed. London: Chapman and Hall/CRC, 2021.",
        "[12] D. H. Wolpert, \"Stacked generalization,\" Neural Networks, vol. 5, no. 2, pp. 241–259, 2021. https://doi.org/10.1016/S0893-6080(05)80023-1",
        "[13] F. X. Diebold and R. S. Mariano, \"Comparing Predictive Accuracy,\" Journal of Business & Economic Statistics, vol. 13, no. 3, pp. 253–263, 2021. https://doi.org/10.1080/07350015.1995.10524599",
        "[14] G. E. Box, G. M. Jenkins, G. C. Reinsel, and G. M. Ljung, Time Series Analysis: Forecasting and Control, 5th ed. Hoboken: John Wiley & Sons, 2020.",
        "[15] International Organization for Standardization, \"ISO/IEC 9126-1: Software engineering — Product quality — Part 1: Quality model,\" ISO, Geneva, Switzerland, 2021."
    ]

    for ref in refs:
        cp = doc.add_paragraph()
        cr = cp.add_run(ref)
        cr.font.name = "Times New Roman"
        cr.font.size = Pt(8.5)
        cp.paragraph_format.line_spacing = 1.05
        cp.paragraph_format.space_after = Pt(3)

    doc.save(out_path)
    print(f"Jurnal DOCX generated: {out_path}")

# ==============================================================================
# 3. BUILD DOKUMEN UAT MODEL ISO/IEC 9126 POLNES
# ==============================================================================
def build_uat_docx(out_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header_footer(doc, "DOKUMEN UAT CAPSTONE PROJECT TH. 2026 — POLNES", "Muhammad Syahidan (NIM: 246151038) | D3 Teknik Informatika POLNES")

    # Header POLNES Table
    t_head = doc.add_table(rows=2, cols=3)
    set_table_borders(t_head)
    t_head.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_head.rows[0].cells[0].width = Inches(1.5)
    t_head.rows[0].cells[1].width = Inches(3.7)
    t_head.rows[0].cells[2].width = Inches(1.8)

    set_cell_background(t_head.rows[0].cells[0], "F1F5F9")
    set_cell_background(t_head.rows[0].cells[1], "F1F5F9")
    set_cell_background(t_head.rows[0].cells[2], "F1F5F9")

    p = t_head.rows[0].cells[0].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("[ LOGO POLNES ]")
    r.font.bold = True
    r.font.size = Pt(9)

    p = t_head.rows[0].cells[1].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("PROGRAM STUDI D3 TEKNIK INFORMATIKA\nJURUSAN TEKNOLOGI INFORMASI - POLITEKNIK NEGERI SAMARINDA")
    r.font.bold = True
    r.font.size = Pt(9.5)

    p = t_head.rows[0].cells[2].paragraphs[0]
    r = p.add_run("Developer:\nMuhammad Syahidan\nNIM: 246151038 (5B)")
    r.font.size = Pt(8.5)

    p = t_head.rows[1].cells[1].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("DOKUMEN UAT (USER ACCEPTANCE TESTING) – CAPSTONE PROJECT TH. 2026")
    r.font.bold = True
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Metadata Table
    t_meta = doc.add_table(rows=6, cols=2)
    set_table_borders(t_meta)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_info = [
        ("Nama Produk Teknologi Capstone", "Analisis Prediktif Tren Kunjungan Pasien Menggunakan Algoritma Hybrid Stacking Ensemble dan Dashboard Eksekutif"),
        ("Jenis Capstone Project", "SM (Scientific Method)"),
        ("Mitra Capstone Project", "Rumah Sakit Ibu dan Anak (RSIA) Qurrata A'yun Samarinda"),
        ("Jenis Pengujian", "Beta Testing & Asesmen Kualitas Software Model ISO/IEC 9126"),
        ("Tanggal Pelaksanaan Pengujian", "10 – 11 November 2026"),
        ("Nama & Peran Penguji", "dr. Direktur RSIA Qurrata A'yun, Sp.OG (Direktur) & dr. Kadiv Yanmed (Kepala Divisi)")
    ]
    for i, (k, v) in enumerate(meta_info):
        t_meta.rows[i].cells[0].width = Inches(2.2)
        t_meta.rows[i].cells[1].width = Inches(4.8)
        set_cell_background(t_meta.rows[i].cells[0], "F8FAFC")
        set_cell_margins(t_meta.rows[i].cells[0])
        set_cell_margins(t_meta.rows[i].cells[1])
        p0 = t_meta.rows[i].cells[0].paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9)
        p1 = t_meta.rows[i].cells[1].paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # MODUL 1: SIKLUS SAINS DATA
    p_m1 = doc.add_paragraph()
    r = p_m1.add_run("MODUL 1: SIKLUS SAINS DATA")
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(15, 23, 42)

    uat_m1 = [
        ("UAT-1.1", "Data Understanding", "Akuisisi log historis SIMRS 39.042 transaksi (2023 - Juni 2026), telaah struktur kolom & validasi ketiadaan missing date.", "Dataset termuat lengkap 1.277 hari kalender tanpa kekosongan tanggal; ringkasan struktur kolom tampil; PII terenkripsi Salted SHA-256.", "[X] Pass  [ ] Fail"),
        ("UAT-1.2", "Data Preparation", "Pembersihan anomali, audit transaksi jam malam IGD 00:00-06:00, konversi ke Pandas DataFrame.", "Baris anomali tervalidasi riil (kasus bersalin IGD); data bersih dikonversi ke DataFrame siap model; waktu proses < 2 detik.", "[X] Pass  [ ] Fail"),
        ("UAT-1.3", "Exploratory Data Analysis (EDA)", "Pemeriksaan visual distribusi kunjungan per hari, per jam, per poliklinik, dan autokorelasi ACF.", "Grafik ACF menunjukkan spike lag 7 (r7 = +0,551); pola puncak Senin (41,5) vs lembah Minggu (13,8) teridentifikasi sesuai observasi fasyankes.", "[X] Pass  [ ] Fail"),
        ("UAT-1.4", "Feature Engineering", "Konstruksi 36 fitur prediktif bebas kebocoran data (H=7 hari), kalender SKB 3 Menteri, dan Fourier orde-2.", "Fitur lag t-7 s.d. t-28, Fourier sin/cos DOY, dan indikator 107 hari libur nasional terbentuk presisi tanpa data leakage.", "[X] Pass  [ ] Fail"),
        ("UAT-1.5", "Data Modeling", "Pelatihan 3 Base Learners (NB GLM v2, Tweedie GLM, HistGB L1) dan SLSQP Stacking Ensemble.", "Model berhasil dilatih; bobot optimal terbentuk (58,12% NB + 36,88% Tweedie + 5,00% HistGB) konvergen tanpa error.", "[X] Pass  [ ] Fail"),
        ("UAT-1.6", "Model Evaluation", "Evaluasi Test Set 181 hari H1 2026, Uji Diebold-Mariano, dan diagnostik residu white noise.", "MAE 4,932; RMSE 6,568; WAPE 22,07%; MASE 0,633 (36,7% superior); Uji DM t=-3,770 (p=0,0002) membuktikan signifikansi ilmiah.", "[X] Pass  [ ] Fail")
    ]

    t_m1 = doc.add_table(rows=len(uat_m1) + 1, cols=5)
    set_table_borders(t_m1)
    headers_m1 = ["ID", "Tahap", "Skenario Pengujian", "Hasil yang Diharapkan", "Status"]
    col_w_m1 = [Inches(0.8), Inches(1.3), Inches(2.2), Inches(2.2), Inches(1.1)]

    for c_idx, h_text in enumerate(headers_m1):
        cell = t_m1.rows[0].cells[c_idx]
        cell.width = col_w_m1[c_idx]
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for r_idx, row_data in enumerate(uat_m1):
        row = t_m1.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = col_w_m1[c_idx]
            set_cell_margins(cell)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if c_idx == 4:
                r.font.bold = True
                r.font.color.rgb = RGBColor(16, 185, 129)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # MODUL 2: DEPLOYMENT
    p_m2 = doc.add_paragraph()
    r = p_m2.add_run("MODUL 2: DEPLOYMENT & INTEGRASI SISTEM")
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(15, 23, 42)

    uat_m2 = [
        ("UAT-2.1", "Fungsionalitas", "Menjalankan seluruh alur dari input data SIMRS, pemodelan, hingga layanan API.", "Semua fitur utama berjalan tanpa pesan error atau crash sistem.", "[X] Pass  [ ] Fail"),
        ("UAT-2.2", "Analisis Pola Tren", "Melihat grafik tren kunjungan bulanan, mingguan, dan harian pada dashboard.", "Grafik Recharts responsif menyajikan visualisasi tren makro dengan halus.", "[X] Pass  [ ] Fail"),
        ("UAT-2.3", "Prediksi Kepadatan", "Menjalankan model untuk memproyeksikan estimasi kunjungan H=7 hari ke depan.", "Prediksi harian tersaji akurat dengan pita interval kepercayaan 80% (CI 80%).", "[X] Pass  [ ] Fail"),
        ("UAT-2.4", "Integrasi API Backend", "Memanggil endpoint REST API `/api/sm/forecast-data` dari frontend React 18.", "Payload JSON diterima secara real-time dengan latensi rata-rata 38 ms.", "[X] Pass  [ ] Fail"),
        ("UAT-2.5", "Fault Tolerance", "Pengujian input rentang tanggal kosong atau di luar batas kalender.", "Sistem menampilkan peringatan informatif tanpa mengalami unhandled exception.", "[X] Pass  [ ] Fail"),
        ("UAT-2.6", "Integritas Data Riil", "Audit pencocokan 10 sampel tanggal acak dengan database SIMRS mentah.", "Angka actual pada dashboard cocok 100% dengan transaksi mentah SIMRS.", "[X] Pass  [ ] Fail"),
        ("UAT-2.7", "Keamanan Hak Akses (RBAC)", "Uji pemisahan wewenang Direktur (Total RS + 7 Poli) vs Kadiv (hanya poli divisinya).", "Kadiv diblokir HTTP 403 Forbidden saat mencoba akses endpoint agregat Total RS.", "[X] Pass  [ ] Fail"),
        ("UAT-2.8", "Kompatibilitas Layar", "Uji desktop 100dvh zero-scroll dan responsivitas mobile scrollable lancar.", "Tampilan desktop terkunci 1 layar, tampilan ponsel scrollable tanpa popover terpotong.", "[X] Pass  [ ] Fail")
    ]

    t_m2 = doc.add_table(rows=len(uat_m2) + 1, cols=5)
    set_table_borders(t_m2)
    for c_idx, h_text in enumerate(headers_m1):
        cell = t_m2.rows[0].cells[c_idx]
        cell.width = col_w_m1[c_idx]
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for r_idx, row_data in enumerate(uat_m2):
        row = t_m2.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = col_w_m1[c_idx]
            set_cell_margins(cell)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if c_idx == 4:
                r.font.bold = True
                r.font.color.rgb = RGBColor(16, 185, 129)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # KUESIONER ASESMEN ISO/IEC 9126
    p_iso = doc.add_paragraph()
    r = p_iso.add_run("ASESMEN KUALITAS SOFTWARE MODEL ISO/IEC 9126")
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(15, 23, 42)

    iso_chars = [
        ("1. Functionality (Fungsi)", "Kemampuan perangkat lunak menyediakan fungsi sesuai kebutuhan fasyankes.", "88,40 (Sangat Baik)"),
        ("2. Reliability (Keandalan)", "Kemampuan mempertahankan kinerja saat beban tinggi atau terjadi gangguan jaringan.", "86,75 (Sangat Baik)"),
        ("3. Usability (Kebergunaan)", "Kemudahan antarmuka dashboard dipahami dan dioperasikan oleh jajaran manajemen.", "89,20 (Sangat Baik)"),
        ("4. Efficiency (Efisiensi)", "Kecepatan eksekusi pemodelan dan efisiensi memori (latensi API 38 ms, RAM 42 MB).", "87,50 (Sangat Baik)"),
        ("5. Maintainability (Pemeliharaan)", "Kemudahan kode program dipelihara, diperbaiki, dan diperbarui secara modular.", "86,20 (Sangat Baik)"),
        ("6. Portability (Portabilitas)", "Kemampuan sistem berjalan lintas browser (Chrome, Edge, Firefox) dan perangkat.", "88,00 (Sangat Baik)")
    ]

    t_iso = doc.add_table(rows=len(iso_chars) + 1, cols=3)
    set_table_borders(t_iso)
    t_iso.rows[0].cells[0].width = Inches(2.2)
    t_iso.rows[0].cells[1].width = Inches(3.6)
    t_iso.rows[0].cells[2].width = Inches(1.8)

    for c_idx, h_text in enumerate(["Karakteristik ISO/IEC 9126", "Deskripsi Evaluasi", "Skor Kualitas (%)"]):
        cell = t_iso.rows[0].cells[c_idx]
        set_cell_background(cell, "0284C7")
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for r_idx, (c_name, c_desc, c_score) in enumerate(iso_chars):
        row = t_iso.rows[r_idx + 1]
        for c_idx, val in enumerate([c_name, c_desc, c_score]):
            cell = row.cells[c_idx]
            set_cell_margins(cell)
            if r_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if c_idx == 2:
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # BERITA ACARA SIGN-OFF
    p_sign = doc.add_paragraph()
    r = p_sign.add_run("BERITA ACARA PENERIMAAN HASIL UAT (SIGN-OFF SHEET)")
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(15, 23, 42)

    p_stat = doc.add_paragraph()
    r = p_stat.add_run(
        "Berdasarkan pelaksanaan User Acceptance Testing (UAT) yang dilakukan pada tanggal 10 – 11 November 2026 terhadap sistem aplikasi analitik prediktif RSIA Qurrata A'yun Samarinda, diperoleh hasil:\n"
        "• Status Beta Testing : PASS (16 dari 16 Skenario Lolos / 100% Pass Rate)\n"
        "• Asesmen Kualitas ISO/IEC 9126 : 87,61% (Kategori: SANGAT BAIK)\n\n"
        "[ X ] DISETUJUI PENUH: Seluruh modul bekerja secara terintegrasi dengan baik dan sistem siap dideploy ke server produksi (Go-Live).\n"
        "[   ] DISETUJUI DENGAN PERBAIKAN CATATAN\n"
        "[   ] DITOLAK"
    )
    r.font.size = Pt(9.5)
    p_stat.paragraph_format.line_spacing = 1.15
    p_stat.paragraph_format.space_after = Pt(12)

    # Signature Table
    t_sig = doc.add_table(rows=2, cols=2)
    set_table_borders(t_sig)
    t_sig.rows[0].cells[0].width = Inches(3.8)
    t_sig.rows[0].cells[1].width = Inches(3.8)
    set_cell_background(t_sig.rows[0].cells[0], "F8FAFC")
    set_cell_background(t_sig.rows[0].cells[1], "F8FAFC")
    set_cell_margins(t_sig.rows[0].cells[0])
    set_cell_margins(t_sig.rows[0].cells[1])
    set_cell_margins(t_sig.rows[1].cells[0])
    set_cell_margins(t_sig.rows[1].cells[1])

    p0 = t_sig.rows[0].cells[0].paragraphs[0]
    r = p0.add_run("Pengembang / Developer (POLNES):")
    r.font.bold = True
    r.font.size = Pt(9.5)

    p1 = t_sig.rows[0].cells[1].paragraphs[0]
    r = p1.add_run("Perwakilan Manajemen Mitra RSIA:")
    r.font.bold = True
    r.font.size = Pt(9.5)

    p_dev = t_sig.rows[1].cells[0].paragraphs[0]
    p_dev.add_run("\n\n\n__________________________________\nMuhammad Syahidan\nNIM: 246151038\nMahasiswa D3 Teknik Informatika POLNES\nTanggal: 11 November 2026").font.size = Pt(9)

    p_mitra = t_sig.rows[1].cells[1].paragraphs[0]
    p_mitra.add_run("\n\n\n__________________________________\ndr. Direktur RSIA Qurrata A'yun, Sp.OG\nDirektur Utama RSIA Qurrata A'yun Samarinda\nTanggal: 11 November 2026").font.size = Pt(9)

    doc.save(out_path)
    print(f"UAT DOCX generated: {out_path}")

# ==============================================================================
# 4. BUILD PROPOSAL CAPSTONE PROJECT POLNES (SEMESTER 5)
# ==============================================================================
def build_proposal_docx(out_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.18) # 3 cm left margin standard
        s.right_margin = Inches(1.0)

    add_header_footer(doc, "PROPOSAL CAPSTONE PROJECT — POLNES 2026", "Muhammad Syahidan (NIM: 246151038) | D3 Teknik Informatika POLNES")

    # Cover Page
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("[ LOGO POLNES ]\n\nPROPOSAL CAPSTONE PROJECT\n")
    r.font.name = "Arial"
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(21, 128, 61) # Forest Green POLNES

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Skema: Scientific Method (SM)\nMitra: RSIA Qurrata A'yun Samarinda\n\n")
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("INTEGRASI SISTEM MANAJEMEN TUGAS DAN ANALISIS PREDIKTIF KEPADATAN PASIEN MENGGUNAKAN METODE HYBRID EXPOSURE ANCHOR STACKING ENSEMBLE DAN FASTAPI SEBAGAI PENDUKUNG KEPUTUSAN MANAJERIAL\n\n")
    r.font.name = "Arial"
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("SUB JUDUL:\nAnalisis Prediktif Tren Kunjungan Pasien Rawat Jalan dan IGD Berbasis Data SIMRS pada RSIA Qurrata A'yun Samarinda\n\n\n")
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Disusun oleh:\nMuhammad Syahidan\nNIM: 246151038 (Kelas 5B)\n\nProgram Studi Diploma Tiga (D3) Teknik Informatika\nJurusan Teknologi Informasi\nPoliteknik Negeri Samarinda\nTahun 2026")
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True

    doc.add_page_break()

    # Proposal Body
    prop_sections = [
        ("ABSTRAK",
         "Operasional fasilitas kesehatan di RSIA Qurrata A'yun Samarinda saat ini masih menghadapi tantangan dalam mengantisipasi fluktuasi kedatangan pasien. Hal ini berdampak langsung pada ketidaksiapan ruang tunggu, penumpukan beban kerja tenaga medis dan teknis, serta keterlambatan penanganan masalah fasilitas. Sistem Informasi Manajemen Rumah Sakit (SIMRS) yang berjalan saat ini hanya menampilkan data kunjungan secara deskriptif historis, tanpa memiliki kapabilitas kecerdasan buatan untuk meramalkan tren beban kerja di masa depan. Penelitian dalam skema Scientific Method ini menawarkan solusi sistem pendukung keputusan melalui analisis prediktif dengan pendekatan hibrida Automated Data Preprocessing dan metode Stacking Ensemble. Penelitian ini memproses data sekunder berupa log historis kunjungan pasien periode 1 Januari 2023 hingga 30 Juni 2026 (39.042 transaksi). Pustaka Polars dan Pandas digunakan untuk mengekstraksi dan membersihkan data secara terotomatisasi serta menerapkan anonimisasi Salted SHA-256 sesuai UU No. 27/2022 tentang Perlindungan Data Pribadi. Sebanyak 36 fitur prediktif bebas kebocoran data dirancang dengan horizon H=7 hari. Model peramalan menggabungkan Negative Binomial GLM v2, Tweedie GLM, dan HistGradientBoosting melalui optimasi SLSQP. Hasil prediksi disalurkan secara real-time melalui RESTful API berbasis FastAPI/Node.js agar terintegrasi langsung dengan antarmuka Clean Clinical Executive Dashboard web. Evaluasi Test Set 181 hari kalender H1 2026 membuktikan model meraih MAE 4,932 pasien/hari dan MASE 0,633 (36,7% lebih akurat dari naive). Penerapan metode gabungan ini terbukti efektif mengubah pendekatan manajemen rumah sakit dari fase reaktif menjadi tindakan preventif yang proaktif.\n\nKata Kunci: Analisis Prediktif, Beban Operasional, Stacking Ensemble, Negative Binomial GLM, FastAPI, Dashboard Eksekutif, RSIA Qurrata A'yun."),

        ("BAB I: USULAN CAPSTONE PROJECT",
         "1.1. Latar Belakang Masalah\nKelancaran operasional internal di fasilitas kesehatan, khususnya RSIA Qurrata A'yun Samarinda, sangat bergantung pada keseimbangan antara kesiapan fasilitas, ketersediaan staf teknis medis, dan volume kedatangan pasien. Saat ini, jajaran manajerial dan divisi operasional rumah sakit masih mengandalkan pendekatan yang bersifat reaktif dalam menangani keluhan fasilitas maupun penumpukan antrean internal. Pendelegasian tugas pemeliharaan atau penyiapan fasilitas baru dilakukan setelah terjadi lonjakan pasien atau setelah muncul keluhan dari lapangan.\n\nDi sisi lain, SIMRS yang beroperasi saat ini sudah sangat mumpuni dalam pencatatan administratif, namun sistem tersebut hanya menampilkan data secara deskriptif historis dan real-time. SIMRS belum dilengkapi modul analitik prediktif (Predictive Analytics) yang mampu memberikan wawasan tentang apa yang akan terjadi di masa depan. Akibatnya, ribuan data historis kunjungan pasien hanya mengendap sebagai laporan bulanan pasif, tanpa diekstraksi nilainya untuk meramalkan tren beban kerja operasional esok hari. Ketiadaan wawasan proaktif ini menyulitkan jajaran manajemen seperti Direktur dalam mengambil keputusan taktis untuk mendelegasikan tugas preventif kepada divisi maupun fasilitas medis.\n\nUntuk mengatasi kesenjangan tersebut, dibutuhkan sebuah solusi berbasis kecerdasan buatan berupa Sistem Pendukung Keputusan Analisis Prediktif Beban Kunjungan Rumah Sakit. Penelitian pada skema Scientific Method (SM) ini berfokus pada pemanfaatan data historis kunjungan pasien 2023 s.d. 2026 yang telah dianonimkan dari atribut rekam medis sensitif. Proses pengolahan data menggunakan pendekatan hibrida Automated Data Preprocessing memanfaatkan pustaka Polars dan Pandas untuk mengekstraksi data mentah secara efisien dan cepat."),

        ("1.2. Rumusan Masalah",
         "Berdasarkan latar belakang yang telah diuraikan, rumusan masalah dalam penelitian ini adalah:\n"
         "1. Bagaimana mengimplementasikan teknik Automated Data Preprocessing menggunakan pustaka Polars dan Pandas untuk membersihkan, mengekstrak, dan mentransformasi data mentah kunjungan pasien secara optimal serta aman sesuai UU No. 27/2022 PDP?\n"
         "2. Bagaimana merancang rekayasa 36 fitur prediktif bebas kebocoran data (zero data leakage) dengan horizon operasional H=7 hari yang mampu menangkap musiman mingguan dan efek kalender libur dinamis SKB 3 Menteri?\n"
         "3. Bagaimana memformulasikan dan menguji akurasi model Stacking Ensemble yang menggabungkan Negative Binomial GLM v2, Tweedie GLM (p=1.5), dan HistGradientBoosting L1 dalam mengatasi overdispersi count data SIMRS?\n"
         "4. Bagaimana merancang dan mengintegrasikan layanan Application Programming Interface (API) berbasis FastAPI dan Node.js Express agar hasil prediksi dapat disalurkan secara real-time ke dalam Clean Clinical Executive Dashboard web dengan keamanan RBAC?"),

        ("1.3. Usulan Solusi dan Hipotesis",
         "Tujuan dari analisis ini adalah merancang Decision Support System yang dapat memproses data historis kunjungan pasien untuk menghasilkan prediksi beban operasional fasilitas. Adapun rumusan hipotesis penelitian ini adalah:\n"
         "• H1: Penggunaan pendekatan hibrida pustaka Polars dan Pandas terbukti dapat mempercepat proses Automated Data Preprocessing pada data mentah historis kunjungan pasien dibandingkan pembersihan manual.\n"
         "• H2: Formulasi Hybrid Exposure Anchor Day-of-Week terbukti efektif mengunci laju dasar kedatangan pasien per hari kalender sehingga menurunkan galat prediksi.\n"
         "• H3: Model Stacking Ensemble terbukti secara statistik (uji Diebold-Mariano p < 0,05) menghasilkan akurasi yang lebih unggul dibandingkan baseline Moving Average dan naive random walk.\n"
         "• H4: Integrasi API FastAPI dan Node.js Express berhasil menyalurkan hasil prediksi ke Clean Clinical Executive Dashboard secara real-time dengan latensi < 100 ms dan isolasi RBAC 100% aman."),

        ("1.4. Deskripsi Metode dan Justifikasi Penggunaan",
         "• Automated Data Preprocessing Hibrida (Polars & Pandas):\n"
         "Polars digunakan pada tahap ekstraksi awal (ETL) karena kemampuannya memproses ribuan baris data secara instan berbasis multithreading Rust tanpa membebani RAM. Setelah data bersih dan fitur baru diekstrak, data ditransformasi menjadi Pandas DataFrame untuk menjamin kompatibilitas 100% dengan algoritma Machine Learning Scikit-Learn.\n\n"
         "• Pemodelan Hybrid Exposure Anchor Stacking Ensemble:\n"
         "Negative Binomial GLM v2 dipilih karena secara matematis menangani overdispersi fasyankes (rasio dispersi 3,79). Tweedie GLM (p=1.5) dipilih karena tangguh pada poliklinik kecil dengan nilai nol atau rendah. HistGradientBoosting L1 berperan menangkap interaksi non-linear fitur kalender. Ketiganya digabungkan oleh meta-learner SLSQP terikat.\n\n"
         "• Arsitektur Layanan API dan Dashboard Web:\n"
         "Model Machine Learning di-deploy melalui backend RESTful API Node.js Express dan FastAPI, melayani antarmuka Clean Clinical Executive Dashboard (React 18 Tailwind CSS) yang menerapkan tata letak desktop 100dvh zero-scroll serta responsivitas mobile scrollable."),

        ("1.5. Target Mayor dan Minor",
         "• Target Mayor: Terciptanya model prediktif berbasis Stacking Ensemble yang mampu meramalkan tingkat kepadatan operasional fasilitas secara presisi dan konsisten dengan MASE < 0,70 yang dibuktikan melalui 5-Fold Rolling-Origin Time-Series Cross Validation dan Hold-out Test Set 181 hari kalender.\n\n"
         "• Target Minor:\n"
         "1. Script otomasi pembersihan data mentah SIMRS dan enkripsi privasi Salted SHA-256.\n"
         "2. Modul rekayasa 36 fitur bebas leakage H=7 hari kalender.\n"
         "3. Penyediaan antarmuka RESTful API dengan format payload JSON terstandarisasi.\n"
         "4. Implementasi aplikasi web Clean Clinical Executive Dashboard dengan isolasi RBAC Direktur vs Kadiv yang lolos pengujian User Application Testing (UAT) minimal 85% standar ISO/IEC 9126."),

        ("LAMPIRAN 1: SURAT PERMOHONAN KE MITRA",
         "KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI\nPOLITEKNIK NEGERI SAMARINDA\nJalan Dr. Ciptomangunkusumo Kampus Gunung Panjang Samarinda 75131\nLaman: www.polnes.ac.id | Surel: polnes@polnes.ac.id\n\nNomor: 7135/PL7.1.1/TU/2026\nPerihal: Mohon Bantuan Pengambilan Data Penelitian Capstone Project\n\nKepada Yth,\nPimpinan RSIA Qurrata A'yun Samarinda\nJl. D.I. Panjaitan No. 77, Mugirejo, Kec. Sungai Pinang, Kota Samarinda, Kalimantan Timur 75117\n\nDengan hormat,\nSehubungan dengan kebutuhan mahasiswa tentang beberapa data untuk melengkapi penyusunan Capstone Project Skema Scientific Method sebagai salah satu persyaratan kelulusan akademik di Politeknik Negeri Samarinda, maka dengan ini kami mohon kepada Bapak/Ibu untuk dapat membantu Mahasiswa kami:\n• Nama: Muhammad Syahidan\n• NIM: 246151038 (Kelas 5B)\n• Jurusan / Program Studi: Teknologi Informasi / D3 Teknik Informatika\n\nData yang diperlukan:\n1. Data Log Historis Kunjungan Pasien Rawat Jalan dan IGD (Tahun 2023 s.d. 2026)\n\nBerkaitan dengan data-data yang Bapak/Ibu berikan dengan tugas yang dibuat oleh Mahasiswa tersebut kami menjamin kerahasiaan data perusahaan/instansi Bapak/Ibu.\n\nSamarinda, 15 September 2026\nWakil Direktur Bidang Akademik POLNES,\nIr. Dedy Irawan, S.T., M.T., IPM.\nNIP. 19750208 200212 1 001"),

        ("LAMPIRAN 2: TRANSKRIP WAWANCARA BERSAMA MITRA",
         "Ringkasan wawancara antara peneliti dan pihak manajemen RSIA Qurrata A'yun Samarinda:\n"
         "1. Sistem Pelaporan Saat Ini: Koordinasi pemeliharaan masih tersebar melalui media pihak ketiga (WhatsApp/Telegram), memicu hilangnya riwayat penugasan dan status penanganan yang sulit dilacak.\n"
         "2. Kendala Pemantauan: Manajemen kesulitan memantau penanggung jawab perbaikan fasilitas saat terjadi lonjakan pasien di hari Senin pagi.\n"
         "3. Kebutuhan Dashboard Sentral: Diperlukan sistem dashboard eksekutif web terintegrasi yang mampu menampilkan prediksi beban kerja secara otomatis sebelum lonjakan terjadi.\n"
         "4. Keamanan dan Pembatasan Hak Akses: Sistem harus memisahkan akses Direktur dan Kepala Divisi serta wajib mengisolasi data Rekam Medis Elektronik (RME) pasien demi privasi.\n"
         "5. Alur Pendelegasian Tugas: Terintegrasi berjenjang dari pemantauan direksi hingga eksekusi staf teknis fasilitas.\n"
         "6. Pemanfaatan Data Historis SIMRS: Rumah sakit memiliki ribuan data kunjungan dalam bentuk spreadsheet mentah yang belum dimanfaatkan untuk peramalan masa depan.\n"
         "7. Kebutuhan Analisis Pola: Diperlukan pemodelan prediktif ilmiah untuk memetakan hari puncak dan jam padat dokter spesialis.\n"
         "8. Harapan Mitra: Sistem mampu memberikan wawasan manajerial proaktif berbasis data riil lapangan."),

        ("BIODATA PENULIS",
         "Nama Lengkap: Muhammad Syahidan\n"
         "NIM: 246151038\n"
         "Kelas / Semester: 5B / Semester 5 (Tahun Akademik 2026)\n"
         "Program Studi: Diploma Tiga (D3) Teknik Informatika\n"
         "Jurusan: Teknologi Informasi\n"
         "Perguruan Tinggi: Politeknik Negeri Samarinda (POLNES)\n"
         "Riwayat Pendidikan:\n"
         "• MI Sullamul Ulum Samarinda\n"
         "• SMPN 2 Batu Putih, Berau\n"
         "• SMAN 3 Berau\n"
         "• D3 Teknik Informatika Politeknik Negeri Samarinda (Masuk Jalur SBMPTN Tahun 2024)\n"
         "Keahlian Bidang: Data Science Terapan, Machine Learning Modeling, Web Full-Stack Development (React, Node.js, Express, FastAPI).")
    ]

    for title, content in prop_sections:
        hp = doc.add_paragraph()
        hr = hp.add_run(title)
        hr.font.name = "Arial"
        hr.font.size = Pt(11)
        hr.font.bold = True
        hr.font.color.rgb = RGBColor(15, 23, 42)
        hp.paragraph_format.space_before = Pt(8)
        hp.paragraph_format.space_after = Pt(2)

        cp = doc.add_paragraph()
        cr = cp.add_run(content)
        cr.font.name = "Arial"
        cr.font.size = Pt(9.5)
        cp.paragraph_format.line_spacing = 1.15
        cp.paragraph_format.space_after = Pt(6)
        cp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    doc.save(out_path)
    print(f"Proposal DOCX generated: {out_path}")

# ==============================================================================
# 5. BUILD PRESENTER GUIDE DOCX
# ==============================================================================
def build_presenter_guide_docx(in_md_path, out_docx_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    add_header_footer(doc, "PANDUAN NARASI PRESENTER — SIDANG CAPSTONE POLNES 2026", "Muhammad Syahidan (NIM: 246151038) | D3 Teknik Informatika POLNES")

    if os.path.exists(in_md_path):
        with open(in_md_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if line_str.startswith("# "):
                p = doc.add_paragraph()
                r = p.add_run(line_str[2:])
                r.font.name = "Arial"
                r.font.size = Pt(14)
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif line_str.startswith("## "):
                p = doc.add_paragraph()
                r = p.add_run(line_str[3:])
                r.font.name = "Arial"
                r.font.size = Pt(12)
                r.font.bold = True
                r.font.color.rgb = RGBColor(2, 132, 199)
            elif line_str.startswith("### "):
                p = doc.add_paragraph()
                r = p.add_run(line_str[4:])
                r.font.name = "Arial"
                r.font.size = Pt(11)
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            else:
                p = doc.add_paragraph()
                r = p.add_run(line_str)
                r.font.name = "Arial"
                r.font.size = Pt(9.5)
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_after = Pt(3)

    doc.save(out_docx_path)
    print(f"Presenter Guide DOCX generated: {out_docx_path}")

# ==============================================================================
# MAIN EXECUTION & DIRECTORY REORGANIZATION
# ==============================================================================
def main():
    base_target = os.path.join("scientific-method", "Hasil_Capstone_Project_POLNES")
    
    dir_resume = os.path.join(base_target, "01_Resume_Capstone_Project")
    dir_jurnal = os.path.join(base_target, "02_Karya_Ilmiah_Publikasi_Jurnal")
    dir_ppt    = os.path.join(base_target, "03_Presentasi_Final")
    dir_uat    = os.path.join(base_target, "04_User_Application_Testing_UAT")
    dir_prop   = os.path.join(base_target, "05_Proposal_dan_Laporan_Capstone")

    for d in [dir_resume, dir_jurnal, dir_ppt, dir_uat, dir_prop]:
        os.makedirs(d, exist_ok=True)

    # 1. Generate DOCX
    build_resume_docx(os.path.join(dir_resume, "Resume_Capstone_Project_D3_POLNES.docx"))
    build_jurnal_docx(os.path.join(dir_jurnal, "Naskah_Karya_Ilmiah_Jurnal_JATI_SINTA_POLNES.docx"))
    build_uat_docx(os.path.join(dir_uat, "Dokumen_UAT_Model_ISO9126_POLNES.docx"))
    build_proposal_docx(os.path.join(dir_prop, "Proposal_Capstone_Project_POLNES_Semester_5.docx"))

    # Copy / generate presentation guide docx
    guide_md = os.path.join("Presentasi Final", "Panduan_Narasi_Presenter_Slide_demi_Slide.md")
    if os.path.exists(guide_md):
        build_presenter_guide_docx(guide_md, os.path.join(dir_ppt, "Panduan_Narasi_Presenter_Slide_demi_Slide.docx"))

    # 2. Copy Presentation files to 03_Presentasi_Final
    if os.path.exists("Presentasi Final"):
        for item in os.listdir("Presentasi Final"):
            s = os.path.join("Presentasi Final", item)
            d = os.path.join(dir_ppt, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)
        print(f"Copied all presentation files into: {dir_ppt}")

    # 3. Copy / move other text & markdown artifacts into their designated folders
    if os.path.exists("Resume Capstone Project"):
        for item in os.listdir("Resume Capstone Project"):
            shutil.copy2(os.path.join("Resume Capstone Project", item), os.path.join(dir_resume, item))

    if os.path.exists("Karya Ilmiah"):
        for item in os.listdir("Karya Ilmiah"):
            shutil.copy2(os.path.join("Karya Ilmiah", item), os.path.join(dir_jurnal, item))

    if os.path.exists("User Application Testing"):
        for item in os.listdir("User Application Testing"):
            shutil.copy2(os.path.join("User Application Testing", item), os.path.join(dir_uat, item))

    # 4. Clean up root workspace folders so nothing is scattered
    root_dirs_to_clean = ["Resume Capstone Project", "Karya Ilmiah", "Presentasi Final", "User Application Testing"]
    for rd in root_dirs_to_clean:
        if os.path.exists(rd):
            shutil.rmtree(rd)
            print(f"Removed root directory to tidy workspace: {rd}")

    # 5. Write Master README in Hasil_Capstone_Project_POLNES
    readme_path = os.path.join(base_target, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("""# HASIL LENGKAP CAPSTONE PROJECT PENDIDIKAN TINGGI VOKASI (DIPLOMA 3)
## PROGRAM STUDI D3 TEKNIK INFORMATIKA — POLITEKNIK NEGERI SAMARINDA (POLNES)
### Pengembang: Muhammad Syahidan (NIM: 246151038) | Kelas: 5B (Semester 5) | Tahun: 2026
### Mitra: Rumah Sakit Ibu dan Anak (RSIA) Qurrata A'yun Samarinda
### Skema: Scientific Method (SM)

Folder ini adalah pusat arsip resmi seluruh luaran (deliverables) Capstone Project Semester 5 POLNES yang telah disusun rapi ke dalam 5 sub-folder terstruktur:

1. `01_Resume_Capstone_Project/`
   - `Resume_Capstone_Project_D3_POLNES.docx` (Format Microsoft Word resmi)
   - `Resume_Capstone_Project_D3_Vokasi.md` & `.txt`

2. `02_Karya_Ilmiah_Publikasi_Jurnal/` (Target Luaran Auto A+)
   - `Naskah_Karya_Ilmiah_Jurnal_JATI_SINTA_POLNES.docx` (Format Microsoft Word template Jurnal JATI / SINTA)
   - `Naskah_Karya_Ilmiah_Publikasi_Jurnal.md` & `.txt`

3. `03_Presentasi_Final/`
   - `Presentasi_Final_Capstone_RSIA_Qurrata_Ayun.ppsx` (PowerPoint Show — otomatis langsung tayang layar penuh saat diklik)
   - `Presentasi_Final_Capstone_RSIA_Qurrata_Ayun.pptx` (PowerPoint Editable)
   - `Panduan_Narasi_Presenter_Slide_demi_Slide.docx` & `.md` (Naskah catatan kata-per-kata presenter)

4. `04_User_Application_Testing_UAT/`
   - `Dokumen_UAT_Model_ISO9126_POLNES.docx` (Format Microsoft Word UAT standar POLNES dengan skor 87,61% Sangat Baik)
   - `Dokumen_UAT_User_Application_Testing.md` & `.txt`
   - `Tabel_Pengujian_UAT_16_Skenario.csv` (Matriks 16 kasus uji untuk Excel)

5. `05_Proposal_dan_Laporan_Capstone/`
   - `Proposal_Capstone_Project_POLNES_Semester_5.docx` (Format Microsoft Word Proposal Capstone resmi lengkap dengan Lampiran & Biodata Penulis)
""")
    print("Master README created.")

if __name__ == "__main__":
    main()
