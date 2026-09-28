import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageAssets, canRetireAssets, requireUser } from "@/lib/auth";
import { getAssetDetail } from "@/modules/assets/queries";
import { allowedTransitions, RESTRICTED_TARGETS } from "@/modules/lifecycle/transitions";
import { LifecycleChangeForm } from "@/components/forms/LifecycleChangeForm";
import { InspectionForm } from "@/components/forms/InspectionForm";
import { MaintenanceForm, MaintenanceStatusForm } from "@/components/forms/MaintenanceForm";
import { ConditionBadge, LifecycleBadge, MaintenanceBadge } from "@/components/Badges";
import { DefinitionRow, EmptyState, PageHeader } from "@/components/ui";
import {
  formatAttributeValue,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatText,
  todayISO,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const detail = await getAssetDetail(params.id);
  return { title: `${detail?.asset.asset_code ?? "Asset"} · Asset Management System` };
}

function ActionPanel({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="gov-card group">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gov marker:hidden hover:bg-slate-50">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="transition-transform group-open:rotate-90">
            ▸
          </span>
          {summary}
        </span>
      </summary>
      <div className="border-t border-slate-200">{children}</div>
    </details>
  );
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const detail = await getAssetDetail(params.id);

  if (!detail) notFound();

  const { asset, attributes, assetClass, lifecycleEvents, inspections, maintenance } = detail;
  const today = todayISO();

  return (
    <>
      <PageHeader
        title={asset.name}
        description={`Asset ID ${asset.asset_code}`}
        actions={
          <>
            {canManageAssets(user) ? (
              <Link href={`/assets/${asset.id}/edit`} className="gov-btn-primary">
                Edit
              </Link>
            ) : null}
            <Link href="/assets" className="gov-btn-secondary">
              Back to registry
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="gov-card">
            <h2 className="gov-section-title">Overview</h2>
            <dl className="divide-y divide-slate-100">
              <DefinitionRow label="Asset ID">{asset.asset_code}</DefinitionRow>
              <DefinitionRow label="Name">{asset.name}</DefinitionRow>
              <DefinitionRow label="Department">
                {asset.departments?.name ?? "—"}
              </DefinitionRow>
              <DefinitionRow label="Asset Class">
                {asset.asset_classes?.name ?? "—"}
              </DefinitionRow>
              <DefinitionRow label="District">{asset.districts?.name ?? "—"}</DefinitionRow>
              <DefinitionRow label="Location">{formatText(asset.location)}</DefinitionRow>
              <DefinitionRow label="Coordinates">
                {asset.latitude !== null && asset.longitude !== null
                  ? `${asset.latitude}, ${asset.longitude}`
                  : "—"}
              </DefinitionRow>
            </dl>
          </section>

          <section className="gov-card">
            <h2 className="gov-section-title">Information</h2>
            <dl className="divide-y divide-slate-100">
              <DefinitionRow label="Construction / Acquisition Date">
                {formatDate(asset.commissioned_on)}
              </DefinitionRow>
              <DefinitionRow label="Expected Lifetime">
                {asset.expected_lifetime_years !== null
                  ? `${formatNumber(asset.expected_lifetime_years)} years`
                  : "—"}
              </DefinitionRow>
              <DefinitionRow label="Cost">{formatCurrency(asset.cost)}</DefinitionRow>
              <DefinitionRow label="Responsible Officer">
                {formatText(asset.responsible_officer)}
              </DefinitionRow>
              <DefinitionRow label="Description">
                {formatText(asset.description)}
              </DefinitionRow>
            </dl>
          </section>

          <section className="gov-card">
            <h2 className="gov-section-title">
              Class-Specific Attributes{assetClass ? ` — ${assetClass.name}` : ""}
            </h2>
            {!assetClass || assetClass.attribute_schema.length === 0 ? (
              <EmptyState message="This asset class records no additional attributes." />
            ) : (
              <dl className="divide-y divide-slate-100">
                {assetClass.attribute_schema.map((field) => (
                  <DefinitionRow key={field.key} label={field.label}>
                    {formatAttributeValue(attributes[field.key])}
                  </DefinitionRow>
                ))}
              </dl>
            )}
          </section>

          <section className="gov-card">
            <h2 className="gov-section-title">Lifecycle History</h2>
            {lifecycleEvents.length === 0 ? (
              <EmptyState message="No lifecycle events recorded." />
            ) : (
              <ol className="space-y-0 p-4">
                {lifecycleEvents.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full border-2 border-gov bg-white"
                      />
                      {index < lifecycleEvents.length - 1 ? (
                        <span aria-hidden className="mt-1 w-px flex-1 bg-slate-200" />
                      ) : null}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.previous_status ? (
                          <>
                            <LifecycleBadge status={event.previous_status} />
                            <span aria-hidden className="text-slate-400">
                              →
                            </span>
                          </>
                        ) : null}
                        <LifecycleBadge status={event.new_status} />
                        <span className="text-xs text-slate-500">{event.event_type}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(event.occurred_at)} ·{" "}
                        {event.performed_by_name ?? "System"}
                      </p>
                      {event.remarks ? (
                        <p className="mt-1 text-sm text-slate-700">{event.remarks}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="gov-card">
            <h2 className="gov-section-title">Inspections</h2>
            {inspections.length === 0 ? (
              <EmptyState message="No inspections recorded for this asset." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {inspections.map((inspection) => (
                  <li key={inspection.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ConditionBadge condition={inspection.condition} />
                      <span className="text-sm text-slate-700">
                        {formatDate(inspection.inspected_on)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {inspection.inspector_name ?? "—"}
                      </span>
                    </div>
                    {inspection.notes ? (
                      <p className="mt-1.5 text-sm text-slate-700">{inspection.notes}</p>
                    ) : null}
                    {inspection.recommended_action ? (
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">Recommended:</span>{" "}
                        {inspection.recommended_action}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="gov-card">
            <h2 className="gov-section-title">Maintenance</h2>
            {maintenance.length === 0 ? (
              <EmptyState message="No maintenance records for this asset." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {maintenance.map((record) => (
                  <li key={record.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <MaintenanceBadge status={record.status} />
                        <span className="text-sm text-slate-700">
                          {formatDate(record.start_date)} – {formatDate(record.end_date)}
                        </span>
                      </div>
                      <MaintenanceStatusForm id={record.id} status={record.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700">{record.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Officer: {record.assigned_officer ?? "—"} · Cost:{" "}
                      {formatCurrency(record.cost)} · Next:{" "}
                      {formatDate(record.next_maintenance_date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="gov-card">
            <h2 className="gov-section-title">Current Status</h2>
            <dl className="divide-y divide-slate-100">
              <DefinitionRow label="Lifecycle">
                <LifecycleBadge status={asset.lifecycle_status} />
              </DefinitionRow>
              <DefinitionRow label="Condition">
                <ConditionBadge condition={asset.condition} />
              </DefinitionRow>
              <DefinitionRow label="Last updated">
                {formatDateTime(asset.updated_at)}
              </DefinitionRow>
            </dl>
          </section>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Actions
            </h2>

            <ActionPanel summary="Change Lifecycle">
              <LifecycleChangeForm
                assetId={asset.id}
                currentStatus={asset.lifecycle_status}
                options={allowedTransitions(asset.lifecycle_status)}
                restrictedTargets={RESTRICTED_TARGETS}
                canRetire={canRetireAssets(user)}
              />
            </ActionPanel>

            <ActionPanel summary="Add Inspection">
              <InspectionForm
                today={today}
                assetId={asset.id}
                defaultCondition={asset.condition}
              />
            </ActionPanel>

            <ActionPanel summary="Add Maintenance">
              <MaintenanceForm today={today} assetId={asset.id} />
            </ActionPanel>
          </div>
        </div>
      </div>
    </>
  );
}
