"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/ui";
import type {
  Asset,
  AssetClass,
  Department,
  District,
  LifecycleStatus,
} from "@/lib/types";
import { CONDITIONS, LIFECYCLE_STATUSES } from "@/lib/types";
import type { AssetFormState } from "@/modules/assets/actions";

interface Props {
  mode: "create" | "edit";
  action: (state: AssetFormState, formData: FormData) => Promise<AssetFormState>;
  departments: Department[];
  districts: District[];
  assetClasses: AssetClass[];
  asset?: Asset;
  attributes?: Record<string, unknown>;
  /** Lifecycle can only be changed through the lifecycle workflow, not by editing. */
  lockedLifecycle?: LifecycleStatus;
}

const initialState: AssetFormState = {};

export function AssetForm({
  mode,
  action,
  departments,
  districts,
  assetClasses,
  asset,
  attributes = {},
  lockedLifecycle,
}: Props) {
  const [state, formAction] = useFormState(action, initialState);

  const [departmentId, setDepartmentId] = useState(asset?.department_id ?? "");
  const [assetClassId, setAssetClassId] = useState(asset?.asset_class_id ?? "");

  const classesForDepartment = useMemo(
    () => assetClasses.filter((c) => !departmentId || c.department_id === departmentId),
    [assetClasses, departmentId]
  );

  const selectedClass = useMemo(
    () => assetClasses.find((c) => c.id === assetClassId) ?? null,
    [assetClasses, assetClassId]
  );

  return (
    <form action={formAction} className="space-y-6">
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      {lockedLifecycle ? (
        <input type="hidden" name="lifecycle_status" value={lockedLifecycle} />
      ) : null}

      <section className="gov-card">
        <h2 className="gov-section-title">Identification</h2>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="asset_code" className="gov-label">
              Asset ID <span className="text-red-600">*</span>
            </label>
            <input
              id="asset_code"
              name="asset_code"
              required
              defaultValue={asset?.asset_code ?? ""}
              placeholder="RT-HW-0003"
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="name" className="gov-label">
              Asset Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={asset?.name ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="department_id" className="gov-label">
              Department <span className="text-red-600">*</span>
            </label>
            <select
              id="department_id"
              name="department_id"
              required
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                const stillValid = assetClasses.some(
                  (c) => c.id === assetClassId && c.department_id === e.target.value
                );
                if (!stillValid) setAssetClassId("");
              }}
              className="gov-input"
            >
              <option value="">Select a department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="asset_class_id" className="gov-label">
              Asset Class <span className="text-red-600">*</span>
            </label>
            <select
              id="asset_class_id"
              name="asset_class_id"
              required
              value={assetClassId}
              onChange={(e) => setAssetClassId(e.target.value)}
              disabled={!departmentId}
              className="gov-input"
            >
              <option value="">
                {departmentId ? "Select an asset class" : "Select a department first"}
              </option>
              {classesForDepartment.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="gov-card">
        <h2 className="gov-section-title">Location</h2>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="district_id" className="gov-label">
              District <span className="text-red-600">*</span>
            </label>
            <select
              id="district_id"
              name="district_id"
              required
              defaultValue={asset?.district_id ?? ""}
              className="gov-input"
            >
              <option value="">Select a district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="gov-label">
              Location / Address
            </label>
            <input
              id="location"
              name="location"
              defaultValue={asset?.location ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="latitude" className="gov-label">
              Latitude
            </label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              defaultValue={asset?.latitude ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="gov-label">
              Longitude
            </label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              defaultValue={asset?.longitude ?? ""}
              className="gov-input"
            />
          </div>
        </div>
      </section>

      <section className="gov-card">
        <h2 className="gov-section-title">Status</h2>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="lifecycle_status" className="gov-label">
              Lifecycle Status <span className="text-red-600">*</span>
            </label>
            {lockedLifecycle ? (
              <>
                <input
                  id="lifecycle_status"
                  value={lockedLifecycle}
                  disabled
                  className="gov-input"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use “Change Lifecycle” on the asset page to move the asset through its
                  lifecycle.
                </p>
              </>
            ) : (
              <select
                id="lifecycle_status"
                name="lifecycle_status"
                required
                defaultValue="Planned"
                className="gov-input"
              >
                {LIFECYCLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="condition" className="gov-label">
              Condition <span className="text-red-600">*</span>
            </label>
            <select
              id="condition"
              name="condition"
              required
              defaultValue={asset?.condition ?? "Good"}
              className="gov-input"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="gov-card">
        <h2 className="gov-section-title">Information</h2>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="commissioned_on" className="gov-label">
              Construction / Acquisition Date
            </label>
            <input
              id="commissioned_on"
              name="commissioned_on"
              type="date"
              defaultValue={asset?.commissioned_on ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="expected_lifetime_years" className="gov-label">
              Expected Lifetime (years)
            </label>
            <input
              id="expected_lifetime_years"
              name="expected_lifetime_years"
              type="number"
              min={0}
              defaultValue={asset?.expected_lifetime_years ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="cost" className="gov-label">
              Cost (INR)
            </label>
            <input
              id="cost"
              name="cost"
              type="number"
              min={0}
              step="0.01"
              defaultValue={asset?.cost ?? ""}
              className="gov-input"
            />
          </div>

          <div>
            <label htmlFor="responsible_officer" className="gov-label">
              Responsible Officer
            </label>
            <input
              id="responsible_officer"
              name="responsible_officer"
              defaultValue={asset?.responsible_officer ?? ""}
              className="gov-input"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="gov-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={asset?.description ?? ""}
              className="gov-input"
            />
          </div>
        </div>
      </section>

      <section className="gov-card">
        <h2 className="gov-section-title">
          Class-Specific Attributes
          {selectedClass ? ` — ${selectedClass.name}` : ""}
        </h2>
        {!selectedClass ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Select an asset class to see the attributes recorded for it.
          </p>
        ) : selectedClass.attribute_schema.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            This asset class has no additional attributes.
          </p>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {selectedClass.attribute_schema.map((field) => {
              const name = `attr__${field.key}`;
              const raw = attributes[field.key];
              const value =
                raw === null || raw === undefined ? "" : (raw as string | number | boolean);

              if (field.type === "boolean") {
                return (
                  <div key={field.key} className="flex items-center gap-2 md:col-span-2">
                    <input
                      id={name}
                      name={name}
                      type="checkbox"
                      defaultChecked={value === true}
                      className="h-4 w-4 rounded border-slate-300 text-gov focus:ring-gov"
                    />
                    <label htmlFor={name} className="text-sm font-medium text-slate-700">
                      {field.label}
                    </label>
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <label htmlFor={name} className="gov-label">
                    {field.label}
                    {field.required ? <span className="text-red-600"> *</span> : null}
                  </label>
                  {field.type === "select" ? (
                    <select
                      id={name}
                      name={name}
                      required={field.required}
                      defaultValue={String(value)}
                      className="gov-input"
                    >
                      <option value="">Select…</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={name}
                      name={name}
                      type={field.type === "number" ? "number" : "text"}
                      step={field.type === "number" ? "any" : undefined}
                      required={field.required}
                      defaultValue={String(value)}
                      className="gov-input"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FormMessage error={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">
          {mode === "create" ? "Register asset" : "Save changes"}
        </SubmitButton>
        <Link href={asset ? `/assets/${asset.id}` : "/assets"} className="gov-btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
