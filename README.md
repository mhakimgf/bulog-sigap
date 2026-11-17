# 🌾 SIGAP BULOG — Sistem Inventaris Pergudangan & Stock Opname Terpadu

<div align="center">

![SIGAP BULOG Banner](https://img.shields.io/badge/BULOG-SIGAP-0F2C59?style=for-the-badge&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

**Solusi Digital Modern Pergudangan Pangan Nasional, Pemetaan Stapel Visual 2D, Pelacakan FIFO/FEFO, dan Stock Opname Terintegrasi Perum BULOG.**

[Filosofi](#-filosofi--asal-usul-penamaan) • [Fitur Unggulan](#-fitur-unggulan) • [Tech Stack](#-teknologi--arsitektur) • [Konfigurasi](#%EF%B8%8F-panduan-konfigurasi) • [Instalasi](#-panduan-instalasi--menjalankan) • [Panduan Penggunaan](#-panduan-penggunaan-user-guide) • [Struktur Proyek](#-struktur-direktori)

</div>

---

## 📖 Filosofi & Asal-Usul Penamaan

### 1. Makna Singkatan (Acronym)
**SIGAP** merupakan representasi akronim dari fungsi intinya:
* **S**istem **I**nventaris **G**udang d**A**n **P**elacakan (*PRD Foundation*)
* Diperluas pada tataran arsitektur enterprise menjadi:  
  **Sistem Inventaris Pergudangan & Stock Opname Terpadu — Perum BULOG**.

### 2. Nilai Filosofis Bahasa & Operasional
Kata **"SIGAP"** diambil dari Bahasa Indonesia yang merefleksikan karakter: **tangkas, cepat, waspada, dan cekatan dalam bertindak**.
* **Kecepatan & Ketepatan (Tangkas)**: Mengeliminasi birokrasi pencatatan manual berbasis kertas/buku gudang yang rawan selisih (*human error*) menjadi digital serba cepat menggunakan pemindaian QR Code dari ponsel pintar.
* **Kesiapsiagaan Pangan (Siap Sedia)**: Menjamin stok cadangan beras pemerintah (CBP) dan komoditas komersial terpantau akurat secara *real-time* untuk mendukung kedaulatan pangan nasional.
* **Ketegasan Prosedur (Tertib & Akuntabel)**: Menjamin penegakan prinsip **FIFO (First In, First Out)** dan pemantauan masa simpan komoditas agar kualitas komoditas tidak turun mutu saat disimpan di gudang.

### 3. Identitas Visual & Psikologi Warna
Desain antarmuka SIGAP mengadopsi standar identitas resmi **Perum BULOG**:
* **Corporate Deep Navy (`#0F2C59` / `#1E3A8A`)**: Melambangkan integritas, ketegasan tata kelola BUMN, keamanan data, dan profesionalisme.
* **Warm Golden Grain (`#D97706` / `#F59E0B`)**: Merepresentasikan butir padi, kehangatan hasil tani nusantara, kemakmuran, dan kedaulatan pangan.
* **Signal Semantic Alerts**: Merah koral (peringatan kritis/masa simpan kedaluwarsa), Hijau zamrud (stok aman/validasi sukses), dan Kuning amber (perhatian/sebagian kapasitas).

---

## ✨ Fitur Unggulan

| Modul | Deskripsi Fitur | Target Pengguna |
| :--- | :--- | :--- |
| 📱 **Mobile Inbound Scan** | Pemindaian QR Code Surat Jalan / DO langsung dari kamera HP untuk penerimaan muatan masuk dan penempatan stapel. | Operator Lapangan |
| 🗺️ **Visual Denah Stapel 2D** | Peta matriks 4x3 interaktif (Blok A, B, C) untuk melihat kapasitas ruang, nomor stapel, dan rincian muatan tiap tumpukan. | Operator & Ka. Gudang |
| ⏱️ **Monitoring FIFO & Shelf-Life** | Sistem peringatan dini otomatis untuk komoditas beras yang melampaui batas simpan aman (>180 hari) guna mencegah apek. | Kepala Gudang |
| 🚚 **Smart Outbound Dispatch** | Rekomendasi otomatis stapel mana yang harus dikeluarkan terlebih dahulu berdasarkan tanggal masuk tertua (FIFO murni). | Operator Lapangan |
| 📋 **Stock Opname Digital** | Formulir verifikasi fisik vs data sistem secara instan, perhitungan otomatis variansi stok (surplus/minus). | Tim Pemeriksa & Auditor |
| 📄 **Generator BASO Otomatis** | Pembuatan dokumen resmi **Berita Acara Stock Opname (BASO)** berstandar audit dengan penomoran resmi dan kolom tanda tangan. | Kepala Gudang |
| 🏷️ **QR Generator Stapel** | Fasilitas pencetakan QR Code fisik untuk ditempelkan di tiang papan nama stapel gudang. | Administrator |
| 🛡️ **Audit Trail & Histori Mutasi** | Pencatatan rekam jejak (*log*) transaksi yang transparan mencakup timestamp, user pelaksana, dan jenis perubahan. | Super Admin & Auditor |
| 👥 **Multi-Role RBAC** | Hak akses berjenjang: **Super Admin**, **Kepala Gudang**, dan **Operator Lapangan**. | Seluruh Pengguna |

---

## 🛠️ Teknologi & Arsitektur

Aplikasi dibangun dengan arsitektur modern berorientasi performa tinggi dan ramah perangkat seluler (*mobile-first*):

* **Frontend Framework**: [Next.js 15+](https://nextjs.org/) (React 19, App Router architecture)
* **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) dengan custom theme palet Bulog
* **Icons & Visuals**: [Lucide React](https://lucide.dev/) & Canvas Confetti
* **Barcode & QR Engine**: `html5-qrcode` (kamera pemindai real-time) & `qrcode` (generator label)
* **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) dengan [Prisma ORM](https://www.prisma.io/)
* **State Management**: React Warehouse Context terintegrasi dengan fallback local data & REST API endpoints
* **PWA & Responsive Design**: Mendukung instalasi di layar beranda HP (Add to Home Screen)

---

## ⚙️ Panduan Konfigurasi

Sebelum menjalankan aplikasi, persiapkan variabel lingkungan (*environment variables*).

### 1. Salin Berkas Lingkungan
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
*(Di Windows PowerShell: `Copy-Item .env.example .env`)*

### 2. Parameter Konfigurasi (.env)
Buka berkas `.env` dan sesuaikan nilainya:

```env
# URL Koneksi Database PostgreSQL
# Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=public
DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5433/bulog_sigap?schema=public"

# Lingkungan Aplikasi
NODE_ENV="development"

# Identitas Aplikasi
NEXT_PUBLIC_APP_NAME="SIGAP BULOG"
```

> [!TIP]
> Jika menggunakan PostgreSQL lokal standar, port biasanya `5432`. Sesuaikan nomor port dan kredensial database Anda.

---

## 📦 Panduan Instalasi & Menjalankan

Ikuti langkah-langkah berikut untuk memasang dan menjalankan proyek secara lokal:

### 1. Kloning Repositori
```bash
git clone https://github.com/mhakimgf/bulog-sigap.git
cd bulog-sigap
```

### 2. Pasang Dependensi Node.js
Pastikan Anda menggunakan Node.js versi 18 atau 20+:
```bash
npm install
```

### 3. Siapkan Database & Prisma ORM
Pastikan PostgreSQL Anda sudah aktif, lalu jalankan sinkronisasi skema database:
```bash
# Generate Prisma Client
npx prisma generate

# Sinkronisasikan skema ke database PostgreSQL
npx prisma db push
```
*(Opsional: Anda dapat menggunakan `npx prisma studio` untuk melihat isi database melalui antarmuka web).*

### 4. Jalankan Server Development
```bash
npm run dev
```
Aplikasi akan aktif di alamat: `http://localhost:3000`

### 📱 Menjalankan Mode HTTPS (Khusus Akses Kamera HP)
Fitur pemindai kamera (QR Scanner) pada browser seluler membutuhkan koneksi aman (HTTPS). Jalankan perintah:
```bash
npm run dev:https
```
Lalu buka alamat IP lokal komputer Anda melalui browser HP (contoh: `https://192.168.1.10:3000`).

---

## 🧑‍💻 Panduan Penggunaan (User Guide)

### Akun Bawaan (Demo Credentials)
Gunakan kredensial berikut pada halaman Login (`/login`):

| Peran (Role) | Email | Kata Sandi | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@bulog.co.id` | `admin123` | Akses penuh seluruh sistem, manajemen pengguna, konfigurasi gudang. |
| **Kepala Gudang** | `hendra@bulog.co.id` | `bulog123` | Monitoring stok, otorisasi BASO, audit trail, alert masa simpan. |
| **Operator 1** | `budi@bulog.co.id` | `operator123` | Penerimaan barang (Inbound), pengeluaran (Outbound FIFO), scan stapel. |
| **Operator 2** | `siti@bulog.co.id` | `operator123` | Operasional pencatatan gudang & stock opname lapangan. |

---

### Alur Operasional Sistem

```mermaid
flowchart TD
    A["Truk Komoditas Datang"] --> B["Operator Scan QR Surat Jalan / DO"]
    B --> C["Pilih Stapel Matriks 4x3 yang Tersedia"]
    C --> D["Barang Tersimpan di Sistem & Fisik"]
    D --> E["Sistem Memantau Usia Simpan (FIFO Engine)"]
    E --> F{"Ada Perintah Distribusi?"}
    F -- Ya --> G["Sistem Merekomendasikan Stapel Paling Lama"]
    G --> H["Operator Scan Stapel Outbound"]
    F -- Rutin Bulanan --> I["Pelaksanaan Stock Opname Fisik"]
    I --> J["Input Hasil Hitung Fisik ke Sistem"]
    J --> K["Otomatisasi Hitung Variansi"]
    K --> L["Terbit Dokumen Berita Acara (BASO)"]
```

1. **Penerimaan Barang (Inbound)**:
   * Operator masuk ke menu **Penerimaan (Inbound)**.
   * Arahkan kamera HP ke QR Code surat jalan atau isi formulir muatan (komoditas, koli, berat, tanggal masuk).
   * Pilih lokasi stapel pada matriks visual (misal Blok A-2). Simpan transaksi.
2. **Pengeluaran Barang (Outbound FIFO)**:
   * Operator masuk ke menu **Pengeluaran (Outbound)**.
   * Sistem otomatis menyorot batch yang masuk paling awal (*First In, First Out*).
   * Masukkan jumlah koli yang dikeluarkan dan konfirmasi.
3. **Pemeriksaan Stapel Lapangan**:
   * Scan QR Code yang terpasang pada tiang stapel fisik untuk melihat isi batch, riwayat, dan masa simpan.
4. **Pelaksanaan Stock Opname & BASO**:
   * Kepala Gudang atau Tim Pemeriksa membuka menu **Stock Opname**.
   * Masukkan angka hasil perhitungan fisik di lapangan.
   * Sistem menampilkan selisih (*variance*). Tambahkan catatan penjelasan selisih jika ada.
   * Klik **Cetak / Ekspor Berita Acara (BASO)** untuk mengunduh dokumen resmi bertandatangan.

---

## 📁 Struktur Direktori

```text
bulog-sigap/
├── docs/                        # Dokumentasi teknis tambahan & ERD
│   ├── ERD-Database-Bulog.md    # Desain struktur entitas database
│   └── FASE_PENYELESAIAN_PROYEK.md # Rencana roadmap pengembangan
├── prisma/                      # Konfigurasi ORM & Skema Database
│   └── schema.prisma            # Model Prisma PostgreSQL
├── src/
│   ├── app/                     # Next.js 15 App Router
│   │   ├── (auth)/              # Route Group Autentikasi (Login)
│   │   ├── (dashboard)/         # Route Group Admin & Kepala Gudang (Dashboard, BASO, Opname, Audit)
│   │   ├── (operator)/          # Route Group Mobile Operator (Inbound, Outbound, Stapel, History)
│   │   ├── api/                 # Endpoint REST API (health, warehouse data)
│   │   ├── globals.css          # Desain global & utilitas Tailwind CSS v4
│   │   └── layout.jsx           # Root layout dengan provider context
│   ├── components/              # Komponen Modular React
│   │   ├── admin/               # Manajemen akun pengguna
│   │   ├── auth/                # Form autentikasi
│   │   ├── common/              # Scanner QR kamera, selector kustom, toast
│   │   ├── dashboard/           # Visual matriks gudang, modal BASO, opname
│   │   └── operator/            # Navigasi bawah HP, form inbound/outbound
│   ├── context/                 # State management (WarehouseContext)
│   └── data/                    # Initial seed data gudang CISKID & master komoditas
├── .env.example                 # Template variabel lingkungan
├── .gitignore                   # Konfigurasi ignore file Git
├── next.config.mjs              # Konfigurasi Next.js
└── package.json                 # Manifest dependensi & skrip proyek
```

---

## 🛡️ Keamanan & Kepatuhan Data

* Berkas kredensial `.env` serta berkas konfigurasi asisten `.agents` dijaga agar tidak terunggah ke repositori publik melalui proteksi `.gitignore`.
* Seluruh mutasi stok tercatat dalam *audit trail log* yang merekam ID pengguna, IP/perangkat, dan timestamp waktu nyata.

---

## 👥 Kontributor & Lisensi

Proyek ini dikembangkan untuk modernisasi tata kelola pergudangan dan logistik pangan Perum BULOG.

* **Pengembang Utama / Repository Owner**: [@mhakimgf](https://github.com/mhakimgf)
* **Lisensi**: [MIT License](LICENSE) — Silakan gunakan dan kembangkan untuk kemajuan pengelolaan pangan Indonesia.
