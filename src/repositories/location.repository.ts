import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const locationRepository = {
  findById(id: string) {
    return prisma.location.findUnique({
      where: { id },
      include: { shifts: { include: { skill: true } } },
    });
  },

  findMany(ids?: string[]) {
    const where = ids?.length ? { id: { in: ids } } : undefined;
    return prisma.location.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  findManyForManager(managerId: string) {
    return prisma.location.findMany({
      where: { managerLocations: { some: { userId: managerId } } },
      orderBy: { name: "asc" },
    });
  },

  findManyForStaff(staffId: string) {
    return prisma.location.findMany({
      where: { staffCertifications: { some: { userId: staffId } } },
      orderBy: { name: "asc" },
    });
  },
};
