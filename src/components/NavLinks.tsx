"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Asset Registry" },
  { href: "/inspections", label: "Inspections" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/audit-logs", label: "Audit Log" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-white text-gov-dark"
                : "text-blue-50 hover:bg-gov-dark hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
