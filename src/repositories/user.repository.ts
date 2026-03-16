import { PrismaClient, Role, User } from "@prisma/client";

const prisma = new PrismaClient();

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        managerLocations: { include: { location: true } },
        staffLocations: { include: { location: true } },
        staffSkills: { include: { skill: true } },
        desiredHours: true,
      },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        managerLocations: { include: { location: true } },
        staffLocations: { include: { location: true } },
        staffSkills: { include: { skill: true } },
      },
    });
  },

  findMany(filters: { role?: Role; locationId?: string; locationIds?: string[] }) {
    const where: Record<string, unknown> = {};
    if (filters.role) where.role = filters.role;
    if (filters.locationIds && filters.locationIds.length > 0) {
      where.OR = [
        { staffLocations: { some: { locationId: { in: filters.locationIds } } } },
        { managerLocations: { some: { locationId: { in: filters.locationIds } } } },
      ];
    } else if (filters.locationId) {
      where.OR = [
        { staffLocations: { some: { locationId: filters.locationId } } },
        { managerLocations: { some: { locationId: filters.locationId } } },
      ];
    }
    return prisma.user.findMany({
      where,
      include: {
        staffLocations: { include: { location: true } },
        staffSkills: { include: { skill: true } },
        desiredHours: true,
      },
    });
  },

  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: Role;
  }) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Partial<Pick<User, "firstName" | "lastName" | "email">>) {
    return prisma.user.update({ where: { id }, data });
  },

  getManagerLocationIds(userId: string): Promise<string[]> {
    return prisma.managerLocation
      .findMany({ where: { userId }, select: { locationId: true } })
      .then((rows: { locationId: string }[]) => rows.map((r: { locationId: string }) => r.locationId));
  },

  getStaffLocationIds(userId: string): Promise<string[]> {
    return prisma.staffLocationCertification
      .findMany({ where: { userId }, select: { locationId: true } })
      .then((rows: { locationId: string }[]) => rows.map((r: { locationId: string }) => r.locationId));
  },

  getStaffSkillIds(userId: string): Promise<string[]> {
    return prisma.staffSkill
      .findMany({ where: { userId }, select: { skillId: true } })
      .then((rows: { skillId: string }[]) => rows.map((r: { skillId: string }) => r.skillId));
  },

  async getAdminAndManagerIdsForLocation(locationId: string): Promise<string[]> {
    const [admins, managers] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
      prisma.managerLocation.findMany({ where: { locationId }, select: { userId: true } }),
    ]);
    const ids = new Set<string>();
    admins.forEach((u) => ids.add(u.id));
    managers.forEach((m) => ids.add(m.userId));
    return Array.from(ids);
  },
};
