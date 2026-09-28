import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAssetOptions } from "@/modules/assets/queries";
import { INSPECTION_PAGE_SIZE, listInspections } from "@/modules/inspections/queries";
import { InspectionForm } from "@/components/forms/InspectionForm";
import { ConditionBadge } from "@/components/Badges";
import { Pagination } from "@/components/Pagination";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatText, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inspections · Asset Management System" };

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  await requireUser();
  const page = Number.parseInt(searchParams?.page ?? "1", 10);

  const [assets, result] = await Promise.all([
    listAssetOptions(),
    listInspections(Number.isFinite(page) ? page : 1),
  ]);

  return (
    <>
      <PageHeader
        title="Inspections"
        description="Condition assessments recorded against registered assets."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="gov-card overflow-hidden">
            {result.rows.length === 0 ? (
              <EmptyState message="No inspections have been recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="gov-th">Date</th>
                      <th className="gov-th">Asset</th>
                      <th className="gov-th">Condition</th>
                      <th className="gov-th">Inspector</th>
                      <th className="gov-th">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="gov-td whitespace-nowrap">
                          {formatDate(row.inspected_on)}
                        </td>
                        <td className="gov-td">
                          <Link
                            href={`/assets/${row.asset_id}`}
                            className="font-medium text-gov hover:underline"
                          >
                            {row.asset_code}
                          </Link>
                          <span className="block text-xs text-slate-500">{row.asset_name}</span>
                        </td>
                        <td className="gov-td">
                          <ConditionBadge condition={row.condition} />
                        </td>
                        <td className="gov-td">{formatText(row.inspector_name)}</td>
                        <td className="gov-td max-w-sm">
                          {formatText(row.recommended_action)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              basePath="/inspections"
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              pageSize={INSPECTION_PAGE_SIZE}
              params={{}}
            />
          </div>
        </div>

        <div>
          <section className="gov-card">
            <h2 className="gov-section-title">Record an Inspection</h2>
            <InspectionForm today={todayISO()} assets={assets} />
          </section>
        </div>
      </div>
    </>
  );
}
