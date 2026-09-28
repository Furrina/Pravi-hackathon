"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageAssets, requireUser } from "@/lib/auth";
import { recordAudit } from "@/modules/audit/log";
import type { AttributeField, Condition, LifecycleStatus } from "@/lib/types";
import { CONDITIONS, LIFECYCLE_STATUSES } from "@/lib/types";

export interface AssetFormState {
  error?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numOrNull(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(formData: FormData, key: string): string | null {
  const raw = str(formData, key);
  return raw ? raw : null;
}

/** Reads the class-specific attributes (`attr__<key>` inputs) and validates them. */
async function collectAttributes(
  formData: FormData,
  assetClassId: string
): Promise<{ attributes: Record<string, unknown>; error?: string }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("asset_classes")
    .select("attribute_schema")
    .eq("id", assetClassId)
    .maybeSingle();

  const schema = (data?.attribute_schema ?? []) as AttributeField[];
  const attributes: Record<string, unknown> = {};

  for (const field of schema) {
    const raw = str(formData, `attr__${field.key}`);

    if (field.type === "boolean") {
      attributes[field.key] = formData.get(`attr__${field.key}`) === "on";
      continue;
    }

    if (!raw) {
      if (field.required) {
        return { attributes, error: `${field.label} is required for this asset class.` };
      }
      continue;
    }

    if (field.type === "number") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return { attributes, error: `${field.label} must be a number.` };
      }
      attributes[field.key] = parsed;
    } else {
      attributes[field.key] = raw;
    }
  }

  return { attributes };
}

interface CommonFields {
  asset_code: string;
  name: string;
  department_id: string;
  asset_class_id: string;
  district_id: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  condition: Condition;
  commissioned_on: string | null;
  expected_lifetime_years: number | null;
  cost: number | null;
  responsible_officer: string | null;
  description: string | null;
}

function readCommonFields(formData: FormData): { fields?: CommonFields; error?: string } {
  const asset_code = str(formData, "asset_code");
  const name = str(formData, "name");
  const department_id = str(formData, "department_id");
  const asset_class_id = str(formData, "asset_class_id");
  const district_id = str(formData, "district_id");
  const condition = str(formData, "condition") as Condition;

  if (!asset_code) return { error: "Asset ID is required." };
  if (!name) return { error: "Asset name is required." };
  if (!department_id) return { error: "Department is required." };
  if (!asset_class_id) return { error: "Asset class is required." };
  if (!district_id) return { error: "District is required." };
  if (!CONDITIONS.includes(condition)) return { error: "A valid condition is required." };

  const latitude = numOrNull(formData, "latitude");
  const longitude = numOrNull(formData, "longitude");
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { error: "Longitude must be between -180 and 180." };
  }

  return {
    fields: {
      asset_code,
      name,
      department_id,
      asset_class_id,
      district_id,
      location: str(formData, "location") || null,
      latitude,
      longitude,
      condition,
      commissioned_on: dateOrNull(formData, "commissioned_on"),
      expected_lifetime_years: numOrNull(formData, "expected_lifetime_years"),
      cost: numOrNull(formData, "cost"),
      responsible_officer: str(formData, "responsible_officer") || null,
      description: str(formData, "description") || null,
    },
  };
}

export async function createAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await requireUser();
  if (!canManageAssets(user)) {
    return { error: "Only an Administrator may register a new asset." };
  }

  const { fields, error } = readCommonFields(formData);
  if (!fields) return { error };

  const lifecycle = str(formData, "lifecycle_status") as LifecycleStatus;
  if (!LIFECYCLE_STATUSES.includes(lifecycle)) {
    return { error: "A valid lifecycle status is required." };
  }

  const { attributes, error: attrError } = await collectAttributes(
    formData,
    fields.asset_class_id
  );
  if (attrError) return { error: attrError };

  const supabase = createClient();

  const { data: inserted, error: insertError } = await supabase
    .from("assets")
    .insert({ ...fields, lifecycle_status: lifecycle, created_by: user.id })
    .select("id, asset_code")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { error: `Asset ID "${fields.asset_code}" is already in use.` };
    }
    return { error: insertError?.message ?? "Could not register the asset." };
  }

  await supabase.from("asset_attributes").insert({ asset_id: inserted.id, attributes });

  await supabase.from("lifecycle_events").insert({
    asset_id: inserted.id,
    event_type: "Registered",
    previous_status: null,
    new_status: lifecycle,
    remarks: "Asset registered in the system.",
    performed_by: user.id,
    performed_by_name: user.fullName,
  });

  await recordAudit({
    user,
    action: "ASSET_CREATED",
    entityType: "asset",
    entityId: inserted.id,
    assetId: inserted.id,
    assetCode: inserted.asset_code,
    details: { name: fields.name, lifecycle_status: lifecycle, condition: fields.condition },
  });

  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");
  redirect(`/assets/${inserted.id}`);
}

export async function updateAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await requireUser();
  if (!canManageAssets(user)) {
    return { error: "Only an Administrator may edit an asset record." };
  }

  const id = str(formData, "id");
  if (!id) return { error: "Missing asset reference." };

  const { fields, error } = readCommonFields(formData);
  if (!fields) return { error };

  const { attributes, error: attrError } = await collectAttributes(
    formData,
    fields.asset_class_id
  );
  if (attrError) return { error: attrError };

  const supabase = createClient();

  const { data: before } = await supabase
    .from("assets")
    .select("condition")
    .eq("id", id)
    .maybeSingle();

  const { error: updateError } = await supabase.from("assets").update(fields).eq("id", id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: `Asset ID "${fields.asset_code}" is already in use.` };
    }
    return { error: updateError.message };
  }

  await supabase
    .from("asset_attributes")
    .upsert({ asset_id: id, attributes }, { onConflict: "asset_id" });

  await recordAudit({
    user,
    action: "ASSET_UPDATED",
    entityType: "asset",
    entityId: id,
    assetId: id,
    assetCode: fields.asset_code,
    details: {
      name: fields.name,
      condition_from: before?.condition ?? null,
      condition_to: fields.condition,
    },
  });

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");
  redirect(`/assets/${id}`);
}
