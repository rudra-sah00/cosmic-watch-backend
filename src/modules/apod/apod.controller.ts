import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { ApodService } from './apod.service';

export const ApodController = {
  /**
   * GET /api/v1/apod/today
   * Query: date (optional, YYYY-MM-DD)
   */
  async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query as Record<string, string>;
      const data = await ApodService.getToday(date);
      ApiResponseHelper.success(res, data, 'Astronomy Picture of the Day retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/apod/random
   * Query: count (default 5, max 10)
   */
  async getRandom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = req.query.count ? parseInt(req.query.count as string, 10) : 5;
      const data = await ApodService.getRandom(count);
      ApiResponseHelper.success(res, data, 'Random APODs retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/apod/range
   * Query: start_date, end_date
   */
  async getRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as Record<string, string>;
      if (!start_date || !end_date) {
        res.status(400).json({
          success: false,
          message: 'start_date and end_date are required (YYYY-MM-DD)',
        });
        return;
      }
      const data = await ApodService.getRange(start_date, end_date);
      ApiResponseHelper.success(res, data, 'APOD date range retrieved');
    } catch (error) {
      next(error);
    }
  },
};
