import http from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase, env } from './config';
import { NeoService } from './modules/neo/neo.service';
import { logger } from './utils';
import { initializeSocket } from './websocket';

async function bootstrap(): Promise<void> {
  // ── Create Express App ────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);

  // ── Initialize Socket.io ──────────────────────────────────────
  initializeSocket(server);

  // ── Connect to Database ───────────────────────────────────────
  await connectDatabase();

  // ── Connect to Python Risk Engine ─────────────────────────────
  await NeoService.connectRiskEngine();

  // ── Start Server ──────────────────────────────────────────────
  server.listen(env.port, () => {
    logger.info(
      {
        port: env.port,
        env: env.node_env,
        api: `/api/${env.apiVersion}`,
        websocket: true,
      },
      '🌌 Cosmic Watch API Server started'
    );
  });

  // ── Graceful Shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal — starting graceful shutdown');

    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force kill after 10 seconds
    setTimeout(() => {
      logger.fatal('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Unhandled Errors ──────────────────────────────────────────
  process.on('unhandledRejection', (reason: Error) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
