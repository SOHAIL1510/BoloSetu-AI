import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DATABASE_URL, or fall back to a dummy connection string template during build compilation
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:password@ep-host-pooled.us-east-2.aws.neon.tech/neondb?sslmode=require";

const adapter = new PrismaNeon({ connectionString });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
