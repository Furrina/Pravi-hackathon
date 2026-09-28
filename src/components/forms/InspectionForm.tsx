"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { createInspectionAction, type InspectionFormState } from "@/modules/inspections/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/ui";
import { CONDITIONS } from "@/lib/types";
import type { AssetOption } from "@/modules/assets/queries";

const initialState: InspectionFormState = {};

interface Props {
  today: string;
  /** Supply `assets` for the standalone page, or `assetId` on an asset's own page. */
  assets?: AssetOption[];
  assetId?: string;
  defaultCondition?: string;
}

export function InspectionForm({ today, assets, assetId, defaultCondition }: Props) {
  const [state, formAction] = useFormState(createInspectionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 p-4">
      {assetId ? <input type="hidden" name="asset_id" value={assetId} /> : null}

      {assets ? (
        <div>
          <label htmlFor="inspection_asset" className="gov-label">
            Asset <span className="text-red-600">*</span>
          </label>
          <select id="inspection_asset" name="asset_id" required className="gov-input">
            <option value="">Select an asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.asset_code} — {asset.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="inspected_on" className="gov-label">
            Inspection date <span className="text-red-600">*</span>
          </label>
          <input
            id="inspected_on"
            name="inspected_on"
            type="date"
            required
            defaultValue={today}
            max={today}
            className="gov-input"
          />
        </div>

        <div>
          <label htmlFor="inspection_condition" className="gov-label">
            Assessed condition <span className="text-red-600">*</span>
          </label>
          <select
            id="inspection_condition"
            name="condition"
            required
            defaultValue={defaultCondition ?? "Good"}
            className="gov-input"
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="gov-label">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} className="gov-input" />
      </div>

      <div>
        <label htmlFor="recommended_action" className="gov-label">
          Recommended action
        </label>
        <textarea
          id="recommended_action"
          name="recommended_action"
          rows={2}
          className="gov-input"
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id="apply_condition"
          name="apply_condition"
          type="checkbox"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gov focus:ring-gov"
        />
        <label htmlFor="apply_condition" className="text-sm text-slate-700">
          Update the asset&apos;s recorded condition to match this assessment
        </label>
      </div>

      <FormMessage error={state.error} success={state.success} />

      <SubmitButton pendingLabel="Saving…">Record inspection</SubmitButton>
    </form>
  );
}
