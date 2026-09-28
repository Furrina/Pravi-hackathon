import Link from "next/link";
import { canManageAssets, requireUser } from "@/lib/auth";
import { getReferenceData, listAssets, PAGE_SIZE } from "@/modules/assets/queries";
import { AssetFilters } from "./AssetFilters";
import { Pagination } from "@/components/Pagination";
import { ConditionBadge, LifecycleBadge } from "@/components/Badges";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asset Registry · Asset Management System" };

interface SearchParams {
  q?: string;
  department?: string;
  assetClass?: string;
  district?: string;
  lifecycle?: string;
  condition?: string;
  page?: string;
}

export default async function AssetsPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const page = Number.parseInt(params.page ?? "1", 10);

  const [reference, result] = await Promise.all([
    getReferenceData(),
    listAssets({
      q: params.q,
      department: params.department,
      assetClass: params.assetClass,
      district: params.district,
      lifecycle: params.lifecycle,
      condition: params.condition,
      page: Number.isFinite(page) ? page : 1,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Asset Registry"
        description="Search and filter registered infrastructure assets."
        actions={
          canManageAssets(user) ? (
            <Link href="/assets/new" className="gov-btn-primary">
              Register asset
            </Link>
          ) : (
            <span className="self-center text-sm text-slate-500">
              Asset registration is restricted to Administrators.
            </span>
          )
        }
      />

      <AssetFilters
        departments={reference.departments}
        districts={reference.districts}
        assetClasses={reference.assetClasses}
        current={params}
      />

      <div className="gov-card overflow-hidden">
        {result.rows.length === 0 ? (
          <EmptyState message="No assets match the current search and filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="gov-th">Asset ID</th>
                  <th className="gov-th">Name</th>
                  <th className="gov-th">Asset Class</th>
                  <th className="gov-th">Department</th>
                  <th className="gov-th">District</th>
                  <th className="gov-th">Lifecycle</th>
                  <th className="gov-th">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="gov-td">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-medium text-gov hover:underline"
                      >
                        {asset.asset_code}
                      </Link>
                    </td>
                    <td className="gov-td">
                      <Link href={`/assets/${asset.id}`} className="hover:underline">
                        {asset.name}
                      </Link>
                    </td>
                    <td className="gov-td">{asset.asset_classes?.name ?? "—"}</td>
                    <td className="gov-td">{asset.departments?.name ?? "—"}</td>
                    <td className="gov-td">{asset.districts?.name ?? "—"}</td>
                    <td className="gov-td">
                      <LifecycleBadge status={asset.lifecycle_status} />
                    </td>
                    <td className="gov-td">
                      <ConditionBadge condition={asset.condition} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/assets"
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={PAGE_SIZE}
          params={{
            q: params.q,
            department: params.department,
            assetClass: params.assetClass,
            district: params.district,
            lifecycle: params.lifecycle,
            condition: params.condition,
          }}
        />
      </div>
    </>
  );
}
