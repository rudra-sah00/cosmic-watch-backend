import { z } from 'zod';

// ── Watchlist Schemas ─────────────────────────────────────────
export const addWatchlistSchema = z.object({
  asteroidId: z.string().min(1, 'Asteroid ID is required'),
  asteroidName: z.string().min(1, 'Asteroid name is required'),
  alertOnApproach: z.boolean().optional().default(true),
  alertDistanceKm: z.number().positive().optional().default(7500000),
});

// ── Pagination Schema ─────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ── Type exports ──────────────────────────────────────────────
export type AddWatchlistInput = z.infer<typeof addWatchlistSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
