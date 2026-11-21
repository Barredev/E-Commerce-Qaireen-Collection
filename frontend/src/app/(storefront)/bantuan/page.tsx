import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Pusat Bantuan & Layanan Pelanggan",
};

interface HelpSection {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: HelpSection[] = [
  {
    id: "cara-pesan",
    title: "Cara Berbelanja di Qaireen Collection",
    body: [
      "Pilih produk dari katalog, tentukan ukuran dan varian warna yang diinginkan, lalu klik 'Tambah ke Keranjang'.",
      "Buka tas belanja Anda, periksa kembali jumlah barang, lalu lanjutkan ke proses checkout.",
      "Lengkapi alamat pengiriman, pilih ekspedisi kurir yang tersedia, tentukan metode pembayaran (Transfer Bank, QRIS, atau COD), dan selesaikan pesanan.",
    ],
  },
  {
    id: "pengiriman",
    title: "Pengiriman & Estimasi Tiba",
    body: [
      "Semua pesanan yang terkonfirmasi sebelum pukul 15:00 WIB akan dikemas dan diserahkan ke kurir pada hari yang sama.",
      "Ongkos kirim dihitung otomatis berdasarkan berat total paket dan lokasi tujuan Anda melalui integrasi kurir real-time.",
      "Dapatkan promo GRATIS ONGKIR otomatis untuk setiap transaksi dengan total belanja di atas Rp 250.000.",
    ],
  },
  {
    id: "retur",
    title: "Kebijakan Retur & Tukar Ukuran",
    body: [
      "Kami memberikan jendela pengajuan retur hingga 14 hari setelah paket diterima (status Delivered / Completed) untuk barang cacat, salah kirim, atau tidak sesuai ukuran.",
      "Produk harus dalam kondisi baru, belum dicuci, dan label merek/hangtag masih terpasang utuh.",
      "Pengajuan retur dapat dilakukan langsung melalui tombol 'Ajukan Retur' pada halaman detail pesanan di akun Anda.",
    ],
  },
  {
    id: "kontak",
    title: "Hubungi Layanan Pelanggan",
    body: [
      "Pertanyaan seputar nomor resi, kendala paket, atau bantuan produk dapat disampaikan melalui menu 'Pesanan Saya' pada detail pesanan terkait.",
      "Tim Customer Service kami siap melayani Anda setiap hari kerja pukul 08:00 – 21:00 WIB.",
    ],
  },
  {
    id: "privasi",
    title: "Kebijakan Privasi & Keamanan",
    body: [
      "Data pribadi Anda (nama, nomor kontak, dan alamat) hanya digunakan untuk keperluan pemrosesan dan pengiriman pesanan.",
      "Kami menerapkan enkripsi standar industri dan tidak pernah membagikan data kepada pihak ketiga yang tidak berwenang.",
    ],
  },
  {
    id: "syarat",
    title: "Syarat & Ketentuan Pembelian",
    body: [
      "Harga yang tercantum sudah termasuk pajak yang berlaku dan dapat berubah sewaktu-waktu sesuai program promosi yang berjalan.",
      "Pesanan yang belum diselesaikan dalam batas waktu 24 jam akan dibatalkan otomatis oleh sistem dan stok dikembalikan ke katalog.",
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="CUSTOMER SUPPORT"
        title="PUSAT BANTUAN &amp; FAQ"
        description="Panduan lengkap berbelanja, syarat pengiriman, penukaran ukuran, dan informasi bantuan pelanggan."
      />

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-28 rounded-xs border-2 border-border bg-card p-6 transition-all hover:border-foreground"
          >
            <h2 className="font-display text-lg font-black uppercase tracking-tight text-foreground">
              {section.title}
            </h2>
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
