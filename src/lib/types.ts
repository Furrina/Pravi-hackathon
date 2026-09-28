export const LIFECYCLE_STATUSES = [
  "Planned",
  "Under Construction",
  "Operational",
  "Under Maintenance",
  "Retired",
  "Decommissioned",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const CONDITIONS = [
  "Excellent",
  "Good",
  "Fair",
  "Poor",
  "Critical",
] as const;

export type Condition = (typeof CONDITIONS)[number];

export const MAINTENANCE_STATUSES = [
  "Scheduled",
  "In Progress",
  "Completed",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export type RoleName = "Administrator" | "Officer";

export type AttributeType = "text" | "number" | "boolean" | "select";

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  options?: string[];
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
  state: string;
}

export interface AssetClass {
  id: string;
  department_id: string;
  code: string;
  name: string;
  attribute_schema: AttributeField[];
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  department_id: string;
  asset_class_id: string;
  district_id: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  lifecycle_status: LifecycleStatus;
  condition: Condition;
  commissioned_on: string | null;
  expected_lifetime_years: number | null;
  cost: number | null;
  responsible_officer: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetRow extends Asset {
  departments: { name: string } | null;
  asset_classes: { name: string } | null;
  districts: { name: string } | null;
}

export interface LifecycleEvent {
  id: string;
  asset_id: string;
  event_type: string;
  previous_status: LifecycleStatus | null;
  new_status: LifecycleStatus;
  remarks: string | null;
  performed_by_name: string | null;
  occurred_at: string;
}

export interface Inspection {
  id: string;
  asset_id: string;
  inspected_on: string;
  condition: Condition;
  notes: string | null;
  recommended_action: string | null;
  inspector_name: string | null;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  status: MaintenanceStatus;
  assigned_officer: string | null;
  start_date: string | null;
  end_date: string | null;
  cost: number | null;
  description: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  asset_id: string | null;
  asset_code: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
}
