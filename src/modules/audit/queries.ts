import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/lib/types";

export const AUDIT_PAGE_SIZE = 20;

export interface AuditListResult {
  rows: AuditLog[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listAuditLogs(page = 1, action?: string): Promise<AuditListResult> {
  const supabase = createClient();
  const current = Math.max(1, page);
  const from = (current - 1) * AUDIT_PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select(
      "id, actor_name, action, entity_type, entity_id, asset_id, asset_code, details, created_at",
      { count: "exact" }
    );

  if (action) query = query.eq("action", action);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);

  const total = count ?? 0;

  return {
    rows: (data ?? []) as AuditLog[],
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}
