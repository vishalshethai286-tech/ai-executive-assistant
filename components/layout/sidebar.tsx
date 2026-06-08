"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { navItems } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ className, isAdmin = false }: { className?: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-border bg-card", className)}>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">AI Executive</p>
          <p className="text-xs text-muted-foreground leading-tight">Assistant</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
        Your chief-of-staff, always on.
      </div>
    </aside>
  );
}
