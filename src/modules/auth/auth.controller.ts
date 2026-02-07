import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

export const AuthController = {
  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ApiResponseHelper.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ApiResponseHelper.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getProfile(req.user!.id);
      ApiResponseHelper.success(res, user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshToken(refreshToken);
      ApiResponseHelper.success(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
};
