import { api } from "./client";
import type {
  InventoryReport,
  OverviewReport,
  SalesReport,
} from "@/lib/types/report";

export async function fetchReportOverview(): Promise<OverviewReport> {
  const res = await api.get<{ data: OverviewReport }>(
    "/admin/reports/overview",
  );
  return res.data.data;
}

export async function fetchReportSales(params: {
  start_date?: string;
  end_date?: string;
} = {}): Promise<SalesReport> {
  const q = new URLSearchParams();
  if (params.start_date) q.set("start_date", params.start_date);
  if (params.end_date) q.set("end_date", params.end_date);

  const qs = q.toString();
  const res = await api.get<{ data: SalesReport }>(
    `/admin/reports/sales${qs ? `?${qs}` : ""}`,
  );
  return res.data.data;
}

export async function fetchReportInventory(): Promise<InventoryReport> {
  const res = await api.get<{ data: InventoryReport }>(
    "/admin/reports/inventory",
  );
  return res.data.data;
}
