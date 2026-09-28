"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canRetireAssets, requireUser } from "@/lib/auth";
import { recordAudit } from "@/modules/audit/log";
import { isRestrictedTransition, isValidTransition } from "@/modules/lifecycle/transitions";
import type { LifecycleStatus } from "@/lib/types";
import { LIFECYCLE_STATUSES } from "@/lib/types";

export interface LifecycleFormState {
  error?: string;
  success?: string;
}

export async function changeLifecycleAction(
  _prevState: LifecycleFormState,
  formData: FormData
): Promise<LifecycleFormState> {
  const user = await requireUser();

  const assetId = String(formData.get("asset_id") ?? "");
  const target = String(formData.get("new_status") ?? "") as LifecycleStatus;
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!assetId) return { error: "Missing asset reference." };
  if (!LIFECYCLE_STATUSES.includes(target)) {
    return { error: "Select a valid target status." };
  }

  const supabase = createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("id, asset_code, lifecycle_status")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return { error: "Asset not found." };

  const current = asset.lifecycle_status as LifecycleStatus;

  if (!isValidTransition(current, target)) {
    return { error: `"${current}" cannot move directly to "${target}".` };
  }

  if (isRestrictedTransition(target) && !canRetireAssets(user)) {
    return { error: `Only an Administrator may move an asset to "${target}".` };
  }

  const { error: updateError } = await supabase
    .from("assets")
    .update({ lifecycle_status: target })
    .eq("id", assetId);

  if (updateError) return { error: updateError.message };

  await supabase.from("lifecycle_events").insert({
    asset_id: assetId,
    event_type: "Status Change",
    previous_status: current,
    new_status: target,
    remarks: remarks || null,
    performed_by: user.id,
    performed_by_name: user.fullName,
  });

  await recordAudit({
    user,
    action: "LIFECYCLE_CHANGED",
    entityType: "asset",
    entityId: assetId,
    assetId,
    assetCode: asset.asset_code,
    details: { from: current, to: target, remarks: remarks || null },
  });

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/audit-logs");

  return { success: `Lifecycle updated to "${target}".` };
}
