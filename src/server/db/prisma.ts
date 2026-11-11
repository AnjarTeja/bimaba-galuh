import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../../generated/prisma/client";
import { getEnvironment } from "../config/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const environment = getEnvironment();
  const adapter = new PrismaMariaDb({
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    user: environment.DATABASE_USER,
    password: environment.DATABASE_PASSWORD,
    database: environment.DATABASE_NAME,
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (getEnvironment().NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}