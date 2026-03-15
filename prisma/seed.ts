import { runSeed } from "../scripts/seed";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

runSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
