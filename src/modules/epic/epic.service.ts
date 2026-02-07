import axios from 'axios';
import { env } from '../../config';
import { neoLogger } from '../../utils';
import type { EpicImage, EpicImageRaw, EpicResponse } from './epic.types';

const EPIC_CLIENT = axios.create({
  baseURL: env.nasa.epicBaseUrl,
  timeout: 15000,
});

const epicLogger = neoLogger.child({ submodule: 'epic' });

function transformImage(raw: EpicImageRaw, type: 'natural' | 'enhanced'): EpicImage {
  // Construct image URL: https://epic.gsfc.nasa.gov/archive/{type}/{year}/{month}/{day}/png/{image}.png
  const dateStr = raw.date.split(' ')[0]; // "2024-01-15"
  const [year, month, day] = dateStr.split('-');
  const imageUrl = `https://epic.gsfc.nasa.gov/archive/${type}/${year}/${month}/${day}/png/${raw.image}.png`;

  return {
    identifier: raw.identifier,
    caption: raw.caption,
    imageFilename: raw.image,
    version: raw.version,
    date: raw.date,
    imageUrl,
    centroidCoordinates: {
      latitude: raw.centroid_coordinates.lat,
      longitude: raw.centroid_coordinates.lon,
    },
    dscovrPosition: raw.dscovr_j2000_position,
    lunarPosition: raw.lunar_j2000_position,
    sunPosition: raw.sun_j2000_position,
    attitudeQuaternions: raw.attitude_quaternions,
  };
}

export const EpicService = {
  /**
   * Get latest natural color Earth images
   */
  async getNatural(date?: string): Promise<EpicResponse> {
    try {
      const endpoint = date ? `/api/natural/date/${date}` : '/api/natural';
      const { data } = await EPIC_CLIENT.get<EpicImageRaw[]>(endpoint);

      const images = data.map((img) => transformImage(img, 'natural'));

      epicLogger.info({ count: images.length }, 'EPIC natural images retrieved');

      return { totalCount: images.length, imageType: 'natural', images };
    } catch (error) {
      epicLogger.error({ err: error }, 'EPIC natural image request failed');
      throw error;
    }
  },

  /**
   * Get latest enhanced color Earth images
   */
  async getEnhanced(date?: string): Promise<EpicResponse> {
    try {
      const endpoint = date ? `/api/enhanced/date/${date}` : '/api/enhanced';
      const { data } = await EPIC_CLIENT.get<EpicImageRaw[]>(endpoint);

      const images = data.map((img) => transformImage(img, 'enhanced'));

      epicLogger.info({ count: images.length }, 'EPIC enhanced images retrieved');

      return { totalCount: images.length, imageType: 'enhanced', images };
    } catch (error) {
      epicLogger.error({ err: error }, 'EPIC enhanced image request failed');
      throw error;
    }
  },

  /**
   * Get available dates for natural or enhanced images
   */
  async getAvailableDates(type: 'natural' | 'enhanced' = 'natural'): Promise<string[]> {
    try {
      const { data } = await EPIC_CLIENT.get<{ date: string }[]>(`/api/${type}/available`);
      return data.map((d) => d.date);
    } catch (error) {
      epicLogger.error({ err: error }, 'EPIC available dates request failed');
      throw error;
    }
  },
};
