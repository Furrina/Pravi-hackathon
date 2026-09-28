import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/modules/auth/actions";
import { NavLinks } from "@/components/NavLinks";
import { RoleBadge } from "@/components/Badges";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-gov text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="leading-tight">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-blue-100">
              Government of Gujarat
            </span>
            <span className="block text-base font-semibold">
              Infrastructure Asset Management System
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <span className="block font-medium">{user.fullName}</span>
              <span className="block text-xs text-blue-100">{user.email}</span>
            </div>
            <RoleBadge role={user.role} />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded border border-blue-200 px-3 py-1.5 text-sm font-medium text-white hover:bg-gov-dark"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-blue-500/40 bg-gov">
          <div className="mx-auto max-w-7xl px-2 py-1">
            <NavLinks />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 text-xs text-slate-500">
          Internal use only. All asset changes are recorded in the audit log.
        </div>
      </footer>
    </div>
  );
}
