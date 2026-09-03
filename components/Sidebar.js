"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import Logo from "./Logo";
import { UsersIcon, ClipboardIcon, LogoutIcon, MenuIcon, CloseIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Visitors", icon: ClipboardIcon, adminOnly: false },
  { href: "/admin/users", label: "Manage Users", icon: UsersIcon, adminOnly: true },
];

function SidebarBody({ user, pathname, onNavigate, onLogout, loggingOut }) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon width={18} height={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3">
        {user && (
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
              {(user.name || user.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-slate-800">{user.name || user.email}</p>
              <p className="text-xs capitalize text-slate-400">{user.role}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          <LogoutIcon width={18} height={18} />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer automatically if the viewport is resized up past
  // the breakpoint (e.g. rotating a tablet, or a desktop window resize).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => setDrawerOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <>
      {/* Mobile top bar: hamburger trigger, sticky so it stays reachable while scrolling long tables */}
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Mobile slide-in drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarBody
              user={user}
              pathname={pathname}
              onNavigate={() => setDrawerOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      )}

      {/* Desktop static sidebar */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-5">
          <Logo size="sm" />
        </div>
        <SidebarBody user={user} pathname={pathname} onLogout={handleLogout} loggingOut={loggingOut} />
      </aside>
    </>
  );
}
