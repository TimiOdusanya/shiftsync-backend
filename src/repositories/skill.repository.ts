import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const skillRepository = {
  findById(id: string) {
    return prisma.skill.findUnique({ where: { id } });
  },

  findByName(name: string) {
    return prisma.skill.findUnique({ where: { name } });
  },

  findMany() {
    return prisma.skill.findMany({ orderBy: { name: "asc" } });
  },

  findManyByIds(ids: string[]) {
    return prisma.skill.findMany({ where: { id: { in: ids } } });
  },
};
