import axios from 'axios';
import { env, prisma } from '../../config';
import { neoLogger } from '../../utils';
import type { EnhancedRiskResult, NeoFeedResponse, NeoObject } from './neo.types';

const NASA_CLIENT = axios.create({
  baseURL: env.nasa.baseUrl,
  timeout: 15000,
  params: { api_key: env.nasa.apiKey },
});

const RISK_ENGINE_CLIENT = axios.create({
  baseURL: env.riskEngine.url,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Wait for the Python risk engine to become healthy.
 * Retries up to `maxRetries` times with exponential backoff.
 */
async function waitForRiskEngine(maxRetries = 5, baseDelayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await RISK_ENGINE_CLIENT.get('/health', { timeout: 5000 });
      neoLogger.info(
        { engine: data.engine, version: data.version },
        'Python risk engine is healthy'
      );
      return;
    } catch {
      const delay = baseDelayMs * attempt;
      neoLogger.warn(
        { attempt, maxRetries, nextRetryMs: delay },
        'Python risk engine not ready — retrying'
      );
      if (attempt === maxRetries) {
        neoLogger.error('Python risk engine failed to become healthy after all retries');
        throw new Error(
          `Risk engine unreachable at ${env.riskEngine.url} after ${maxRetries} attempts`
        );
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Cache asteroid data from feed response
 */
async function cacheAsteroids(feed: NeoFeedResponse): Promise<void> {
  const allAsteroids = Object.values(feed.near_earth_objects).flat();

  for (const asteroid of allAsteroids) {
    await prisma.cachedAsteroid.upsert({
      where: { neoReferenceId: asteroid.neo_reference_id },
      create: {
        neoReferenceId: asteroid.neo_reference_id,
        name: asteroid.name,
        absoluteMagnitude: asteroid.absolute_magnitude_h,
        isHazardous: asteroid.is_potentially_hazardous_asteroid,
        estimatedDiameterMin: asteroid.estimated_diameter.kilometers.estimated_diameter_min,
        estimatedDiameterMax: asteroid.estimated_diameter.kilometers.estimated_diameter_max,
        dataJson: JSON.parse(JSON.stringify(asteroid)),
      },
      update: {
        dataJson: JSON.parse(JSON.stringify(asteroid)),
        lastFetchedAt: new Date(),
      },
    });
  }

  neoLogger.info({ count: allAsteroids.length }, 'Cached asteroids from feed');
}

function isCacheFresh(lastFetched: Date, maxAgeMinutes: number): boolean {
  const ageMs = Date.now() - lastFetched.getTime();
  return ageMs < maxAgeMinutes * 60 * 1000;
}

export const NeoService = {
  /**
   * Verify the Python risk engine is reachable.
   * Called once during server bootstrap.
   */
  async connectRiskEngine(): Promise<void> {
    await waitForRiskEngine();
  },

  /**
   * Fetch NEO feed from NASA API for a date range
   */
  async getFeed(startDate: string, endDate: string): Promise<NeoFeedResponse> {
    try {
      const { data } = await NASA_CLIENT.get<NeoFeedResponse>('/feed', {
        params: { start_date: startDate, end_date: endDate },
      });

      // Cache asteroids in background (don't block response)
      cacheAsteroids(data).catch((err) => neoLogger.error({ err }, 'Failed to cache asteroids'));

      return data;
    } catch (error) {
      neoLogger.error({ err: error }, 'NASA API feed request failed');
      throw error;
    }
  },

  /**
   * Lookup a specific asteroid by ID
   */
  async lookup(asteroidId: string): Promise<NeoObject> {
    try {
      // Check cache first
      const cached = await prisma.cachedAsteroid.findUnique({
        where: { neoReferenceId: asteroidId },
      });

      // Return cached if less than 1 hour old
      if (cached && isCacheFresh(cached.lastFetchedAt, 60)) {
        return cached.dataJson as unknown as NeoObject;
      }

      const { data } = await NASA_CLIENT.get<NeoObject>(`/neo/${asteroidId}`);

      // Update cache
      await prisma.cachedAsteroid.upsert({
        where: { neoReferenceId: asteroidId },
        create: {
          neoReferenceId: data.neo_reference_id,
          name: data.name,
          absoluteMagnitude: data.absolute_magnitude_h,
          isHazardous: data.is_potentially_hazardous_asteroid,
          estimatedDiameterMin: data.estimated_diameter.kilometers.estimated_diameter_min,
          estimatedDiameterMax: data.estimated_diameter.kilometers.estimated_diameter_max,
          dataJson: JSON.parse(JSON.stringify(data)),
        },
        update: {
          dataJson: JSON.parse(JSON.stringify(data)),
          lastFetchedAt: new Date(),
        },
      });

      return data;
    } catch (error) {
      neoLogger.error({ err: error, asteroidId }, 'NASA API lookup failed');
      throw error;
    }
  },

  /**
   * Analyze risk using the Python scientific engine (microservice).
   */
  async analyzeRiskEnhanced(
    asteroids: NeoObject[],
    dateRange?: { start: string; end: string }
  ): Promise<EnhancedRiskResult> {
    neoLogger.info({ count: asteroids.length }, 'Sending asteroids to Python risk engine');

    const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze', {
      asteroids,
      date_range: dateRange,
    });

    neoLogger.info(
      {
        analyzed: data.total_analyzed,
        engine: data.engine,
        maxRisk: data.statistics?.max_risk_score,
      },
      'Python risk engine analysis complete'
    );

    return data as EnhancedRiskResult;
  },

  /**
   * Analyze a single asteroid via the Python engine.
   */
  async analyzeRiskSingle(asteroid: NeoObject) {
    const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze/single', asteroid);
    return data;
  },

  /**
   * Sentry-enhanced risk analysis.
   * Fetches real impact data from CNEOS Sentry and passes it to the Python engine
   * for authoritative risk assessment with real Torino/Palermo values.
   */
  async analyzeRiskSentryEnhanced(
    asteroid: NeoObject,
    sentryData: {
      designation: string;
      cumulativeImpactProbability: number;
      palermoCumulative: number;
      palermoMax: number;
      torinoMax: number;
      impactEnergy: number | null;
      diameter: number | null;
      mass: number | null;
      velocityImpact: number | null;
      velocityInfinity: number;
      totalVirtualImpactors: number;
      virtualImpactors: unknown[];
    }
  ) {
    const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze/sentry-enhanced', {
      asteroid,
      sentry_data: {
        designation: sentryData.designation,
        cumulative_impact_probability: sentryData.cumulativeImpactProbability,
        palermo_cumulative: sentryData.palermoCumulative,
        palermo_max: sentryData.palermoMax,
        torino_max: sentryData.torinoMax,
        impact_energy_mt: sentryData.impactEnergy,
        diameter_km: sentryData.diameter,
        mass_kg: sentryData.mass,
        velocity_impact: sentryData.velocityImpact,
        velocity_infinity: sentryData.velocityInfinity,
        total_virtual_impactors: sentryData.totalVirtualImpactors,
        virtual_impactors: sentryData.virtualImpactors,
      },
    });
    return data;
  },
};
