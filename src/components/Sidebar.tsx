"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/patients", label: "Patients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/clinical", label: "Clinical" },
  { href: "/billing", label: "Billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-screen sticky top-0 w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
      <div className="px-6 py-4 border-b">
        <Link href="/" className="text-xl font-bold text-gray-900">
          EHR Dashboard
        </Link>
        <div className="mt-1 text-xs text-gray-500">SMART v1 • System App</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {nav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium mb-1 transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-gray-400 border-t">© {new Date().getFullYear()}</div>
    </aside>
  );
}
