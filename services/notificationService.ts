import { prisma } from "@/lib/db/prisma";

export function listNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export function markAsRead(userId: string, id: string) {
  return prisma.notification.update({ where: { id, userId }, data: { isRead: true } });
}

export function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export function createNotification(
  userId: string,
  data: { type: string; title: string; message: string; link?: string }
) {
  return prisma.notification.create({ data: { ...data, userId } });
}
