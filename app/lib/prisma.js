import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient(connectionString) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Returns the Prisma client. Created lazily on first use so `next build`
 * does not require DATABASE_URL at compile/collect-page-data time.
 */
const PRISMA_UNREACHABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "P1000",
  "P1001",
  "P1002",
  "P1017",
]);

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function isDatabaseUnreachable(error) {
  if (!error) {
    return false;
  }

  if (PRISMA_UNREACHABLE_CODES.has(error.code)) {
    return true;
  }

  const message = error.message || "";
  return (
    message.includes("ECONNREFUSED") ||
    message.includes("Can't reach database server")
  );
}

export function getPrisma() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  globalForPrisma.prisma = createPrismaClient(connectionString);
  return globalForPrisma.prisma;
}

/** @type {PrismaClient} */
const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getPrisma();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export default prisma;
