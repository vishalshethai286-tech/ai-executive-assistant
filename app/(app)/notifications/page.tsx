import { requireUserId } from "@/lib/auth/session";
import { listNotifications } from "@/services/notificationService";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const notifications = await listNotifications(userId);

  return (
    <NotificationList
      notifications={notifications.map((n: (typeof notifications)[number]) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
