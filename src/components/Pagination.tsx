import Link from "next/link";

interface Props {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
  basePath: string;
}

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ page, pageCount, total, pageSize, params, basePath }: Props) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <p className="text-slate-600">
        Showing <span className="font-medium">{first}</span>–
        <span className="font-medium">{last}</span> of{" "}
        <span className="font-medium">{total}</span> records
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={buildHref(basePath, params, page - 1)} className="gov-btn-secondary">
            Previous
          </Link>
        ) : (
          <span className="gov-btn-secondary cursor-not-allowed opacity-50">Previous</span>
        )}

        <span className="text-slate-600">
          Page {page} of {pageCount}
        </span>

        {page < pageCount ? (
          <Link href={buildHref(basePath, params, page + 1)} className="gov-btn-secondary">
            Next
          </Link>
        ) : (
          <span className="gov-btn-secondary cursor-not-allowed opacity-50">Next</span>
        )}
      </div>
    </div>
  );
}
