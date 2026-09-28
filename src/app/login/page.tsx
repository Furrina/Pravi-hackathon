import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Asset Management System" };

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { redirectTo?: string };
}) {
  const redirectTo = searchParams?.redirectTo?.startsWith("/")
    ? searchParams.redirectTo
    : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gov">
            Government of Gujarat
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Infrastructure Asset Management System
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            For authorised departmental users only.
          </p>
        </div>

        <div className="gov-card p-6">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Accounts are issued by the system administrator. Public registration is not available.
        </p>
      </div>
    </main>
  );
}
