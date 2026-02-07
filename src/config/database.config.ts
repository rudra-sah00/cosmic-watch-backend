import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { dbLogger } from '../utils/logger';
import { env, isDev } from './env.config';

// ── PostgreSQL Connection Pool ────────────────────────────────
const pool = new Pool({
  connectionString: env.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Prisma v7 Driver Adapter ──────────────────────────────────
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (isDev) globalForPrisma.prisma = prisma;

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    dbLogger.info('Database connected successfully');
  } catch (error) {
    dbLogger.fatal({ err: error }, 'Database connection failed');
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  dbLogger.info('Database disconnected');
}
