import Link from "next/link";
import { canManageAssets, requireUser } from "@/lib/auth";
import { getReferenceData } from "@/modules/assets/queries";
import { createAssetAction } from "@/modules/assets/actions";
import { AssetForm } from "../AssetForm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register Asset · Asset Management System" };

export default async function NewAssetPage() {
  const user = await requireUser();
  const reference = await getReferenceData();

  if (!canManageAssets(user)) {
    return (
      <>
        <PageHeader title="Register Asset" />
        <div className="gov-card p-6">
          <p className="text-sm text-slate-700">
            Your role ({user.role}) does not permit registering new assets. Contact an
            Administrator to have the asset added to the register.
          </p>
          <Link href="/assets" className="gov-btn-secondary mt-4">
            Back to registry
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Register Asset"
        description="Add a new infrastructure asset to the state register."
      />
      <AssetForm
        mode="create"
        action={createAssetAction}
        departments={reference.departments}
        districts={reference.districts}
        assetClasses={reference.assetClasses}
      />
    </>
  );
}
