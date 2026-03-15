import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const notificationRepository = {
  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  findManyByUserId(userId: string, options?: { unreadOnly?: boolean; limit?: number; offset?: number }) {
    const where: Record<string, unknown> = { userId };
    if (options?.unreadOnly) where.readAt = null;
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  },

  countUnreadByUserId(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },

  create(data: { userId: string; type: string; title: string; body?: string; metadata?: Record<string, unknown> }) {
    return prisma.notification.create({
      data: { ...data, metadata: data.metadata as Prisma.InputJsonValue | undefined },
    });
  },

  createMany(data: Array<{ userId: string; type: string; title: string; body?: string; metadata?: Record<string, unknown> }>) {
    return prisma.notification.createMany({
      data: data.map((d) => ({ ...d, metadata: d.metadata as Prisma.InputJsonValue | undefined })),
    });
  },

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  },

  markAllReadByUserId(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
