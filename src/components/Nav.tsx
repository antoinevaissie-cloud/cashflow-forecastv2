"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/receivables", label: "Receivables" },
  { href: "/payables", label: "Payables" },
  { href: "/balances", label: "Balances" },
  { href: "/budget", label: "Budget" },
  { href: "/forecast", label: "Forecast" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <div className="flex gap-1">
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2 rounded transition-colors outline-offset-2 hover:bg-gray-100 focus:bg-gray-100 ${
                active ? "bg-gray-200 text-gray-900" : "text-gray-700"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      
      <div className="flex items-center gap-3 ml-4 border-l border-gray-200 pl-4">
        <div className="flex items-center gap-2">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-gray-700">{session.user?.name}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="px-3 py-2 rounded text-gray-700 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
