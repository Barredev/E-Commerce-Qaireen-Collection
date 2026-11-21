import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/PageHeader";
import { ReceiptForm } from "@/components/admin/ReceiptForm";

export const metadata: Metadata = {
  title: "Buat Penerimaan Stok",
};

export default function NewReceiptPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Penerimaan Stok"
        description="Penerimaan disimpan sebagai draf dan baru menambah stok setelah dikonfirmasi."
      />
      <ReceiptForm />
    </div>
  );
}
