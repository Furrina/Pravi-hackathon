import Link from "next/link";
import type { AssetClass, Department, District } from "@/lib/types";
import { CONDITIONS, LIFECYCLE_STATUSES } from "@/lib/types";

interface Props {
  departments: Department[];
  districts: District[];
  assetClasses: AssetClass[];
  current: {
    q?: string;
    department?: string;
    assetClass?: string;
    district?: string;
    lifecycle?: string;
    condition?: string;
  };
}

/**
 * Plain GET form: filtering and pagination stay in the URL and every query
 * runs on the server.
 */
export function AssetFilters({ departments, districts, assetClasses, current }: Props) {
  const classesForDepartment = current.department
    ? assetClasses.filter((c) => c.department_id === current.department)
    : assetClasses;

  return (
    <form method="get" action="/assets" className="gov-card mb-5 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <label htmlFor="q" className="gov-label">
            Search by Asset ID or name
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={current.q ?? ""}
            placeholder="e.g. RT-HW-0001 or Civil Hospital"
            className="gov-input"
          />
        </div>

        <div>
          <label htmlFor="department" className="gov-label">
            Department
          </label>
          <select
            id="department"
            name="department"
            defaultValue={current.department ?? ""}
            className="gov-input"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assetClass" className="gov-label">
            Asset Class
          </label>
          <select
            id="assetClass"
            name="assetClass"
            defaultValue={current.assetClass ?? ""}
            className="gov-input"
          >
            <option value="">All classes</option>
            {classesForDepartment.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="district" className="gov-label">
            District
          </label>
          <select
            id="district"
            name="district"
            defaultValue={current.district ?? ""}
            className="gov-input"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lifecycle" className="gov-label">
            Lifecycle Status
          </label>
          <select
            id="lifecycle"
            name="lifecycle"
            defaultValue={current.lifecycle ?? ""}
            className="gov-input"
          >
            <option value="">All statuses</option>
            {LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="condition" className="gov-label">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            defaultValue={current.condition ?? ""}
            className="gov-input"
          >
            <option value="">All conditions</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="gov-btn-primary">
          Apply filters
        </button>
        <Link href="/assets" className="gov-btn-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}
