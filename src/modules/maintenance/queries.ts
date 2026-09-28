import { createClient } from "@/lib/supabase/server";
import type { MaintenanceStatus } from "@/lib/types";

export const MAINTENANCE_PAGE_SIZE = 15;

export interface MaintenanceListRow {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  status: MaintenanceStatus;
  assigned_officer: string | null;
  start_date: string | null;
  end_date: string | null;
  cost: number | null;
  description: string | null;
  next_maintenance_date: string | null;
}

export interface MaintenanceListResult {
  rows: MaintenanceListRow[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listMaintenance(
  page = 1,
  status?: string
): Promise<MaintenanceListResult> {
  const supabase = createClient();
  const current = Math.max(1, page);
  const from = (current - 1) * MAINTENANCE_PAGE_SIZE;

  let query = supabase
    .from("maintenance_records")
    .select(
      `id, asset_id, status, assigned_officer, start_date, end_date, cost, description,
       next_maintenance_date, assets(asset_code, name)`,
      { count: "exact" }
    );

  if (status) query = query.eq("status", status);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + MAINTENANCE_PAGE_SIZE - 1);

  const total = count ?? 0;

  return {
    rows: (data ?? []).map((row) => {
      const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
      return {
        id: row.id as string,
        asset_id: row.asset_id as string,
        asset_code: (asset as { asset_code?: string } | null)?.asset_code ?? "—",
        asset_name: (asset as { name?: string } | null)?.name ?? "—",
        status: row.status as MaintenanceStatus,
        assigned_officer: row.assigned_officer as string | null,
        start_date: row.start_date as string | null,
        end_date: row.end_date as string | null,
        cost: row.cost as number | null,
        description: row.description as string | null,
        next_maintenance_date: row.next_maintenance_date as string | null,
      };
    }),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / MAINTENANCE_PAGE_SIZE)),
  };
}
