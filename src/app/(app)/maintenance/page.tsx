import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAssetOptions } from "@/modules/assets/queries";
import { listMaintenance, MAINTENANCE_PAGE_SIZE } from "@/modules/maintenance/queries";
import { MaintenanceForm, MaintenanceStatusForm } from "@/components/forms/MaintenanceForm";
import { MaintenanceBadge } from "@/components/Badges";
import { Pagination } from "@/components/Pagination";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate, formatText, todayISO } from "@/lib/format";
import { MAINTENANCE_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maintenance · Asset Management System" };

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams?: { page?: string; status?: string };
}) {
  await requireUser();
  const page = Number.parseInt(searchParams?.page ?? "1", 10);
  const status = MAINTENANCE_STATUSES.includes(
    (searchParams?.status ?? "") as (typeof MAINTENANCE_STATUSES)[number]
  )
    ? searchParams?.status
    : undefined;

  const [assets, result] = await Promise.all([
    listAssetOptions(),
    listMaintenance(Number.isFinite(page) ? page : 1, status),
  ]);

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Scheduled, ongoing and completed maintenance across the asset register."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form method="get" action="/maintenance" className="gov-card mb-4 flex flex-wrap items-end gap-3 p-4">
            <div>
              <label htmlFor="status" className="gov-label">
                Filter by status
              </label>
              <select id="status" name="status" defaultValue={status ?? ""} className="gov-input">
                <option value="">All statuses</option>
                {MAINTENANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="gov-btn-primary">
              Apply
            </button>
            <Link href="/maintenance" className="gov-btn-secondary">
              Reset
            </Link>
          </form>

          <div className="gov-card overflow-hidden">
            {result.rows.length === 0 ? (
              <EmptyState message="No maintenance records match this view." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="gov-th">Asset</th>
                      <th className="gov-th">Status</th>
                      <th className="gov-th">Officer</th>
                      <th className="gov-th">Period</th>
                      <th className="gov-th">Cost</th>
                      <th className="gov-th">Next Due</th>
                      <th className="gov-th">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="gov-td">
                          <Link
                            href={`/assets/${row.asset_id}`}
                            className="font-medium text-gov hover:underline"
                          >
                            {row.asset_code}
                          </Link>
                          <span className="block max-w-xs text-xs text-slate-500">
                            {row.description ?? row.asset_name}
                          </span>
                        </td>
                        <td className="gov-td">
                          <MaintenanceBadge status={row.status} />
                        </td>
                        <td className="gov-td">{formatText(row.assigned_officer)}</td>
                        <td className="gov-td whitespace-nowrap">
                          {formatDate(row.start_date)} – {formatDate(row.end_date)}
                        </td>
                        <td className="gov-td whitespace-nowrap">{formatCurrency(row.cost)}</td>
                        <td className="gov-td whitespace-nowrap">
                          {formatDate(row.next_maintenance_date)}
                        </td>
                        <td className="gov-td">
                          <MaintenanceStatusForm id={row.id} status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              basePath="/maintenance"
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              pageSize={MAINTENANCE_PAGE_SIZE}
              params={{ status }}
            />
          </div>
        </div>

        <div>
          <section className="gov-card">
            <h2 className="gov-section-title">New Maintenance Record</h2>
            <MaintenanceForm today={todayISO()} assets={assets} />
          </section>
        </div>
      </div>
    </>
  );
}
