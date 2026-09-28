import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AUDIT_PAGE_SIZE, listAuditLogs } from "@/modules/audit/queries";
import { AUDIT_ACTION_LABELS } from "@/modules/audit/log";
import { Pagination } from "@/components/Pagination";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Log · Asset Management System" };

function describeDetails(action: string, details: Record<string, unknown>): string {
  const from = details.from ?? details.condition_from;
  const to = details.to ?? details.condition_to;

  if (from && to) return `${String(from)} → ${String(to)}`;
  if (action === "ASSET_CREATED" || action === "ASSET_UPDATED") {
    return typeof details.name === "string" ? details.name : "—";
  }
  if (typeof details.description === "string") return details.description;
  if (typeof details.condition === "string") return `Condition: ${details.condition}`;
  return "—";
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: { page?: string; action?: string };
}) {
  await requireUser();
  const page = Number.parseInt(searchParams?.page ?? "1", 10);
  const action = searchParams?.action && AUDIT_ACTION_LABELS[searchParams.action]
    ? searchParams.action
    : undefined;

  const result = await listAuditLogs(Number.isFinite(page) ? page : 1, action);

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Append-only record of every significant change. Entries cannot be edited or deleted."
      />

      <form method="get" action="/audit-logs" className="gov-card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="action" className="gov-label">
            Filter by action
          </label>
          <select id="action" name="action" defaultValue={action ?? ""} className="gov-input">
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="gov-btn-primary">
          Apply
        </button>
        <Link href="/audit-logs" className="gov-btn-secondary">
          Reset
        </Link>
      </form>

      <div className="gov-card overflow-hidden">
        {result.rows.length === 0 ? (
          <EmptyState message="No audit entries recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="gov-th">Timestamp</th>
                  <th className="gov-th">User</th>
                  <th className="gov-th">Action</th>
                  <th className="gov-th">Entity</th>
                  <th className="gov-th">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="gov-td whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="gov-td">{row.actor_name}</td>
                    <td className="gov-td whitespace-nowrap">
                      {AUDIT_ACTION_LABELS[row.action] ?? row.action}
                    </td>
                    <td className="gov-td">
                      {row.asset_id ? (
                        <Link
                          href={`/assets/${row.asset_id}`}
                          className="font-medium text-gov hover:underline"
                        >
                          {row.asset_code ?? row.entity_type}
                        </Link>
                      ) : (
                        <span className="capitalize">{row.entity_type}</span>
                      )}
                    </td>
                    <td className="gov-td max-w-md">{describeDetails(row.action, row.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/audit-logs"
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={AUDIT_PAGE_SIZE}
          params={{ action }}
        />
      </div>
    </>
  );
}
