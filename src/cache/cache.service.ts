import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config';
import { createClient } from 'redis';
import { RedisClientType } from '@node-redis/client';
import { Listing } from 'src/types';

@Injectable()
export class CacheService {
  private readonly _logger = new Logger(CacheService.name);
  private readonly _cache: RedisClientType;

  get name(): string {
    return 'CacheService';
  }

  constructor(protected readonly configService: AppConfigService) {
    this._cache = createClient({ url: this.configService.bot.redisUri });
    this._cache.on('error', err => console.log('Redis Client Error', err));
    this._cache.connect();
  }

  /**
   * Cache sale
   */
  public async cacheSale(key: string): Promise<void> {
    this._logger.debug(`Caching tx ${key}`);
    await this._cache.set(key, '');
  }

  /**
   * Check cache for sale
   */
  public async isCached(key: string): Promise<boolean> {
    this._logger.debug(`Checking Cache ${key}`);
    const exists = await this._cache.exists(key);
    if (exists === 1) {
      this._logger.debug(`Key Found ${key}`);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Cache listing
   */
  public async cacheListing(key: string, obj: Listing): Promise<void> {
    this._logger.debug(`Caching listing ${key}`);
    await this._cache.set(key, JSON.stringify(obj));
  }

  /**
   * Get cache for listing
   */
  public async getCachedListing(key: string): Promise<Listing> {
    this._logger.debug(`Getting Cache ${key}`);
    const obj = await this._cache.get(key);
    return JSON.parse(obj);
  }
}
