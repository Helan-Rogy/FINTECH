"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  FileText,
  Briefcase,
  LogOut,
  Activity,
  HelpCircle,
} from "lucide-react";

interface SidebarProps {
  role: "user" | "analyst" | "admin";
  email: string;
}

const userNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/fraud", label: "Fraud Check", icon: ShieldAlert },
  { href: "/dashboard/risk", label: "Risk Score", icon: TrendingUp },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/assistant", label: "Help Assistant", icon: HelpCircle },
];

const analystNav = [
  { href: "/analyst", label: "Overview", icon: Activity },
  { href: "/analyst/cases", label: "Cases", icon: Briefcase },
];

export function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "user" ? userNav : analystNav;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shrink-0">
          <ShieldAlert size={14} className="text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground text-sm tracking-wide">FinTech AI</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        <p className="text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider font-medium">
          {role === "user" ? "My Workspace" : "Analyst Workspace"}
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground truncate mb-3">{email}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
