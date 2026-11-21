import type { Metadata } from "next";

import { CustomerAddresses } from "@/components/storefront/CustomerAddresses";

export const metadata: Metadata = {
  title: "Buku Alamat",
  description: "Kelola daftar alamat pengiriman untuk checkout mudah.",
};

export default function AccountAddressesPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <CustomerAddresses />
    </div>
  );
}
