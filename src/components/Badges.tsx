import type { Condition, LifecycleStatus, MaintenanceStatus } from "@/lib/types";

const BASE =
  "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const LIFECYCLE_TONES: Record<LifecycleStatus, string> = {
  Planned: "border-slate-300 bg-slate-100 text-slate-700",
  "Under Construction": "border-amber-300 bg-amber-50 text-amber-800",
  Operational: "border-emerald-300 bg-emerald-50 text-emerald-800",
  "Under Maintenance": "border-blue-300 bg-blue-50 text-blue-800",
  Retired: "border-orange-300 bg-orange-50 text-orange-800",
  Decommissioned: "border-slate-400 bg-slate-200 text-slate-700",
};

const CONDITION_TONES: Record<Condition, string> = {
  Excellent: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Good: "border-green-300 bg-green-50 text-green-800",
  Fair: "border-amber-300 bg-amber-50 text-amber-800",
  Poor: "border-orange-300 bg-orange-50 text-orange-800",
  Critical: "border-red-300 bg-red-50 text-red-800",
};

const MAINTENANCE_TONES: Record<MaintenanceStatus, string> = {
  Scheduled: "border-slate-300 bg-slate-100 text-slate-700",
  "In Progress": "border-blue-300 bg-blue-50 text-blue-800",
  Completed: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const tone = LIFECYCLE_TONES[status] ?? "border-slate-300 bg-slate-100 text-slate-700";
  return <span className={`${BASE} ${tone}`}>{status}</span>;
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  const tone = CONDITION_TONES[condition] ?? "border-slate-300 bg-slate-100 text-slate-700";
  return <span className={`${BASE} ${tone}`}>{condition}</span>;
}

export function MaintenanceBadge({ status }: { status: MaintenanceStatus }) {
  const tone = MAINTENANCE_TONES[status] ?? "border-slate-300 bg-slate-100 text-slate-700";
  return <span className={`${BASE} ${tone}`}>{status}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`${BASE} border-slate-300 bg-white text-slate-700`}>{role}</span>
  );
}
