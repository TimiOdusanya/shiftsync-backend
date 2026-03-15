import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const auditRepository = {
  create(data: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }) {
    return prisma.auditLog.create({
      data: {
        ...data,
        before: data.before as Prisma.InputJsonValue | undefined,
        after: data.after as Prisma.InputJsonValue | undefined,
      },
    });
  },

  findMany(filters: AuditFilters) {
    const where: Record<string, unknown> = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
    return prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
    });
  },

  findByShiftId(shiftId: string) {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Shift", entityId: shiftId },
          { entityType: "ShiftAssignment", entityId: { contains: shiftId } },
        ],
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findByDateRange(startDate: Date, endDate: Date, locationId?: string) {
    const where: Record<string, unknown> = {
      createdAt: { gte: startDate, lte: endDate },
    };
    return prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
  },
};
