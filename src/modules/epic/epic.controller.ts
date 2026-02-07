import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { EpicService } from './epic.service';

export const EpicController = {
  /**
   * GET /api/v1/epic/natural
   * Query: date (optional, YYYY-MM-DD)
   */
  async getNatural(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query as Record<string, string>;
      const data = await EpicService.getNatural(date);
      ApiResponseHelper.success(res, data, 'EPIC natural color Earth images retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/epic/enhanced
   * Query: date (optional, YYYY-MM-DD)
   */
  async getEnhanced(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query as Record<string, string>;
      const data = await EpicService.getEnhanced(date);
      ApiResponseHelper.success(res, data, 'EPIC enhanced color Earth images retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/epic/dates
   * Query: type (natural | enhanced, default: natural)
   */
  async getAvailableDates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = (req.query.type as string) === 'enhanced' ? 'enhanced' : 'natural';
      const dates = await EpicService.getAvailableDates(type);
      ApiResponseHelper.success(res, { type, dates }, 'EPIC available dates retrieved');
    } catch (error) {
      next(error);
    }
  },
};
