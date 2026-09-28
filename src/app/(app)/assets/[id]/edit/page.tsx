import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageAssets, requireUser } from "@/lib/auth";
import { getAssetDetail, getReferenceData } from "@/modules/assets/queries";
import { updateAssetAction } from "@/modules/assets/actions";
import { AssetForm } from "../../AssetForm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Asset · Asset Management System" };

export default async function EditAssetPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const [detail, reference] = await Promise.all([
    getAssetDetail(params.id),
    getReferenceData(),
  ]);

  if (!detail) notFound();

  if (!canManageAssets(user)) {
    return (
      <>
        <PageHeader title={`Edit ${detail.asset.asset_code}`} />
        <div className="gov-card p-6">
          <p className="text-sm text-slate-700">
            Your role ({user.role}) does not permit editing asset records. Officers may still
            record lifecycle changes, inspections and maintenance from the asset page.
          </p>
          <Link href={`/assets/${detail.asset.id}`} className="gov-btn-secondary mt-4">
            Back to asset
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${detail.asset.asset_code}`}
        description={detail.asset.name}
      />
      <AssetForm
        mode="edit"
        action={updateAssetAction}
        departments={reference.departments}
        districts={reference.districts}
        assetClasses={reference.assetClasses}
        asset={detail.asset}
        attributes={detail.attributes}
        lockedLifecycle={detail.asset.lifecycle_status}
      />
    </>
  );
}
