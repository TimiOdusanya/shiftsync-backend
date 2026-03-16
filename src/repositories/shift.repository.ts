import { PrismaClient, ScheduleState } from "@prisma/client";

const prisma = new PrismaClient();

export interface ShiftFilters {
  locationId?: string;
  locationIds?: string[];
  startDate?: Date;
  endDate?: Date;
  state?: ScheduleState;
  staffUserId?: string;
}

export const shiftRepository = {
  findById(id: string) {
    return prisma.shift.findUnique({
      where: { id },
      include: {
        location: true,
        skill: true,
        assignments: { include: { user: true } },
      },
    });
  },

  findMany(filters: ShiftFilters) {
    const and: Array<Record<string, unknown>> = [];
    if (filters.locationId) and.push({ locationId: filters.locationId });
    if (filters.locationIds && filters.locationIds.length > 0)
      and.push({ locationId: { in: filters.locationIds } });
    if (filters.staffUserId) {
      and.push({
        OR: [
          { scheduleState: ScheduleState.PUBLISHED },
          { assignments: { some: { userId: filters.staffUserId } } },
        ],
      });
    } else if (filters.state) {
      and.push({ scheduleState: filters.state });
    }
    if (filters.startDate) and.push({ startAt: { gte: filters.startDate } });
    if (filters.endDate) and.push({ endAt: { lte: filters.endDate } });
    const where = and.length > 0 ? { AND: and } : {};
    return prisma.shift.findMany({
      where,
      include: {
        location: true,
        skill: true,
        assignments: { include: { user: true } },
      },
      orderBy: { startAt: "asc" },
    });
  },

  create(data: {
    locationId: string;
    skillId: string;
    startAt: Date;
    endAt: Date;
    headcountRequired: number;
  }) {
    return prisma.shift.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      locationId: string;
      skillId: string;
      startAt: Date;
      endAt: Date;
      headcountRequired: number;
      scheduleState: ScheduleState;
      publishedAt: Date | null;
      editedAfterPublish: boolean;
    }>
  ) {
    return prisma.shift.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.shift.delete({ where: { id } });
  },

  findOverlappingForUser(userId: string, startAt: Date, endAt: Date, excludeShiftId?: string) {
    const where = {
      assignments: { some: { userId } },
      OR: [
        { startAt: { lt: endAt }, endAt: { gt: startAt } },
      ],
      ...(excludeShiftId && { id: { not: excludeShiftId } }),
    };
    return prisma.shift.findMany({
      where,
      include: { location: true, skill: true },
    });
  },
};
