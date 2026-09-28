import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/types";

export type AuditAction =
  | "ASSET_CREATED"
  | "ASSET_UPDATED"
  | "LIFECYCLE_CHANGED"
  | "CONDITION_UPDATED"
  | "INSPECTION_CREATED"
  | "MAINTENANCE_CREATED"
  | "MAINTENANCE_UPDATED";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ASSET_CREATED: "Asset created",
  ASSET_UPDATED: "Asset modified",
  LIFECYCLE_CHANGED: "Lifecycle changed",
  CONDITION_UPDATED: "Condition updated",
  INSPECTION_CREATED: "Inspection created",
  MAINTENANCE_CREATED: "Maintenance created",
  MAINTENANCE_UPDATED: "Maintenance updated",
};

interface AuditInput {
  user: CurrentUser;
  action: AuditAction;
  entityType: "asset" | "inspection" | "maintenance";
  entityId?: string | null;
  assetId?: string | null;
  assetCode?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Appends a row to audit_logs. Audit failures never block the primary action,
 * they are reported to the server console instead.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.user.id,
    actor_name: input.user.fullName,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    asset_id: input.assetId ?? null,
    asset_code: input.assetCode ?? null,
    details: input.details ?? {},
  });

  if (error) {
    console.error("Failed to write audit log:", error.message);
  }
}
