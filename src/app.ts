import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config';
import { errorHandler, globalLimiter } from './middlewares';
import routes from './routes';
import { logger } from './utils';

export function createApp(): Application {
  const app = express();

  // ── Security Middleware ──────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Rate Limiting ───────────────────────────────────────────
  app.use(globalLimiter);

  // ── Body Parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Compression ─────────────────────────────────────────────
  app.use(compression());

  // ── HTTP Request Logging (Pino) ─────────────────────────────
  app.use(pinoHttp({ logger, autoLogging: true }));

  // ── API Routes ──────────────────────────────────────────────
  app.use(`/api/${env.apiVersion}`, routes);

  // ── Root Endpoint ───────────────────────────────────────────
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: '🌌 Cosmic Watch API',
      version: '1.0.0',
      description: 'Interstellar Asteroid Tracker & Risk Analyser',
      documentation: `/api/${env.apiVersion}/health`,
    });
  });

  // ── 404 Handler ─────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // ── Global Error Handler ────────────────────────────────────
  app.use(errorHandler);

  return app;
}
