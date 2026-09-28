import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/modules/dashboard/queries";
import { LifecycleBadge, MaintenanceBadge } from "@/components/Badges";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Asset Management System" };

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: string;
}) {
  return (
    <Link href={href} className="gov-card block p-4 transition-colors hover:border-gov">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();

  const maxCount = Math.max(1, ...data.byDepartment.map((d) => d.asset_count));

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.fullName}`}
        description="Summary of the state infrastructure asset register."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assets" value={data.totalAssets} href="/assets" tone="text-slate-900" />
        <StatCard
          label="Operational"
          value={data.operational}
          href="/assets?lifecycle=Operational"
          tone="text-emerald-700"
        />
        <StatCard
          label="Under Maintenance"
          value={data.underMaintenance}
          href="/assets?lifecycle=Under+Maintenance"
          tone="text-blue-700"
        />
        <StatCard
          label="Poor / Critical Condition"
          value={data.poorOrCritical}
          href="/assets?condition=Critical"
          tone="text-red-700"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="gov-card">
          <h2 className="gov-section-title">Assets by Department</h2>
          {data.byDepartment.length === 0 ? (
            <EmptyState message="No departments have been configured yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.byDepartment.map((row) => (
                <li key={row.department_id} className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/assets?department=${row.department_id}`}
                      className="font-medium text-gov hover:underline"
                    >
                      {row.department_name}
                    </Link>
                    <span className="tabular-nums text-slate-700">{row.asset_count}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded bg-slate-100">
                    <div
                      className="h-1.5 rounded bg-gov"
                      style={{ width: `${(row.asset_count / maxCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gov-card">
          <h2 className="gov-section-title">Recent Lifecycle Events</h2>
          {data.recentEvents.length === 0 ? (
            <EmptyState message="No lifecycle events recorded yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentEvents.map((event) => (
                <li key={event.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/assets/${event.asset_id}`}
                      className="font-medium text-gov hover:underline"
                    >
                      {event.asset_code}
                    </Link>
                    <span className="text-slate-600">{event.asset_name}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {event.previous_status ? (
                      <>
                        <LifecycleBadge status={event.previous_status} />
                        <span aria-hidden className="text-slate-400">
                          →
                        </span>
                      </>
                    ) : null}
                    <LifecycleBadge status={event.new_status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatDateTime(event.occurred_at)} · {event.performed_by_name ?? "System"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="gov-card mt-6">
        <h2 className="gov-section-title">Maintenance Due (next 90 days)</h2>
        {data.maintenanceDue.length === 0 ? (
          <EmptyState message="No maintenance is due in the next 90 days." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="gov-th">Asset ID</th>
                  <th className="gov-th">Name</th>
                  <th className="gov-th">Status</th>
                  <th className="gov-th">Assigned Officer</th>
                  <th className="gov-th">Next Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.maintenanceDue.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="gov-td">
                      <Link href={`/assets/${row.asset_id}`} className="font-medium text-gov hover:underline">
                        {row.asset_code}
                      </Link>
                    </td>
                    <td className="gov-td">{row.asset_name}</td>
                    <td className="gov-td">
                      <MaintenanceBadge status={row.status} />
                    </td>
                    <td className="gov-td">{row.assigned_officer ?? "—"}</td>
                    <td className="gov-td">{formatDate(row.next_maintenance_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
