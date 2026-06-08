"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, Settings, Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { runQuickCommand } from "@/app/(app)/command/actions";
import { toast } from "sonner";

export function Topbar({
  userName,
  userEmail,
  userImage,
  unreadCount,
}: {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  unreadCount: number;
}) {
  const [command, setCommand] = useState("");
  const [pending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    startTransition(async () => {
      const result = await runQuickCommand(command);
      if (result.ok) {
        toast.success("Command processed", { description: result.message?.slice(0, 140) });
        setCommand("");
        router.refresh();
      } else {
        toast.error(result.error || "Couldn't process that command");
      }
    });
  }

  const initials = (userName || userEmail || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
      <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Ask your assistant — "Summarize my day", "Prepare me for my 3 PM meeting"…'
          className="pl-9"
          disabled={pending}
        />
      </form>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="block h-4 w-4 dark:hidden" />
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="Notifications">
          <a href="/notifications" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer rounded-full">
              <Avatar>
                <AvatarImage src={userImage ?? undefined} alt={userName ?? "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName || userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">
                <Settings className="h-4 w-4" /> Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
