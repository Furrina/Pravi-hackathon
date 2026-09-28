import { createClient } from "@/lib/supabase/server";
import type { Condition, LifecycleStatus, MaintenanceStatus } from "@/lib/types";

export interface DepartmentCount {
  department_id: string;
  department_name: string;
  asset_count: number;
}

export interface RecentEvent {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  previous_status: LifecycleStatus | null;
  new_status: LifecycleStatus;
  performed_by_name: string | null;
  occurred_at: string;
}

export interface MaintenanceDueRow {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  status: MaintenanceStatus;
  next_maintenance_date: string | null;
  assigned_officer: string | null;
}

export interface DashboardData {
  totalAssets: number;
  operational: number;
  underMaintenance: number;
  poorOrCritical: number;
  byDepartment: DepartmentCount[];
  recentEvents: RecentEvent[];
  maintenanceDue: MaintenanceDueRow[];
}

const POOR_CONDITIONS: Condition[] = ["Poor", "Critical"];

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const horizonISO = horizon.toISOString().slice(0, 10);

  const [total, operational, maintenance, poor, byDept, events, due] = await Promise.all([
    supabase.from("assets").select("id", { count: "exact", head: true }),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("lifecycle_status", "Operational"),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("lifecycle_status", "Under Maintenance"),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .in("condition", POOR_CONDITIONS),
    supabase
      .from("asset_counts_by_department")
      .select("department_id, department_name, asset_count")
      .order("asset_count", { ascending: false }),
    supabase
      .from("lifecycle_events")
      .select(
        "id, asset_id, previous_status, new_status, performed_by_name, occurred_at, assets(asset_code, name)"
      )
      .order("occurred_at", { ascending: false })
      .limit(6),
    supabase
      .from("maintenance_records")
      .select(
        "id, asset_id, status, next_maintenance_date, assigned_officer, assets(asset_code, name)"
      )
      .not("next_maintenance_date", "is", null)
      .lte("next_maintenance_date", horizonISO)
      .order("next_maintenance_date", { ascending: true })
      .limit(6),
  ]);

  interface AssetRef {
    asset_code: string;
    name: string;
  }

  const relation = (value: unknown): AssetRef | undefined => {
    if (!value) return undefined;
    return (Array.isArray(value) ? value[0] : value) as AssetRef | undefined;
  };

  return {
    totalAssets: total.count ?? 0,
    operational: operational.count ?? 0,
    underMaintenance: maintenance.count ?? 0,
    poorOrCritical: poor.count ?? 0,
    byDepartment: (byDept.data ?? []) as DepartmentCount[],
    recentEvents: (events.data ?? []).map((row) => {
      const asset = relation(row.assets);
      return {
        id: row.id as string,
        asset_id: row.asset_id as string,
        asset_code: asset?.asset_code ?? "—",
        asset_name: asset?.name ?? "—",
        previous_status: row.previous_status as LifecycleStatus | null,
        new_status: row.new_status as LifecycleStatus,
        performed_by_name: row.performed_by_name as string | null,
        occurred_at: row.occurred_at as string,
      };
    }),
    maintenanceDue: (due.data ?? []).map((row) => {
      const asset = relation(row.assets);
      return {
        id: row.id as string,
        asset_id: row.asset_id as string,
        asset_code: asset?.asset_code ?? "—",
        asset_name: asset?.name ?? "—",
        status: row.status as MaintenanceStatus,
        next_maintenance_date: row.next_maintenance_date as string | null,
        assigned_officer: row.assigned_officer as string | null,
      };
    }),
  };
}
