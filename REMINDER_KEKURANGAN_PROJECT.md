# REMINDER KEKURANGAN & DAFTAR PERBAIKAN PROJECT
## Qaireen Collection (`e:\web-ecomm`)

Dokumen ini berfungsi sebagai **daftar pengingat (*checklist*)** untuk bug aktif, celah fitur, dan hal teknis yang perlu diselesaikan sebelum rilis produksi.

---

## 🔴 Prioritas 1 — Bug & Ketidakkonsistenan Aktif (Selesai)

- [x] **Hapus sisa relasi `partner` di `StockReceiptController`**
  - **Lokasi:** `backend/app/Modules/Inventory/Controllers/StockReceiptController.php` (baris 22 & 51)
  - **Perbaikan:** Eager load `'partner:id,company_name'` sudah dihapus dan ditutup oleh regression test pada `backend/tests/Feature/StockReceiptTest.php`.

- [x] **Buka akses UI untuk role `warehouse` (Staf Gudang)**
  - **Lokasi:** `frontend/src/components/admin/AdminShell.tsx`, `AdminSidebar.tsx`, `LoginForm.tsx`, `Navbar.tsx`, serta `backend/app/Modules/Inventory/Controllers/InventoryLookupController.php`
  - **Perbaikan:** Role `warehouse` kini diarahkan ke `/admin/inventory/stocks`, sidebar menampilkan 4 menu inventori saja, akses ke halaman admin lain di-redirect ke `/admin/inventory/stocks`, dan lookup gudang/varian memakai endpoint `/api/v1/admin/inventory/warehouses` & `/variants`.

- [x] **Fungsikan atau rapikan elemen Storefront yang masih statis/dummy**
  - **Newsletter VIP Footer (`frontend/src/components/shared/Footer.tsx`):** Terhubung ke endpoint baru `POST /api/v1/newsletter` (`NewsletterController` + tabel `newsletter_subscribers`).
  - **Foto Hero (`frontend/public/hero-01.jpg`):** Gambar editorial monokrom telah tersedia di `frontend/public/hero-01.jpg`.
  - **Promo & Timer Dinamis (`HomeHero.tsx` & `Navbar.tsx`):** Mengambil promosi aktif dari `GET /api/v1/promotions` tanpa kode palsu `QAIREEN40` dan memakai countdown stabil ke akhir promo / akhir hari.
  - **Konsistensi Kebijakan Retur (`HomeHero.tsx`, `Navbar.tsx`, `bantuan/page.tsx`):** Diselaraskan menjadi **14 hari** sesuai `ReturnService::DEFAULT_RETURN_WINDOW_DAYS`.

---

## 🟠 Prioritas 2 — Fitur E-Commerce Esensial yang Belum Tersedia

- [ ] **Lupa Password / Reset Password & Verifikasi Email**
  - **Lokasi:** `backend/app/Modules/Auth/Controllers/AuthController.php` & `frontend/src/app/(storefront)/auth/`
  - **Kekurangan:** Baru tersedia `register`, `login`, `logout`, `me`, dan `updateProfile`. Belum ada alur `forgot-password` / `reset-password` via email maupun verifikasi email akun.

- [ ] **Fitur Wishlist (Simpan Produk Favorit)**
  - **Lokasi:** Halaman login (`frontend/src/app/(storefront)/auth/login/page.tsx`) sudah menyebut *"simpan wishlist"*, namun fiturnya belum ada.
  - **Yang perlu dibuat:** Tabel `wishlists`, endpoint API (`GET/POST/DELETE`), serta tombol ikon hati/simpan di `ProductCard.tsx`, `ProductDetail.tsx`, dan tab akun `/account/wishlist`.

- [ ] **Keranjang Tamu (*Guest Cart*) Sebelum Login**
  - **Lokasi:** `backend/app/Modules/Order/routes.php` & `frontend/src/components/storefront/CartView.tsx`
  - **Kekurangan:** Skema database `carts.user_id` sebenarnya sudah `nullable`, tetapi route API keranjang masih dikunci `auth:sanctum` dan `CartView` mewajibkan login dulu. Perlu mekanisme token/session guest cart lalu *merge* saat user login/checkout.

- [ ] **Kolom HPP / Modal Produk (`cost_price`) & Laporan Laba Kotor Nyata**
  - **Lokasi:** `product_variants` (`backend/database/migrations/2026_10_30_172137_create_product_variants_table.php`), `order_items`, dan `backend/app/Modules/Report/Services/ReportService.php`
  - **Kekurangan:** PRD menargetkan perhitungan *Laba Kotor = Penjualan − HPP*, tetapi tabel varian dan snapshot item pesanan belum menyimpan harga modal (`cost_price`), sehingga laporan admin baru menghitung omzet (`revenue`) dan diskon.

- [ ] **Notifikasi Transaksional (Email / WhatsApp)**
  - **Kekurangan:** Belum ada notifikasi otomatis ke pelanggan (dan/atau admin) saat pesanan dibuat, pembayaran terkonfirmasi (`paid`), nomor resi dikirim (`shipped`), pesanan kedaluwarsa, atau status retur berubah.

---

## 🟡 Prioritas 3 — Kesiapan Produksi, SEO & Pengujian

- [ ] **SEO Teknis & Metadata Dinamis**
  - Tambahkan `sitemap.ts` dan `robots.ts` di `frontend/src/app/`.
  - Tambahkan `generateMetadata` (title, description, OpenGraph image) di halaman dinamis seperti `/products/[slug]` dan `/categories/[slug]`.

- [ ] **Automated Testing di Frontend**
  - **Lokasi:** `frontend/package.json`
  - **Kekurangan:** Backend sudah memiliki 25 berkas test PHPUnit, sedangkan frontend baru punya `lint` dan `build`. Disarankan menambah smoke/E2E test (mis. Playwright atau Vitest) untuk alur login, keranjang, dan checkout.

- [ ] **Kebersihan Repository & Inisialisasi Git**
  - Bersihkan file nyasar `e:\web-ecomm\backend\toArray())` yang tidak terpakai.
  - Inisialisasi Git repository agar perubahan terlacak aman dan tool seperti `vendor/bin/pint --dirty` bisa berjalan normal.

---

## 🔵 Checklist Operasional Sebelum Deploy / Demo Live

- [ ] Pastikan `php artisan storage:link` sudah dijalankan di server backend agar unggahan gambar produk di `/storage/products/` tampil.
- [ ] Jalankan scheduler (`php artisan schedule:work` untuk dev, atau cron `* * * * * php artisan schedule:run` untuk produksi) agar perintah `orders:expire-unpaid` berjalan tiap jam.
- [ ] Isi kredensial `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY` serta `RAJAONGKIR_API_KEY` di `backend/.env` lalu jalankan `php artisan config:clear`.
- [ ] Daftarkan **Payment Notification URL** di dashboard Midtrans ke endpoint publik `/api/v1/webhooks/payment/midtrans` (gunakan tunnel seperti ngrok/cloudflared saat uji coba lokal).
