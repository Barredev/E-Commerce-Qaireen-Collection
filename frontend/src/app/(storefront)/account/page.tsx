import type { Metadata } from "next";

import { AccountView } from "@/components/storefront/AccountView";

export const metadata: Metadata = {
  title: "Profil Saya",
};

export default function AccountPage() {
  return <AccountView />;
}
