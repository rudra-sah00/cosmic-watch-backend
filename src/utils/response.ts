import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ApiResponse, PaginationMeta } from '../modules/neo/neo.types';

export const ApiResponseHelper = {
  success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = StatusCodes.OK,
    meta?: PaginationMeta
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
  },

  created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponseHelper.success(res, data, message, StatusCodes.CREATED);
  },

  error(
    res: Response,
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    error?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error && { error }),
    };
    return res.status(statusCode).json(response);
  },

  noContent(res: Response): Response {
    return res.status(StatusCodes.NO_CONTENT).send();
  },
};
