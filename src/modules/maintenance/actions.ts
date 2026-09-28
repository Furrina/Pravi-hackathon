"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/modules/audit/log";
import type { MaintenanceStatus } from "@/lib/types";
import { MAINTENANCE_STATUSES } from "@/lib/types";

export interface MaintenanceFormState {
  error?: string;
  success?: string;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createMaintenanceAction(
  _prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const user = await requireUser();

  const assetId = text(formData, "asset_id");
  const status = text(formData, "status") as MaintenanceStatus;
  const startDate = text(formData, "start_date");
  const endDate = text(formData, "end_date");
  const costRaw = text(formData, "cost");
  const description = text(formData, "description");

  if (!assetId) return { error: "Select an asset." };
  if (!MAINTENANCE_STATUSES.includes(status)) return { error: "Select a valid status." };
  if (!description) return { error: "A description of the work is required." };
  if (startDate && endDate && endDate < startDate) {
    return { error: "End date cannot be earlier than the start date." };
  }

  const cost = costRaw ? Number(costRaw) : null;
  if (cost !== null && !Number.isFinite(cost)) return { error: "Cost must be a number." };

  const supabase = createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("id, asset_code")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return { error: "Asset not found." };

  const { data: record, error } = await supabase
    .from("maintenance_records")
    .insert({
      asset_id: assetId,
      status,
      assigned_officer: text(formData, "assigned_officer") || null,
      start_date: startDate || null,
      end_date: endDate || null,
      cost,
      description,
      next_maintenance_date: text(formData, "next_maintenance_date") || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !record) {
    return { error: error?.message ?? "Could not save the maintenance record." };
  }

  await recordAudit({
    user,
    action: "MAINTENANCE_CREATED",
    entityType: "maintenance",
    entityId: record.id,
    assetId,
    assetCode: asset.asset_code,
    details: { status, description, cost },
  });

  revalidatePath("/maintenance");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");

  return { success: "Maintenance record created." };
}

export async function updateMaintenanceStatusAction(
  _prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const user = await requireUser();

  const id = text(formData, "id");
  const status = text(formData, "status") as MaintenanceStatus;

  if (!id) return { error: "Missing maintenance reference." };
  if (!MAINTENANCE_STATUSES.includes(status)) return { error: "Select a valid status." };

  const supabase = createClient();

  const { data: record } = await supabase
    .from("maintenance_records")
    .select("id, asset_id, status, end_date, assets(asset_code)")
    .eq("id", id)
    .maybeSingle();

  if (!record) return { error: "Maintenance record not found." };

  const assetRelation = record.assets as { asset_code?: string } | { asset_code?: string }[] | null;
  const assetCode = Array.isArray(assetRelation)
    ? assetRelation[0]?.asset_code
    : assetRelation?.asset_code;

  const patch: Record<string, unknown> = { status };
  if (status === "Completed" && !record.end_date) {
    patch.end_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("maintenance_records").update(patch).eq("id", id);
  if (error) return { error: error.message };

  await recordAudit({
    user,
    action: "MAINTENANCE_UPDATED",
    entityType: "maintenance",
    entityId: id,
    assetId: record.asset_id,
    assetCode: assetCode ?? null,
    details: { from: record.status, to: status },
  });

  revalidatePath("/maintenance");
  revalidatePath(`/assets/${record.asset_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");

  return { success: `Maintenance marked as "${status}".` };
}
