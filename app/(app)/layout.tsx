import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { countUnread } from "@/services/notificationService";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [unreadCount, user] = await Promise.all([
    countUnread(session.user.id).catch(() => 0),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden md:flex" isAdmin={user?.role === "admin"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
