# Qaireen Collection — E-Commerce Fashion

Platform e-commerce fashion (*single-store retail*) berbasis arsitektur **Modular Monolith** untuk backend API dan **Next.js App Router** untuk storefront & portal admin/gudang.

---

## Ringkasan Fitur Utama

- **Storefront Pelanggan (`customer`)**: Katalog produk & kategori hirarkis, halaman detail produk (varian warna/ukuran & panduan ukuran), keranjang belanja, checkout dengan kalkulasi ongkir di server, pembayaran via **Midtrans Snap** (serta mode simulasi saat API key kosong), pelacakan resi pengiriman, pengajuan retur (jendela 14 hari), serta ulasan produk terverifikasi & feedback pesanan.
- **Portal Admin (`admin`)**: Manajemen identitas toko, kategori, produk, varian matriks (SKU, ukuran, warna, berat), unggah multi-gambar produk, promosi & kupon (diskon persentase, nominal tetap, gratis ongkir), manajemen pesanan, pengiriman, persetujuan retur, moderasi ulasan, serta laporan ringkasan penjualan & inventori.
- **Portal Gudang (`warehouse`)**: Manajemen multi-gudang, pelacakan stok fisik (`quantity_on_hand`, `quantity_reserved`, `quantity_available`), penerimaan barang, penyesuaian stok opname, dan buku besar mutasi stok (*immutable*).

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| **Backend API** | Laravel 13 (`^13.17`), PHP `^8.3`, Laravel Sanctum `^4.3` |
| **Frontend Web** | Next.js (`^16.4.6`), React (`^19.3.1`), TypeScript `^5`, Tailwind CSS v4, Zustand `^5.0.16`, Axios `^1.21.0` |
| **Database** | PostgreSQL (`pgsql`, UUID Primary Keys) |
| **Pembayaran** | Midtrans Snap (mendukung mode simulasi) |
| **Pengiriman** | RajaOngkir Pro (mendukung mode simulasi) |

---

## Struktur Proyek

```text
web-ecomm/
├── backend/                        # Laravel 13 Modular Monolith API (/api/v1)
│   └── app/Modules/
│       ├── Auth/                   # Autentikasi Sanctum & role middleware
│       ├── Catalog/                # Toko, kategori, produk, varian, gambar, size guide
│       ├── Feedback/               # Ulasan produk & feedback pesanan
│       ├── Inventory/              # Gudang, stok, penerimaan, penyesuaian, mutasi
│       ├── Order/                  # Keranjang, alamat, checkout, pembayaran, pengiriman, retur
│       ├── Promotion/              # Promosi & kupon diskon
│       └── Report/                 # Laporan ringkasan, tren penjualan, & inventori
├── frontend/                       # Next.js 16 Storefront & Portal Admin/Warehouse
├── PRD_DAN_KONSEP_BISNIS.md        # Dokumen PRD & spesifikasi bisnis lengkap
├── start-postgres.bat              # Helper start PostgreSQL lokal (Windows)
└── stop-postgres.bat               # Helper stop PostgreSQL lokal (Windows)
```

---

## Cara Menjalankan di Lokal

### Prasyarat
- PHP `>= 8.3` & Composer
- Node.js & npm
- PostgreSQL

### 1. Setup Backend (`backend/`)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Sesuaikan konfigurasi database dan URL di `backend/.env` (lihat `backend/.env.example`):
```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=web_ecomm
DB_USERNAME=postgres
DB_PASSWORD=your_password
```
> **Catatan:** Kredensial `MIDTRANS_SERVER_KEY` dan `RAJAONGKIR_API_KEY` boleh dibiarkan kosong saat pengembangan lokal untuk menjalankan mode simulasi pembayaran & ongkir.

Lalu jalankan migrasi, storage link, dan server API:
```bash
php artisan migrate --seed
php artisan storage:link
php artisan serve
```
API akan berjalan di `http://localhost:8000` (prefix `/api/v1`).

### 2. Setup Frontend (`frontend/`)
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Pastikan variabel environment frontend (`frontend/.env.local`) mengarah ke URL backend API yang sesuai, lalu buka `http://localhost:3000` di browser.

### 3. Menjalankan Pengujian Backend
```bash
cd backend
composer test
```

---

## Dokumentasi Tambahan

Detail spesifikasi produk, skema 24 tabel database, role pengguna, dan logika bisnis lengkap tersedia di [PRD_DAN_KONSEP_BISNIS.md](./PRD_DAN_KONSEP_BISNIS.md).
