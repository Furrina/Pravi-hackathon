"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import {
  createMaintenanceAction,
  updateMaintenanceStatusAction,
  type MaintenanceFormState,
} from "@/modules/maintenance/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/ui";
import { MAINTENANCE_STATUSES } from "@/lib/types";
import type { MaintenanceStatus } from "@/lib/types";
import type { AssetOption } from "@/modules/assets/queries";

const initialState: MaintenanceFormState = {};

interface Props {
  today: string;
  assets?: AssetOption[];
  assetId?: string;
}

export function MaintenanceForm({ today, assets, assetId }: Props) {
  const [state, formAction] = useFormState(createMaintenanceAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 p-4">
      {assetId ? <input type="hidden" name="asset_id" value={assetId} /> : null}

      {assets ? (
        <div>
          <label htmlFor="maintenance_asset" className="gov-label">
            Asset <span className="text-red-600">*</span>
          </label>
          <select id="maintenance_asset" name="asset_id" required className="gov-input">
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
          <label htmlFor="maintenance_status" className="gov-label">
            Status <span className="text-red-600">*</span>
          </label>
          <select
            id="maintenance_status"
            name="status"
            required
            defaultValue="Scheduled"
            className="gov-input"
          >
            {MAINTENANCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assigned_officer" className="gov-label">
            Assigned officer
          </label>
          <input id="assigned_officer" name="assigned_officer" className="gov-input" />
        </div>

        <div>
          <label htmlFor="start_date" className="gov-label">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={today}
            className="gov-input"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="gov-label">
            End date
          </label>
          <input id="end_date" name="end_date" type="date" className="gov-input" />
        </div>

        <div>
          <label htmlFor="maintenance_cost" className="gov-label">
            Cost (INR)
          </label>
          <input
            id="maintenance_cost"
            name="cost"
            type="number"
            min={0}
            step="0.01"
            className="gov-input"
          />
        </div>

        <div>
          <label htmlFor="next_maintenance_date" className="gov-label">
            Next maintenance date
          </label>
          <input
            id="next_maintenance_date"
            name="next_maintenance_date"
            type="date"
            className="gov-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="maintenance_description" className="gov-label">
          Description of work <span className="text-red-600">*</span>
        </label>
        <textarea
          id="maintenance_description"
          name="description"
          rows={2}
          required
          className="gov-input"
        />
      </div>

      <FormMessage error={state.error} success={state.success} />

      <SubmitButton pendingLabel="Saving…">Create maintenance record</SubmitButton>
    </form>
  );
}

export function MaintenanceStatusForm({
  id,
  status,
}: {
  id: string;
  status: MaintenanceStatus;
}) {
  const [state, formAction] = useFormState(updateMaintenanceStatusAction, initialState);

  if (status === "Completed") {
    return <span className="text-xs text-slate-500">Closed</span>;
  }

  const next: MaintenanceStatus = status === "Scheduled" ? "In Progress" : "Completed";

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton variant="secondary" pendingLabel="Updating…" className="!px-2.5 !py-1 text-xs">
        Mark {next}
      </SubmitButton>
      {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
    </form>
  );
}
