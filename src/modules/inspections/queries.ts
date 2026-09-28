import { createClient } from "@/lib/supabase/server";
import type { Condition } from "@/lib/types";

export const INSPECTION_PAGE_SIZE = 15;

export interface InspectionListRow {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  inspected_on: string;
  condition: Condition;
  notes: string | null;
  recommended_action: string | null;
  inspector_name: string | null;
}

export interface InspectionListResult {
  rows: InspectionListRow[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listInspections(page = 1): Promise<InspectionListResult> {
  const supabase = createClient();
  const current = Math.max(1, page);
  const from = (current - 1) * INSPECTION_PAGE_SIZE;

  const { data, count } = await supabase
    .from("inspections")
    .select(
      `id, asset_id, inspected_on, condition, notes, recommended_action, inspector_name,
       assets(asset_code, name)`,
      { count: "exact" }
    )
    .order("inspected_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + INSPECTION_PAGE_SIZE - 1);

  const total = count ?? 0;

  return {
    rows: (data ?? []).map((row) => {
      const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
      return {
        id: row.id as string,
        asset_id: row.asset_id as string,
        asset_code: (asset as { asset_code?: string } | null)?.asset_code ?? "—",
        asset_name: (asset as { name?: string } | null)?.name ?? "—",
        inspected_on: row.inspected_on as string,
        condition: row.condition as Condition,
        notes: row.notes as string | null,
        recommended_action: row.recommended_action as string | null,
        inspector_name: row.inspector_name as string | null,
      };
    }),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / INSPECTION_PAGE_SIZE)),
  };
}
