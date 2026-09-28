import { createClient } from "@/lib/supabase/server";
import type {
  AssetClass,
  AssetRow,
  Condition,
  Department,
  District,
  Inspection,
  LifecycleEvent,
  LifecycleStatus,
  MaintenanceRecord,
} from "@/lib/types";

export const PAGE_SIZE = 10;

export interface ReferenceData {
  departments: Department[];
  districts: District[];
  assetClasses: AssetClass[];
}

export async function getReferenceData(): Promise<ReferenceData> {
  const supabase = createClient();

  const [departments, districts, assetClasses] = await Promise.all([
    supabase.from("departments").select("id, code, name").order("name"),
    supabase.from("districts").select("id, name, state").order("name"),
    supabase
      .from("asset_classes")
      .select("id, department_id, code, name, attribute_schema")
      .order("name"),
  ]);

  return {
    departments: (departments.data ?? []) as Department[],
    districts: (districts.data ?? []) as District[],
    assetClasses: (assetClasses.data ?? []) as AssetClass[],
  };
}

export interface AssetFilters {
  q?: string;
  department?: string;
  assetClass?: string;
  district?: string;
  lifecycle?: string;
  condition?: string;
  page?: number;
}

export interface AssetListResult {
  rows: AssetRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Server-side search / filter / pagination. Only one page of rows ever
 * leaves the database.
 */
export async function listAssets(filters: AssetFilters): Promise<AssetListResult> {
  const supabase = createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("assets")
    .select(
      `id, asset_code, name, department_id, asset_class_id, district_id, location,
       latitude, longitude, lifecycle_status, condition, commissioned_on,
       expected_lifetime_years, cost, responsible_officer, description,
       created_at, updated_at,
       departments(name), asset_classes(name), districts(name)`,
      { count: "exact" }
    );

  const q = filters.q?.trim();
  if (q) {
    const escaped = q.replace(/[%,()]/g, " ").trim();
    if (escaped) {
      query = query.or(`asset_code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
    }
  }
  if (filters.department) query = query.eq("department_id", filters.department);
  if (filters.assetClass) query = query.eq("asset_class_id", filters.assetClass);
  if (filters.district) query = query.eq("district_id", filters.district);
  if (filters.lifecycle) query = query.eq("lifecycle_status", filters.lifecycle);
  if (filters.condition) query = query.eq("condition", filters.condition);

  const { data, count, error } = await query.order("asset_code").range(from, to);

  if (error) {
    console.error("listAssets failed:", error.message);
    return { rows: [], total: 0, page, pageCount: 1 };
  }

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as AssetRow[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface AssetDetail {
  asset: AssetRow;
  attributes: Record<string, unknown>;
  assetClass: AssetClass | null;
  lifecycleEvents: LifecycleEvent[];
  inspections: Inspection[];
  maintenance: MaintenanceRecord[];
}

export async function getAssetDetail(id: string): Promise<AssetDetail | null> {
  const supabase = createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select(
      `id, asset_code, name, department_id, asset_class_id, district_id, location,
       latitude, longitude, lifecycle_status, condition, commissioned_on,
       expected_lifetime_years, cost, responsible_officer, description,
       created_at, updated_at,
       departments(name), asset_classes(name), districts(name)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!asset) return null;

  const typedAsset = asset as unknown as AssetRow;

  const [attributesRes, classRes, eventsRes, inspectionsRes, maintenanceRes] = await Promise.all([
    supabase.from("asset_attributes").select("attributes").eq("asset_id", id).maybeSingle(),
    supabase
      .from("asset_classes")
      .select("id, department_id, code, name, attribute_schema")
      .eq("id", typedAsset.asset_class_id)
      .maybeSingle(),
    supabase
      .from("lifecycle_events")
      .select(
        "id, asset_id, event_type, previous_status, new_status, remarks, performed_by_name, occurred_at"
      )
      .eq("asset_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("inspections")
      .select(
        "id, asset_id, inspected_on, condition, notes, recommended_action, inspector_name, created_at"
      )
      .eq("asset_id", id)
      .order("inspected_on", { ascending: false })
      .limit(10),
    supabase
      .from("maintenance_records")
      .select(
        `id, asset_id, status, assigned_officer, start_date, end_date, cost,
         description, next_maintenance_date, created_at, updated_at`
      )
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    asset: typedAsset,
    attributes: (attributesRes.data?.attributes ?? {}) as Record<string, unknown>,
    assetClass: (classRes.data ?? null) as AssetClass | null,
    lifecycleEvents: (eventsRes.data ?? []) as LifecycleEvent[],
    inspections: (inspectionsRes.data ?? []) as Inspection[],
    maintenance: (maintenanceRes.data ?? []) as MaintenanceRecord[],
  };
}

export interface AssetOption {
  id: string;
  asset_code: string;
  name: string;
  lifecycle_status: LifecycleStatus;
  condition: Condition;
}

/** Lightweight asset list used by the standalone inspection / maintenance pages. */
export async function listAssetOptions(): Promise<AssetOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("assets")
    .select("id, asset_code, name, lifecycle_status, condition")
    .order("asset_code")
    .limit(500);

  return (data ?? []) as AssetOption[];
}
