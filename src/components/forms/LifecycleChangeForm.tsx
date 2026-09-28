"use client";

import { useFormState } from "react-dom";
import { changeLifecycleAction, type LifecycleFormState } from "@/modules/lifecycle/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/ui";
import type { LifecycleStatus } from "@/lib/types";

const initialState: LifecycleFormState = {};

interface Props {
  assetId: string;
  currentStatus: LifecycleStatus;
  options: LifecycleStatus[];
  restrictedTargets: LifecycleStatus[];
  canRetire: boolean;
}

export function LifecycleChangeForm({
  assetId,
  currentStatus,
  options,
  restrictedTargets,
  canRetire,
}: Props) {
  const [state, formAction] = useFormState(changeLifecycleAction, initialState);

  const available = options.filter(
    (option) => canRetire || !restrictedTargets.includes(option)
  );

  if (options.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-slate-600">
        “{currentStatus}” is a terminal status — no further lifecycle transitions are
        permitted.
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-slate-600">
        The only transitions available from “{currentStatus}” are restricted to
        Administrators.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 p-4">
      <input type="hidden" name="asset_id" value={assetId} />

      <div>
        <label htmlFor="new_status" className="gov-label">
          New status
        </label>
        <select id="new_status" name="new_status" required className="gov-input">
          {available.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Current status: {currentStatus}</p>
      </div>

      <div>
        <label htmlFor="remarks" className="gov-label">
          Remarks
        </label>
        <textarea id="remarks" name="remarks" rows={2} className="gov-input" />
      </div>

      <FormMessage error={state.error} success={state.success} />

      <SubmitButton pendingLabel="Updating…">Change lifecycle</SubmitButton>
    </form>
  );
}
