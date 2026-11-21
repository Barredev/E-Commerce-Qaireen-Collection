# DOKUMEN SPESIFIKASI PRODUK (PRD) & KONSEP BISNIS
## Qaireen Collection — Toko E-Commerce Fashion Tunggal (*Single-Store Retail*)

> **Nama platform:** `Qaireen Collection`
> Sumber tunggal di frontend (`frontend/src/lib/constants.ts` → `SITE_NAME`) dan backend (`APP_NAME` di `.env`). Komponen dan view dilarang menulis nama toko secara literal.
>
> **Status dokumen:** Dokumen ini mencerminkan kondisi **terkini** aplikasi setelah konversi dari marketplace multi-brand menjadi toko tunggal (**Milestone 13**), penambahan sistem ulasan terverifikasi (**Tahap 15**), dan redesign antarmuka *fast-fashion* monokrom (**Tahap 16**). Seluruh fitur konsinyasi/mitra yang sudah dipensiunkan dipindahkan ke ringkasan arsip di bagian akhir agar spesifikasi aktif tetap bersih.

---

## 1. KONSEP BISNIS

### 1.1 Model Bisnis (*Single-Store Fashion Retail*)
**Qaireen Collection** adalah toko e-commerce fashion tunggal (*satu toko, banyak produk*). Seluruh stok yang dijual merupakan persediaan milik toko sendiri — tidak ada titipan pihak ketiga, tidak ada bagi hasil komisi, dan tidak ada pencairan dana (*settlement*) ke mitra.

- **Satu identitas toko (`brands`)**: Tabel `brands` menyimpan tepat satu baris (`Qaireen Collection`, slug `qaireen-collection`) sebagai identitas internal toko (logo, banner, deskripsi, meta SEO). Baris ini dipertahankan agar `products.brand_id` tetap konsisten tanpa migrasi ulang data; **konsep brand tidak pernah ditampilkan ke pembeli** sebagai entitas terpisah.
- **Modal & margin penuh**: Seluruh persediaan dibeli/diproduksi sendiri sehingga margin kotor dan HPP (COGS) dikelola sepenuhnya oleh toko.
- **Kontrol penuh**: Penetapan harga, promo/kupon, standar kurasi produk, logistik, dan layanan purna jual berada di satu tangan.

### 1.2 Value Proposition
- **Bagi Konsumen (`customer`)**: Katalog terkurasi dari satu toko, satu keranjang, satu kali checkout, satu tarif ongkir, serta standar kualitas dan layanan purna jual (retur 14 hari & ulasan terverifikasi) yang konsisten.
- **Bagi Pemilik Toko (`admin` / `warehouse`)**: Margin penuh dari setiap penjualan, kontrol harga dan kampanye promo 100%, manajemen inventori multi-gudang dengan buku besar mutasi immutable, serta laporan penjualan dan stok yang langsung akurat tanpa rekonsiliasi pihak ketiga.

### 1.3 Alur Keuangan
1. Pelanggan membayar 100% nilai pesanan (`grand_total`) melalui **Midtrans Snap** (atau kanal terkonfigurasi lainnya seperti `bank_transfer` / `cod`).
2. Dana masuk ke rekening toko.
3. **Laba Kotor** dihitung dari `Σ(order_items.line_total)` dikurangi HPP barang terjual.
4. **Retur disetujui** mengembalikan dana ke pelanggan secara proporsional terhadap `order_items.line_total` dan mengembalikan unit berstatus `good` ke stok gudang.
5. **Pajak**: Tidak ada pemotongan PPh 23 atas komisi jasa karena tidak ada komisi pihak ketiga; kewajiban pajak toko mengikuti ketentuan perpajakan umum di luar cakupan aplikasi.

---

## 2. ARSITEKTUR & STACK TEKNOLOGI

| Lapisan | Teknologi & Konvensi Utama |
|---|---|
| **Backend API** | Laravel 13 (`^13.17`), PHP `^8.3`, Laravel Sanctum `^4.3` (token-based auth). Arsitektur **Modular Monolith** (`app/Modules/*`), seluruh `routes.php` modul otomatis dimuat di bawah prefix `/api/v1` oleh `App\Providers\ModuleServiceProvider`. |
| **Database** | PostgreSQL 16 — UUID Primary Keys, relasi integritas referensial, kolom `jsonb` (manifest pelacakan resi), dan `smallint`/index komposit untuk analitik ulasan. |
| **Frontend Web** | Next.js `16.4.3` (App Router, `cacheComponents: true`, `partialPrefetching: true`, Turbopack), React `19.3.0`, TypeScript `^5`, Tailwind CSS v4 (`@tailwindcss/turbopack`), Zustand `^5.0.16`, Axios `^1.21.0`. |
| **Pembayaran** | Midtrans Snap (`PaymentGatewayInterface` → `MidtransPaymentGateway`) dengan verifikasi signature SHA512, ditambah mode simulasi aman saat kredensial kosong. |
| **Logistik** | RajaOngkir Pro (`ShippingProviderInterface` → `RajaOngkirShippingService`) untuk tarif JNE/SiCepat/J&T dan pelacakan resi (*waybill*), ditambah mode simulasi offline. |
| **CORS & Auth Dev** | Konfigurasi CORS multi-origin dev (`localhost:3000`, `127.0.0.1:3000`, `localhost:3001`, `127.0.0.1:3001`, pola port `3000–3002`). |

---

## 3. ROLE & HAK AKSES PENGGUNA

Sistem menggunakan satu mekanisme autentikasi **Laravel Sanctum** dengan pembedaan hak akses melalui kolom `users.role` (`UserRole` enum) yang dijaga middleware `RoleMiddleware` (alias `role`).

| Role | Domain Akses | Hak Akses Utama |
|---|---|---|
| `customer` | Etalase Publik (`/`, `/products`, `/categories`, `/cart`, `/checkout`) & Akun (`/account/*`) | Belanja, kelola alamat pengiriman, checkout, pembayaran, pantau status pesanan & resi, ajukan retur, serta kirim ulasan produk & feedback layanan. |
| `admin` | Portal Admin (`/admin/*`) | Akses penuh: identitas toko, kategori, produk, varian, gambar, gudang, stok, penerimaan & penyesuaian barang, pesanan, pengiriman, retur, promosi/kupon, moderasi ulasan, dan laporan analitik. |
| `warehouse` | Portal Inventori (`/admin/inventory/*`) | Operasional gudang: memantau stok fisik (`stocks`), mencatat penerimaan barang (`receipts`), memantau buku besar mutasi (`movements`), dan melakukan penyesuaian stok opname (`adjustments`). |

---

## 4. SPESIFIKASI FITUR AKTIF PER MODUL

### 4.1 Katalog Produk & Identitas Toko (`App\Modules\Catalog`)
- **Identitas Toko (`brands`)**: Satu baris aktif (`Qaireen Collection`) untuk metadata internal toko; dikelola admin via `/api/v1/admin/brands`. Halaman publik `/brands` dan `/brands/[slug]` dipertahankan sebagai *redirect stub* ke `/products` agar tautan lama tidak menghasilkan 404.
- **Kategori Hirarkis (`categories`)**: Struktur pohon parent-child tak terbatas (`parent_id`), mendukung filter katalog dan halaman indeks `/categories` serta `/categories/[slug]`.
- **Produk & Varian Matriks (`products` & `product_variants`)**:
  - Produk induk menyimpan nama, slug unik otomatis (`GeneratesSlug`), deskripsi, material, petunjuk perawatan, `base_price`, dan flag `is_featured`.
  - Varian menyimpan SKU unik, `size`, `color`, kode warna HEX, harga jual varian, dan `weight_grams` (dipakai untuk kalkulasi ongkir).
  - Unik di level database pada kombinasi `(product_id, size, color)`.
- **Manajemen Media (`product_images`)**:
  - Multi-gambar per produk dengan `sort_order`, `is_primary`, dan relasi opsional `variant_id`.
  - Mendukung **unggah berkas langsung** (`FormData` ke `POST /api/v1/admin/products/{product}/images`, disimpan ke disk `public` `/storage/products/`, batas 5 MB) serta opsi fallback menempelkan URL gambar.
  - Saat pembuatan produk baru di admin, produk dibuat terlebih dahulu lalu berkas gambar diunggah; jika unggahan gagal di tengah jalan, formulir menampilkan tautan pemulihan ke halaman edit agar tidak tercipta produk duplikat.
- **Panduan Ukuran (`size_guides`)**: Tabel referensi ukuran per produk atau global toko yang ditampilkan di modal panduan ukuran pada Halaman Detail Produk (PDP).
- **Endpoint Utama**:
  - Publik: `GET /api/v1/categories`, `GET /api/v1/categories/{category:slug}`, `GET /api/v1/products`, `GET /api/v1/products/{product:slug}`.
  - Admin: `apiResource` untuk `brands`, `categories`, `products`, serta sub-resource `variants` dan `images` (`reorder`, `store`, `destroy`).

### 4.2 Inventori & Multi-Gudang (`App\Modules\Inventory`)
- **Master Gudang (`warehouses`)**: Kode unik, alamat, kota, flag aktif, dan penanda gudang utama (`is_default`). Data dasar (`GDG-JKT` default & `GDG-SBY`) di-seed otomatis oleh `CatalogSeeder::WAREHOUSES` sehingga checkout selalu memiliki gudang aktif tanpa bergantung pada data demo historis.
- **Stok Fisik (`inventory_stocks`)**:
  - Satu pool stok per kombinasi unik `(variant_id, warehouse_id)`.
  - Kolom pelacakan: `quantity_on_hand` (fisik di rak), `quantity_reserved` (dikunci pesanan `pending_payment`), `quantity_available` (`on_hand - reserved`), dan `low_stock_threshold`.
- **Penerimaan Barang (`stock_receipts` & `stock_receipt_items`)**:
  - Sumber penerimaan: `production`, `purchase`, `return`, `transfer_in`.
  - Validasi kondisi barang (`good` / `damaged`), status `draft` → `confirmed` / `cancelled`, audit user penerima (`received_by`), serta penambahan `quantity_on_hand` dan pencatatan mutasi secara transaksional saat konfirmasi.
- **Penyesuaian Stok Manual (`stock_adjustments`)**: Koreksi stok opname langsung dengan alasan tertulis dan pencatatan penanggung jawab (`admin` / `warehouse`).
- **Buku Besar Mutasi (`stock_movements`)**: Ledger immutable untuk setiap perubahan stok (`in`, `sale`, `reserve`, `release`, `return_in`, `adjustment`, dll.) lengkap dengan `balance_after`.

### 4.3 Transaksi, Checkout, Pembayaran & Pengiriman (`App\Modules\Order`)
- **Keranjang Belanja (`carts` & `cart_items`)**: Mendukung pengecekan ketersediaan stok realtime saat tambah/ubah kuantitas; satu keranjang untuk satu checkout.
- **Alamat Pelanggan (`addresses`)**: Multi-alamat per pelanggan dengan `is_default` dan `rajaongkir_destination_id` (kota/kecamatan tujuan pengiriman).
- **Checkout & Snapshot Data (`CheckoutService`)**:
  - Memvalidasi stok aktif di gudang default; jika tidak ada gudang aktif, mengembalikan pesan error yang mengarahkan admin ke menu Gudang.
  - Mengunci stok dengan menambah `quantity_reserved`.
  - Membekukan snapshot pada `order_items` (nama produk, SKU, ukuran, warna, harga satuan, diskon, serta `brand_id`/`brand_name` historis) agar perubahan katalog di masa depan tidak mengubah histori transaksi.
  - Ongkir **selalu dihitung ulang di server** dari total `weight_grams` varian (minimal 1 kg) dan tujuan alamat lewat `ShippingProviderInterface`.
- **Mesin Status Pesanan (`OrderStatus`)**:
  `pending_payment` → `paid` → `processing` → `shipped` → `delivered` → `completed` (dengan cabang terminal `cancelled` dan `refunded`).
- **Auto-Expire Pesanan Belum Dibayar (`OrderService::expireUnpaidOrders`)**:
  - Menyapu pesanan `pending_payment` yang `payments.expired_at`-nya terlewati menggunakan `lazyById(100)` dan `lockForUpdate()` per transaksi.
  - Mengubah status payment menjadi `expired` sebelum membatalkan order (agar tidak tertimpa menjadi `failed`), melepas `quantity_reserved`, dan mencatat alasan `"Pembayaran kedaluwarsa."`.
  - Terdaftar pada perintah Artisan `orders:expire-unpaid` yang dijadwalkan **setiap jam (`hourly()`)** di `routes/console.php`.
- **Integrasi Pembayaran (`MidtransPaymentGateway`)**:
  - Mode asli (ketika `MIDTRANS_SERVER_KEY` terisi): memanggil Snap API, menggunakan `mb_substr()` untuk nama item UTF-8, menambahkan baris `ADJUSTMENT` bila selisih pembulatan item ≠ `grand_total`, dan mengarahkan callback ke `{FRONTEND_URL}/account/orders/{order_number}`.
  - Snap token dan redirect URL disimpan di `payments.gateway_response` (`{snap_token, snap_redirect_url}`) dan **dipakai ulang** selama transaksi masih pending & belum kedaluwarsa. `payments.gateway_transaction_id` hanya diisi `transaction_id` asli dari webhook Midtrans.
  - Kegagalan gateway melempar `PaymentGatewayException` → respons HTTP **503** yang aman tanpa membuat token palsu.
  - Mode simulasi (saat key kosong): mengembalikan `is_simulated = true` tanpa URL Midtrans palsu; UI menampilkan tombol **Simulasi Bayar Lunas** (`POST /account/orders/{order_number}/simulate-pay`, yang mengembalikan **403** apabila gateway asli sudah dikonfigurasi).
- **Pengiriman & Pelacakan Resi (`shipments`, `ShippingService`, `ShipmentTrackingService`)**:
  - Layanan pilihan checkout dibekukan pada `orders.courier_code`, `courier_name`, `courier_service`, dan `shipping_destination_id`.
  - Saat admin mengirim pesanan (`POST /admin/orders/{order}/ship`), stok fisik `quantity_on_hand` dan `quantity_reserved` dikurangi dengan mencatat `stock_movements` bertipe `sale`.
  - Manifest perjalanan paket disimpan di `shipments.tracking_history` (`jsonb`) dan `last_tracked_at`, diperbarui melalui webhook (`POST /api/v1/webhooks/shipping/tracking`) atau tarikan manual admin (`POST /api/v1/admin/shipments/{shipment}/track`), dan otomatis memajukan pesanan menjadi `delivered` saat paket tiba.

### 4.4 Retur & Pengembalian Dana (`App\Modules\Order` — `ReturnService`)
- **Syarat Pengajuan**: Hanya oleh pemilik pesanan pada pesanan berstatus `delivered` atau `completed` dalam jendela seragam **14 hari** (`DEFAULT_RETURN_WINDOW_DAYS`) sejak `delivered_at`.
- **Alasan & Kuota**:
  - Alasan (`ReturnReason`): `wrong_item`, `damaged`, `not_as_described`, `size_mismatch`, `changed_mind`, `other`.
  - Kuota per `order_item` dihitung dari seluruh retur aktif (`requested`, `approved`, `received`, `refunded`) agar unit yang sama tidak diretur ganda; retur `rejected` atau `cancelled` mengembalikan kuota.
- **Siklus Status (`ReturnStatus`)**: `requested` → `approved` → `received` → `refunded` (cabang: `rejected`, dan `cancelled` hanya saat `requested` oleh pemilik).
- **Verifikasi Gudang & Refund**:
  - Nilai refund per baris dihitung proporsional terhadap `order_items.line_total`.
  - Barang diterima dengan kondisi `good` otomatis masuk kembali ke stok via mutasi `return_in` (`reference_type = 'return_item'`); kondisi `damaged` tercatat tanpa menambah `quantity_on_hand`.
  - Retur yang mencakup seluruh kuantitas pesanan otomatis memindahkan `orders.status` ke `refunded` dan mengisi `orders.refunded_at`; retur parsial membiarkan pesanan tetap `completed`.

### 4.5 Promosi & Kupon (`App\Modules\Promotion`)
- **Jenis Promosi (`PromotionType`)**: Diskon persentase, diskon nominal tetap (*flat*), dan gratis ongkos kirim (*free shipping*).
- **Validasi & Penerapan**:
  - Endpoint publik `GET /api/v1/promotions` (`limit` 1–20) mengembalikan promo yang aktif, berada dalam rentang `starts_at`/`ends_at`, dan masih memiliki kuota `usage_limit`.
  - Endpoint checkout `POST /api/v1/checkout/apply-coupon` menghitung pratinjau diskon kupon sebelum checkout final.
  - Manajemen CRUD & `PATCH /api/v1/admin/promotions/{id}/toggle-active` di portal admin.

### 4.6 Ulasan Produk & Feedback Pesanan (`App\Modules\Feedback`)
- **Desain Data Analitik (Tanpa Dashboard Grafik Khusus)**:
  - Dipisah menjadi dua tabel ternormalisasi dengan kolom aspek eksplisit (`smallint`/`varchar`, bukan JSON bebas) agar query `AVG()` / `GROUP BY` / distribusi dapat langsung dijalankan kapan saja:
    1. `product_reviews` — 1 ulasan per `order_item_id` (**unique**): `rating` (1–5 wajib), `comment`, `material_rating` (1–5 opsional), `size_fit` (`SizeFit` enum: `too_small` / `fit` / `too_large`), `is_hidden`, `hidden_at`, `hidden_reason`, `softDeletes`.
    2. `order_feedback` — 1 feedback per `order_id` (**unique**): `shipping_rating` (1–5 opsional), `service_rating` (1–5 opsional), `comment`.
- **Aturan Gating & Keamanan (`FeedbackService`)**:
  - Seluruh penulisan dibungkus transaksi dengan `Order::query()->lockForUpdate()`.
  - Hanya pemilik pesanan (404 jika pesanan milik orang lain) pada status `delivered` atau `completed` (pelanggaran status dibalas HTTP **422** pada key `status`).
  - `product_id` diturunkan server-side dari `order_items.variant_id` via `ProductVariant::withTrashed()`.
- **Privasi & Moderasi**:
  - `ProductReviewResource` menyamarkan nama pembeli (`"A*** B***"`); nama lengkap dan email hanya muncul di `AdminReviewResource`.
  - Publikasi langsung (`is_hidden = false`); admin dapat menyembunyikan/menampilkan ulang via `PATCH /api/v1/admin/reviews/{review}/toggle-visibility`. Ulasan tersembunyi otomatis dikeluarkan dari ringkasan publik (`average_rating`, `rating_distribution` `"5"`..`"1"`, `material_average`, `fit_distribution`).

### 4.7 Laporan & Analitik (`App\Modules\Report`)
Halaman laporan admin (`/admin/reports`) menyediakan 3 tab utama yang didukung endpoint berikut:
1. **Ringkasan** (`GET /api/v1/admin/reports/overview`) — KPI penjualan, pesanan, pelanggan, dan ringkasan performa toko.
2. **Tren Penjualan** (`GET /api/v1/admin/reports/sales`) — Grafik batang SVG kustom (`SalesTrendChart.tsx` dengan tooltip hover, gridline hairline, dan tabel data aksesibel di bawahnya).
3. **Inventori** (`GET /api/v1/admin/reports/inventory`) — Ringkasan valuasi/ketersediaan stok, produk stok menipis (*low stock*), dan pergerakan stok gudang.

### 4.8 Desain UI/UX Etalase & Portal (Tahap 16)
- **Arah Visual (*Fast-Fashion Monochrome*)**:
  - Token desain (`frontend/src/app/globals.css`): kanvas `#ffffff`, foreground `#000000`, permukaan sekunder `#f5f5f5`, border tajam `#e5e5e5`, aksen promo/diskon `#e11d48` (`--danger`), dukungan otomatis `prefers-color-scheme: dark`, sudut geometris tajam (`--radius-xs: 0px` .. `--radius-lg: 4px`), serta elevasi `--elevation-soft` / `--elevation-lift`.
  - Tipografi (`frontend/src/app/layout.tsx`): `Montserrat` (`--font-display`, weight 500–900) untuk headline kapital tebal dan `Geist` / `Geist_Mono` untuk teks isi dan angka `tabular-nums`.
  - Primitif UI mandiri tanpa library UI eksternal (`components/ui/*`: `Alert`, `Badge`, `Button`, `EmptyState`, `Field`, `Modal`, `SectionHeading`, `Spinner`).
- **Permukaan Storefront**:
  - **Header (`Navbar.tsx`)**: `TopUrgencyBanner` dengan *live countdown timer* & rotasi ticker promo, kolom pencarian produk, wordmark kapital tebal, ikon akun/keranjang, dan navigasi kategori cepat.
  - **Beranda (`page.tsx` & `HomeHero.tsx`)**: Billboard MEGA SALE, kupon promo 1-klik salin kode (`PromotionCards.tsx`), ubin kategori visual, produk unggulan/terlaris, produk terbaru, dan spanduk penawaran.
  - **Katalog & Kartu Produk (`ProductCard.tsx` & `ProductGrid.tsx`)**: Grid 4 kolom responsif, rasio gambar potret **2:3** (`aspect-[2/3]`), badge diskon merah, badge `BEST SELLER`, dan overlay hover desktop `"LIHAT DETAIL"`.
  - **Halaman Detail Produk (`ProductDetail.tsx`)**: Layout 2 kolom — galeri 2:3 + strip thumbnail di kiri, *sticky buy-box* di kanan (indikator urgensi stok, swatch warna hex, selector ukuran 4 kolom, modal panduan ukuran, tombol penuh ADD TO BAG, bilah garansi, akordeon detail/perawatan), diikuti blok ulasan `ProductReviewsSection.tsx`.
  - **Keranjang & Checkout (`CartView.tsx`, `CheckoutView.tsx`)**: Progress bar gratis ongkir dinamis (`FREE_SHIPPING_THRESHOLD = Rp 250.000`), ringkasan *sticky*, checkout 3 langkah bernomor (alamat, kurir/ongkir, kupon & metode bayar).
  - **Akun & Bantuan**: Halaman akun (`/account`, `/account/orders`, `/account/orders/[orderNumber]`, `/account/addresses`, `/account/returns`) lengkap dengan modal retur dan modal feedback/ulasan (`ReviewFormModal.tsx`); halaman informasi statis `/bantuan` dengan 6 anchor (`cara-pesan`, `pengiriman`, `retur`, `kontak`, `privasi`, `syarat`); footer 5 kolom dengan form VIP Member Club dan ikon kanal pembayaran (BCA, Mandiri, BNI, QRIS, COD).

---

## 5. STRUKTUR DATABASE (24 TABEL APLIKASI)

> Total **24 tabel aplikasi** (di luar 9 tabel bawaan framework Laravel seperti `migrations`, `cache`, `jobs`, `sessions`, `personal_access_tokens`, dll.).

```
[users]
   ├──< [addresses]
   ├──< [carts] (user_id nullable — cart tamu) ──< [cart_items] >── [product_variants]
   └──< [orders]
         ├──< [order_items] ──< [product_reviews]
         ├──< [payments]
         ├──< [shipments]
         ├──< [returns] ──< [return_items] >── [order_items]
         └──< [order_feedback]

[brands] (1 baris identitas toko internal)
   ├──< [products]
   │      ├──< [product_variants]
   │      │      ├──< [inventory_stocks] >── [warehouses]
   │      │      └──< [stock_movements]  >── [warehouses]
   │      └──< [product_images]   (variant_id → product_variants, nullable)
   └──< [size_guides] >── [products]   (brand_id / product_id, nullable)

[categories]
   ├──< [categories]   (parent_id, self-reference)
   └──< [products]     (category_id, nullable)

[warehouses]
   └──< [stock_receipts] ──< [stock_receipt_items] >── [product_variants]

[promotions]   (mandiri — tanpa FK; dirujuk lewat orders.coupon_code)
```

**Relasi Foreign Key Tambahan**:
- `product_reviews` → `products`, `product_variants` (nullable, `set null` saat varian dihapus), `users`, `orders`.
- `order_feedback` → `users`.
- `order_items` → `product_variants`, `brands`, `warehouses` (nullable).
- `returns` → `users` (`user_id`, serta `approved_by` / `verified_by` nullable).
- `stock_receipts` → `users` (`received_by`, nullable).
- `stock_movements` → `users` (`created_by`, nullable).

---

## 6. FORMULA & LOGIKA BISNIS

### 6.1 Perhitungan Pesanan & Laba Toko
```text
Line Total          = (unit_price × quantity) - discount_amount
Subtotal Pesanan    = Σ(order_items.line_total)
Grand Total         = max(0, subtotal - discount_total + shipping_cost)
Laba Kotor Pesanan  = Σ(order_items.line_total) - Σ(HPP varian × quantity)
```

### 6.2 Manajemen Stok Fisik (`StockService`)
```text
Stok Siap Jual (Available) = quantity_on_hand - quantity_reserved

1. Checkout (Order Pending):
   quantity_reserved  += order_quantity
   quantity_available  berkurang

2. Pembatalan / Auto-Expire Order:
   quantity_reserved  -= order_quantity
   quantity_available  pulih kembali

3. Pengiriman / Komit Stok (Order Shipped):
   quantity_on_hand   -= order_quantity
   quantity_reserved  -= order_quantity
   Catat stock_movements (type: 'sale', qty: -order_quantity)

4. Retur Diterima Gudang (kondisi 'good'):
   quantity_on_hand   += return_quantity
   Catat stock_movements (type: 'return_in', qty: +return_quantity)
```

### 6.3 Retur & Pengembalian Dana (`ReturnService`)
```text
Nilai Refund Baris = (order_items.line_total / order_items.quantity) × qty_diretur

Kuota Retur Valid:
   qty_terpakai = Σ(return_items.quantity)
                  WHERE status retur IN ('requested', 'approved', 'received', 'refunded')
   Syarat       = (qty_diretur + qty_terpakai) <= order_items.quantity

Jendela Retur = 14 hari sejak orders.delivered_at (seragam untuk semua produk)

Dampak Stok & Status:
   Barang 'good'    → quantity_on_hand += qty_diretur, mutasi 'return_in'
   Barang 'damaged' → dicatat di return_items, TIDAK menambah stok
   Retur penuh      → orders.status = 'refunded'
   Retur parsial    → orders.status tetap 'completed'
```

---

## 7. KEBUTUHAN NON-FUNGSIONAL & OPERASIONAL

1. **Integritas Transaksional**: Operasi checkout, reservasi/pelepasan stok, konfirmasi penerimaan barang, auto-expire order, retur, dan submit feedback wajib berjalan dalam `DB::transaction` dengan `lockForUpdate()`.
2. **Keamanan & Otorisasi**: Route privat dilindungi `auth:sanctum` dan `role:admin` / `role:admin,warehouse`. Kepemilikan pesanan pelanggan dicek ketat (mengembalikan 404 jika milik pengguna lain).
3. **Immutability Data Transaksi**: `order_items` menyimpan snapshot harga & atribut produk saat transaksi; `stock_movements` bersifat *append-only*.
4. **Otoritas Ongkir Server-Side**: Nilai `shipping_cost` dari klien selalu diabaikan; `CheckoutService` menghitung ulang tarif dari berat total varian dan tujuan alamat.
5. **Kompatibilitas Frontend Next.js 16**: Komponen klien yang membaca query/parameter dinamis dibungkus `<Suspense>` agar selaras dengan `cacheComponents: true` & `partialPrefetching: true`.
6. **Prasyarat Operasional**:
   - Jalankan `php artisan storage:link` agar unggahan gambar produk di `/storage/products/` dapat diakses publik.
   - Aktifkan scheduler (`php artisan schedule:work` di lokal atau cron `* * * * * php artisan schedule:run` di produksi) untuk menjalankan `orders:expire-unpaid` tiap jam.
   - Untuk sandbox/produksi Midtrans, isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` di `backend/.env` lalu jalankan `php artisan config:clear`; gunakan tunnel publik jika menguji webhook di localhost.
   - **Data Demo & Seeding** (`php artisan migrate:fresh --seed`):
     - `CatalogSeeder`: Membuat 2 gudang (`GDG-JKT` default, `GDG-SBY`), identitas toko `Qaireen Collection`, kategori, dan produk dasar.
     - `HistoricalSeeder`: Idempoten; mengisi 24 bulan riwayat musiman (Lebaran, 11.11, 12.12, dll.) mencakup 10 produk / 56 varian, 65 pelanggan, 584 pesanan, 1.169 item, dan 34 retur dengan mutasi stok konsisten melalui `StockReceiptService`.
     - `FeedbackSeeder`: Idempoten; mengisi backfill ulasan produk (~70% pesanan selesai) dan feedback layanan (~55% pesanan selesai).
   - **Catatan Alat Dev**: Direktori `backend/` bukan repositori Git sehingga `vendor/bin/pint --dirty` tidak berjalan; gunakan `vendor/bin/pint --format agent <berkas…>`.

---

## 8. RIWAYAT PENGEMBANGAN & ARSIP FITUR DIPENSIUNKAN

### 8.1 Ringkasan Riwayat Pengembangan (Tahap 1–16)

| Tahap | Cakupan Utama | Status |
|---|---|---|
| **1–4** | Fondasi Modular Monolith, Auth Sanctum, Katalog Produk & Varian Matriks, Multi-Gudang & Ledger Stok, Keranjang & Checkout Snapshot | Selesai *(fitur konsinyasi/mitra dipensiunkan di Milestone 13)* |
| **5** | Promosi, Kupon Diskon Multi-Tipe & Laporan Analitik Toko | Selesai *(laporan dipersempit ke 3 tab di Milestone 13)* |
| **6** | Integrasi Payment Gateway Midtrans Snap & Webhook SHA512 | Selesai *(mode simulasi diperbaiki di Milestone 12)* |
| **7** | Otomasi Logistik RajaOngkir Pro (Tarif Server-Side & Tracking Manifest) | Selesai |
| **8** | Sistem Retur Pelanggan, Verifikasi Gudang & Refund | Selesai *(jendela retur diseragamkan 14 hari di Milestone 13)* |
| **9** | Ekspor Finansial Settlement (Blade Invoice, XLSX, PPh 23) | **Dihentikan (Milestone 13)** |
| **10** | Seeder Riwayat Operasional 24 Bulan (`HistoricalSeeder`) | Selesai *(ditulis ulang single-store di Milestone 13)* |
| **11** | Gudang Default di `CatalogSeeder` & Pesan Error Checkout | Selesai |
| **12** | Auto-Expire Pesanan Belum Dibayar (`orders:expire-unpaid`) | Selesai |
| **13** | Redesign UI/UX Editorial Fashion (Fondasi Token, `Modal`, `SalesTrendChart`) | Selesai *(diteruskan ke tema Tahap 16)* |
| **14** | Halaman `/categories`, `/bantuan`, Promo Publik, Unggah Berkas Gambar & **Konversi Multi-Brand → Toko Tunggal** (`Milestone 11 & 13`) | Selesai |
| **15** | Sistem Ulasan Produk (`product_reviews`) & Feedback Pesanan (`order_feedback`) + Moderasi Admin & `FeedbackSeeder` | Selesai |
| **16** | Redesign UI/UX *Fast-Fashion* Monokrom High-Conversion (`Montserrat`, rasio `2:3`, `TopUrgencyBanner`, sticky buy-box PDP, free-shipping bar) | Selesai |

### 8.2 Arsip Fitur yang Dipensiunkan (Milestone 13)
Pada **Milestone 13**, arsitektur diubah dari marketplace multi-brand menjadi toko tunggal. Komponen berikut **sudah dihapus dari kode dan skema database** dan dicatat semata sebagai referensi sejarah:
- **Database & Migrasi**: Tabel `brand_partners`, `consignment_agreements`, `brand_settlements`, dan `settlement_items` di-drop oleh migrasi `2026_11_03_064637_retire_consignment_domain.php` (reversibel lewat `down()`), beserta kolom `users.brand_partner_id`, `brands.(type, brand_partner_id)`, `inventory_stocks.(ownership_type, brand_partner_id)`, `order_items.(brand_type, ownership_type, brand_partner_id)`, `stock_receipts.(brand_partner_id, consignment_agreement_id)`, dan `stock_movements.(ownership_type, brand_partner_id)`.
- **Backend**: Modul `app/Modules/Consignment/**`, middleware `BrandScopeMiddleware` (`brand.scope`), enum `BrandType`, `StockOwnershipType`, `UserRole::Partner`, `DiscountBearer::Partner`, `PromotionAppliesTo::Brand`, `ReceiptSourceType::ConsignmentIn`, `MovementType::ConsignmentReturn`, layanan `CommissionCalculator`, `SettlementService`, `SettlementDocumentService`, `XlsxExporter`, `Pph23Calculator`, template `resources/views/consignment/invoice.blade.php`, serta endpoint `/api/v1/partner/*`, `/api/v1/admin/partners|agreements|settlements`, dan `/api/v1/admin/reports/{brands,settlements,tax}`.
- **Frontend**: Portal `/partner/**`, `/admin/consignment/**`, `lib/api/consignment.ts`, `lib/types/consignment.ts`, tab laporan Brand/Settlement/PPh 23, dan UI pemilih kepemilikan stok pada form inventori.
