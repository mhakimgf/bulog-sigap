# 📊 Entity Relationship Diagram (ERD) — Database SIGAP BULOG
**Sistem Inventaris Pergudangan & Stock Opname Terpadu Perum Bulog**

Dokumen ini merangkum arsitektur basis data relasional PostgreSQL untuk sistem pergudangan SIGAP BULOG, mencakup hierarki fasilitas (Kompleks CISKID), penataan fisik stapel 4x3, pelacakan masa simpan komoditas, mutasi stok, serta dokumen resmi Berita Acara Stock Opname (BASO).

---

## 1. Visualisasi Diagram Hubungan Antar Entitas (ERD)

```mermaid
erDiagram
    WAREHOUSE ||--o{ WAREHOUSE_UNIT : "memiliki gedung"
    WAREHOUSE ||--o{ STAPEL : "mencakup stapel"
    WAREHOUSE_UNIT ||--o{ STAPEL : "mengatur baris & kolom"
    STAPEL ||--o{ BATCH : "menyimpan muatan fisik"
    COMMODITY ||--o{ BATCH : "mengklasifikasikan jenis barang"
    STAPEL ||--o{ TRANSACTION : "mencatat mutasi fisik"
    USER ||--o{ TRANSACTION : "dieksekusi oleh operator"
    WAREHOUSE ||--o{ BASO_REPORT : "menghasilkan laporan opname"
    USER ||--o{ BASO_REPORT : "ditandatangani oleh pejabat"

    USER {
        string id PK "cuid()"
        string name "Nama Lengkap Karyawan"
        string email UK "Email resmi bulog.co.id"
        string nip UK "Nomor Induk Pegawai"
        string password "Hashed Password"
        string role "superadmin | kepala_gudang | operator"
        string unitGudang "Unit Penempatan (GBB CISKID)"
        string status "aktif | nonaktif"
        datetime lastLogin "Waktu Login Terakhir"
        datetime createdAt
        datetime updatedAt
    }

    WAREHOUSE {
        string id PK "wh-ciskid"
        string code UK "GBB-CISKID"
        string name "Nama Kompleks Pergudangan"
        string singkatan "CISKID"
        string kanwil "Kanwil Jawa Barat"
        string kancab "Kantor Cabang Bandung"
        string address "Alamat Fisik Gudang"
        string kepalaGudang "Nama Kepala Gudang Aktif"
        string nipKepalaGudang "NIP Kepala Gudang"
        float totalCapacityTon "Kapasitas Total Kompleks (Ton)"
        string activeGudang "Gudang Default (Gudang 1)"
        datetime createdAt
        datetime updatedAt
    }

    WAREHOUSE_UNIT {
        string id PK "G1, G2, G3, G4, G5"
        string warehouseId FK
        string name "Gudang 1 s/d Gudang 5"
        string layoutType "vertical (4x3) | horizontal (3x4)"
        float capacityTonase "Kapasitas Gedung (600 Ton)"
        datetime createdAt
        datetime updatedAt
    }

    STAPEL {
        string id PK "G1-A1 s/d G5-C4"
        string warehouseId FK
        string unitId FK
        string gudang "Gudang 1"
        string block "A | B | C"
        int number "1, 2, 3, 4"
        string name "Nama Tumpukan (Stapel A2)"
        int capacityKoli "Kapasitas Maksimal (1000 Koli)"
        string status "kosong | sebagian | penuh | nonaktif"
        datetime createdAt
        datetime updatedAt
    }

    COMMODITY {
        string id PK "beras-medium | beras-premium | dll"
        string name "Nama Resmi Komoditas Pangan"
        string category "Beras | Minyak Goreng | Gula | Tepung"
        string defaultUnit "Karung | Jerigen"
        float defaultWeight "Bobot Standar per Koli (Kg)"
        int maxShelfLifeDays "Batas Umur Simpan (misal 180 hari)"
        string icon "Material Icon Identitas"
        string color "Kode Warna Visual"
        datetime createdAt
        datetime updatedAt
    }

    BATCH {
        string id PK "cuid()"
        string stapelId FK
        string commodityId FK
        string batchNo "Nomor Batch Unik (#09, #14)"
        string brand "Merk Kemasan Fisik"
        int koli "Kuantum Kemasan Tersisa"
        string unit "Karung | Jerigen"
        float weightPerUnitKg "Bobot per Unit (50 kg)"
        datetime dateIn "Tanggal Masuk Fisik (Dasar Masa Simpan)"
        datetime expiryDate "Tanggal Kedaluwarsa (opsional)"
        string origin "Asal Pasokan / Penggilingan"
        string suratJalan "Nomor Surat Jalan Masuk"
        string kondisi "Baik | Perlu Fumigasi | Rusak"
        string notes "Catatan Tambahan Mutu"
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        string id PK "cuid() / TRX-YYYYMMDD-XXX"
        string type "MASUK | KELUAR | PENYESUAIAN"
        string stapelId FK
        string gudang "Gudang Lokasi Kejadian"
        string commodityName "Nama Komoditas"
        string brand "Merk Barang"
        int koli "Jumlah Kemasan yang Dimutasi"
        string unit "Satuan Kemasan"
        float weightPerUnitKg "Bobot per Satuan"
        float totalKg "Total Tonase Mutasi (Kg)"
        string operator "Nama Operator Lapangan"
        string userId FK "ID Akun Operator"
        string suratJalan "Nomor SJ Inbound / DO Outbound"
        string sourceOrDest "Pemasok / Tujuan Penyaluran"
        datetime timestamp "Waktu Transaksi Nyata"
        boolean isOffline "True jika dicatat offline di lorong"
        string notes "Catatan / Alasan Penyaluran Khusus"
        datetime createdAt
    }

    BASO_REPORT {
        string id PK "cuid()"
        string reportNumber UK "BA-SO/CISKID/YYYY/MM/XXX"
        string warehouseId FK
        datetime periodDate "Tanggal Pelaksanaan Stock Opname"
        float totalTonase "Total Tonase Fisik Terverifikasi"
        int totalKoli "Total Koli Terhitung"
        int stapelCount "Jumlah Stapel Aktif Diperiksa"
        float accuracyRate "Persentase Akurasi Fisik vs Buku"
        string signedBy "Kepala Gudang Penandatangan"
        string signerNip "NIP Penandatangan"
        string createdById FK
        string pdfUrl "Tautan Arsip Dokumen PDF"
        datetime createdAt
    }
```

---

## 2. Rincian Kamus Data (Data Dictionary)

### A. Tabel `users` (Manajemen Pengguna & Hak Akses)
Tabel ini mengelola kredensial dan hak akses berbasis peran (RBAC) sesuai hierarki operasional Bulog:
- `superadmin`: Akses penuh ke seluruh kompleks gudang, menu Atur Akun, audit log, dan pengaturan sistem.
- `kepala_gudang`: Monitoring dashboard denah 2D, pelacakan masa simpan, ekspor dan pengesahan dokumen BASO.
- `operator`: Alur mobile lapangan (scan barcode/QR inbound, pencatatan penyaluran stok, pencarian tumpukan).

### B. Tabel `warehouses` & `warehouse_units` (Fasilitas Pergudangan)
- `warehouses`: Merepresentasikan kantor cabang dan kompleks pergudangan (Kompleks CISKID Bandung).
- `warehouse_units`: Merepresentasikan 5 bangunan fisik gudang di dalam kompleks CISKID (Gudang 1 hingga Gudang 5) dengan kapasitas masing-masing 600 Tonase.

### C. Tabel `stapels` (Matriks Tumpukan 2D)
Menyimpan posisi geometris 4x3 pada setiap unit gedung:
- Blok A (Baris Utara / Merah Muda): Stapel A4, A3, A2, A1
- Blok B (Baris Tengah / Kuning): Stapel B4, B3, B2, B1
- Blok C (Baris Selatan / Hijau): Stapel C4, C3, C2, C1
- Kapasitas standar: 1.000 Koli per stapel (Total 4.000 Koli per blok atau 12.000 Koli per gedung).

### D. Tabel `commodities` & `batches` (Komoditas & Umur Simpan)
- `commodities`: Master jenis pangan strategis Perum Bulog (Beras Medium SPHP CBP, Beras Premium Kita, Minyakita 5L, Gula Manis Kita, Terigu Kita).
- `batches`: Menyimpan detail setiap lot kedatangan barang. Field `dateIn` adalah kunci utama untuk menghitung **Masa Simpan (Aging Days)**:
  - `0 - 89 hari`: Status **Optimal** (Hijau)
  - `90 - 149 hari`: Status **Perlu Monitoring** (Kuning)
  - `150 - 180 hari`: Status **Prioritas Salur** (Oranye - Wajib didahulukan pengeluarannya)
  - `> 180 hari`: Status **Melewati Batas Simpan** (Merah - Perlu uji mutu laboratorium/fumigasi)

### E. Tabel `transactions` (Log Mutasi & Audit Trail)
Mencatat seluruh arus pergerakan barang secara detail:
- Tipe `MASUK`: Penerimaan dari pemasok/mitra penggilingan Karawang, Subang, dll.
- Tipe `KELUAR`: Penyaluran untuk Operasi Pasar, Bantuan Pangan, atau Delivery Order (DO).
- Menyimpan flag `isOffline` untuk mendeteksi transaksi yang dicatat saat operator berada di lorong gudang tanpa sinyal WiFi/GSM.

### F. Tabel `baso_reports` (Berita Acara Stock Opname)
Menyimpan arsip formal berita acara pemeriksaan fisik periodik yang ditandatangani oleh Kepala Gudang dan Tim Pemeriksa Fisik.

---

## 3. Strategi Indexing & Performa Query (PostgreSQL)

Untuk menjamin performa cepat pada jutaan baris mutasi stok Bulog:
1. `CREATE INDEX idx_batches_datein ON batches(dateIn);` — Mempercepat query prioritas penyaluran stok terlama.
2. `CREATE INDEX idx_stapels_gudang_block ON stapels(gudang, block);` — Mempercepat render denah 2D 4x3 secara instan.
3. `CREATE INDEX idx_transactions_stapel_time ON transactions(stapelId, timestamp DESC);` — Mempercepat riwayat kartu stok per tumpukan.
