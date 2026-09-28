"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/modules/audit/log";
import type { Condition } from "@/lib/types";
import { CONDITIONS } from "@/lib/types";

export interface InspectionFormState {
  error?: string;
  success?: string;
}

export async function createInspectionAction(
  _prevState: InspectionFormState,
  formData: FormData
): Promise<InspectionFormState> {
  const user = await requireUser();

  const assetId = String(formData.get("asset_id") ?? "");
  const inspectedOn = String(formData.get("inspected_on") ?? "").trim();
  const condition = String(formData.get("condition") ?? "") as Condition;
  const notes = String(formData.get("notes") ?? "").trim();
  const recommendedAction = String(formData.get("recommended_action") ?? "").trim();
  const applyCondition = formData.get("apply_condition") === "on";

  if (!assetId) return { error: "Select an asset." };
  if (!inspectedOn) return { error: "Inspection date is required." };
  if (!CONDITIONS.includes(condition)) return { error: "Select a valid condition." };

  const supabase = createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("id, asset_code, condition")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return { error: "Asset not found." };

  const { data: inspection, error: insertError } = await supabase
    .from("inspections")
    .insert({
      asset_id: assetId,
      inspected_on: inspectedOn,
      condition,
      notes: notes || null,
      recommended_action: recommendedAction || null,
      inspector_id: user.id,
      inspector_name: user.fullName,
    })
    .select("id")
    .single();

  if (insertError || !inspection) {
    return { error: insertError?.message ?? "Could not save the inspection." };
  }

  await recordAudit({
    user,
    action: "INSPECTION_CREATED",
    entityType: "inspection",
    entityId: inspection.id,
    assetId,
    assetCode: asset.asset_code,
    details: { inspected_on: inspectedOn, condition, recommended_action: recommendedAction || null },
  });

  // Condition is deliberately independent of lifecycle: it only changes when an
  // inspector explicitly asks for the assessed condition to be applied.
  let message = "Inspection recorded.";
  if (applyCondition && asset.condition !== condition) {
    const { error: conditionError } = await supabase
      .from("assets")
      .update({ condition })
      .eq("id", assetId);

    if (!conditionError) {
      await recordAudit({
        user,
        action: "CONDITION_UPDATED",
        entityType: "asset",
        entityId: assetId,
        assetId,
        assetCode: asset.asset_code,
        details: { from: asset.condition, to: condition, source: "inspection" },
      });
      message = `Inspection recorded and asset condition updated to "${condition}".`;
    }
  }

  revalidatePath("/inspections");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");

  return { success: message };
}
