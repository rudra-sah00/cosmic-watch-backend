import axios from 'axios';
import { env } from '../../config';
import { neoLogger } from '../../utils';
import type { ApodEntry, ApodRaw } from './apod.types';

const APOD_CLIENT = axios.create({
  baseURL: env.nasa.apodBaseUrl,
  timeout: 15000,
  params: { api_key: env.nasa.apiKey },
});

const apodLogger = neoLogger.child({ submodule: 'apod' });

function transformApod(raw: ApodRaw): ApodEntry {
  return {
    title: raw.title,
    date: raw.date,
    explanation: raw.explanation,
    mediaType: raw.media_type,
    url: raw.url,
    hdUrl: raw.hdurl || null,
    thumbnailUrl: raw.thumbnail_url || null,
    copyright: raw.copyright || null,
  };
}

export const ApodService = {
  /**
   * Get today's APOD or a specific date
   */
  async getToday(date?: string): Promise<ApodEntry> {
    try {
      const params: Record<string, unknown> = { thumbs: true };
      if (date) params.date = date;

      const { data } = await APOD_CLIENT.get<ApodRaw>('/apod', { params });

      apodLogger.info({ date: data.date, title: data.title }, 'APOD retrieved');

      return transformApod(data);
    } catch (error) {
      apodLogger.error({ err: error }, 'APOD request failed');
      throw error;
    }
  },

  /**
   * Get random APOD(s)
   */
  async getRandom(count: number = 5): Promise<ApodEntry[]> {
    try {
      const clampedCount = Math.min(Math.max(1, count), 10);
      const { data } = await APOD_CLIENT.get<ApodRaw[]>('/apod', {
        params: { count: clampedCount, thumbs: true },
      });

      apodLogger.info({ count: data.length }, 'Random APODs retrieved');

      return data.map(transformApod);
    } catch (error) {
      apodLogger.error({ err: error }, 'APOD random request failed');
      throw error;
    }
  },

  /**
   * Get APOD for a date range
   */
  async getRange(startDate: string, endDate: string): Promise<ApodEntry[]> {
    try {
      const { data } = await APOD_CLIENT.get<ApodRaw[]>('/apod', {
        params: { start_date: startDate, end_date: endDate, thumbs: true },
      });

      apodLogger.info({ count: data.length }, 'APOD range retrieved');

      return data.map(transformApod);
    } catch (error) {
      apodLogger.error({ err: error }, 'APOD range request failed');
      throw error;
    }
  },
};
