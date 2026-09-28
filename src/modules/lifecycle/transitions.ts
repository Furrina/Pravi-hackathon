import type { LifecycleStatus } from "@/lib/types";

/**
 * The only lifecycle transitions the system permits.
 *
 *   Planned → Under Construction → Operational ⇄ Under Maintenance
 *                                       ↓
 *                                    Retired → Decommissioned
 */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  Planned: ["Under Construction"],
  "Under Construction": ["Operational"],
  Operational: ["Under Maintenance", "Retired"],
  "Under Maintenance": ["Operational"],
  Retired: ["Decommissioned"],
  Decommissioned: [],
};

export function allowedTransitions(from: LifecycleStatus): LifecycleStatus[] {
  return LIFECYCLE_TRANSITIONS[from] ?? [];
}

export function isValidTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/** Transitions only an Administrator may perform. */
export const RESTRICTED_TARGETS: LifecycleStatus[] = ["Retired", "Decommissioned"];

export function isRestrictedTransition(to: LifecycleStatus): boolean {
  return RESTRICTED_TARGETS.includes(to);
}
