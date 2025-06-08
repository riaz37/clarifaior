import { z } from 'zod';

/**
 * Represents the result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum number of requests allowed in the current window */
  limit: number;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Timestamp when the current window resets (in milliseconds) */
  resetTime: number;
  /** Time in milliseconds until the current window resets */
  retryAfter: number;
  /** The identifier used for this rate limit check */
  identifier: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   * @default 60
   */
  limit?: number;
  
  /**
   * Time window in milliseconds
   * @default 60_000 (1 minute)
   */
  windowMs?: number;
  
  /**
   * Whether to include rate limit headers in the response
   * @default true
   */
  headers?: boolean;
  
  /**
   * Whether to skip rate limiting for certain requests
   * @param identifier The identifier for the rate limit
   * @returns boolean indicating if rate limiting should be skipped
   */
  skip?: (identifier: string) => boolean | Promise<boolean>;
  
  /**
   * Handler for when rate limit is exceeded
   * @param result The rate limit result
   * @returns void or Promise<void>
   */
  onLimitExceeded?: (result: RateLimitResult) => void | Promise<void>;
  
  /**
   * Whether to use Redis for distributed rate limiting
   * @default false
   */
  useRedis?: boolean;
  
  /**
   * Redis client (required if useRedis is true)
   */
  redisClient?: any; // Type should be compatible with Redis client
  
  /**
   * Prefix for Redis keys
   * @default 'rate-limit:'
   */
  redisKeyPrefix?: string;
  
  /**
   * Custom key generator function
   * @param req The request object (if applicable)
   * @returns string identifier for the rate limit
   */
  keyGenerator?: (req?: any) => string | Promise<string>;
  
  /**
   * Whether to skip failed requests (status >= 400) from rate limiting
   * @default false
   */
  skipFailedRequests?: boolean;
  
  /**
   * Whether to skip successful requests (status < 400) from rate limiting
   * @default false
   */
  skipSuccessfulRequests?: boolean;
}

/**
 * Default rate limit options
 */
const DEFAULT_OPTIONS: Required<Omit<RateLimitOptions, 'redisClient' | 'skip' | 'onLimitExceeded' | 'keyGenerator'>> = {
  limit: 60,
  windowMs: 60_000, // 1 minute
  headers: true,
  useRedis: false,
  redisKeyPrefix: 'rate-limit:',
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
};

/**
 * Schema for validating rate limit options
 */
const rateLimitOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  windowMs: z.number().int().positive().optional(),
  headers: z.boolean().optional(),
  useRedis: z.boolean().optional(),
  redisClient: z.any().optional(),
  redisKeyPrefix: z.string().optional(),
  skip: z.function().args(z.string()).returns(z.union([z.boolean(), z.promise(z.boolean())])).optional(),
  onLimitExceeded: z.function().args(z.any()).returns(z.union([z.void(), z.promise(z.void())])).optional(),
  keyGenerator: z.function().args(z.any()).returns(z.union([z.string(), z.promise(z.string())])).optional(),
  skipFailedRequests: z.boolean().optional(),
  skipSuccessfulRequests: z.boolean().optional(),
}).default({});

/**
 * In-memory store for rate limiting
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Class for handling rate limiting
 */
export class RateLimiter {
  private readonly options: Required<Omit<RateLimitOptions, 'redisClient' | 'skip' | 'onLimitExceeded' | 'keyGenerator'>> & {
    skip?: RateLimitOptions['skip'];
    onLimitExceeded?: RateLimitOptions['onLimitExceeded'];
    keyGenerator: NonNullable<RateLimitOptions['keyGenerator']>;
  };
  private readonly store: RateLimitStore;
  private readonly redisClient: any; // Type should be compatible with Redis client
  
  /**
   * Create a new RateLimiter instance
   * @param options Rate limiting options
   */
  constructor(options: RateLimitOptions = {}) {
    const parsedOptions = rateLimitOptionsSchema.parse(options);
    
    this.options = {
      ...DEFAULT_OPTIONS,
      ...parsedOptions,
      keyGenerator: parsedOptions.keyGenerator || (() => 'global'),
    };
    
    this.store = {};
    this.redisClient = this.options.useRedis ? this.options.redisClient : null;
    
    if (this.options.useRedis && !this.redisClient) {
      throw new Error('Redis client is required when useRedis is true');
    }
  }
  
  /**
   * Generate a rate limit key
   * @param identifier The identifier for the rate limit
   * @returns The generated key
   */
  private generateKey(identifier: string): string {
    return `${this.options.redisKeyPrefix}${identifier}`;
  }
  
  /**
   * Check if a request is allowed based on rate limits
   * @param identifier The identifier for the rate limit
   * @param weight The weight of the request (default: 1)
   * @returns Promise that resolves to the rate limit result
   */
  public async check(identifier: string, weight: number = 1): Promise<RateLimitResult> {
    // Skip rate limiting if skip function returns true
    if (this.options.skip && await this.options.skip(identifier)) {
      return {
        allowed: true,
        limit: this.options.limit,
        remaining: this.options.limit,
        resetTime: Date.now() + this.options.windowMs,
        retryAfter: 0,
        identifier,
      };
    }
    
    const now = Date.now();
    const key = this.generateKey(identifier);
    
    if (this.options.useRedis) {
      return this.checkWithRedis(key, identifier, weight, now);
    }
    
    return this.checkInMemory(key, identifier, weight, now);
  }
  
  /**
   * Check rate limits using in-memory store
   */
  private async checkInMemory(
    key: string,
    identifier: string,
    weight: number,
    now: number
  ): Promise<RateLimitResult> {
    const entry = this.store[key];
    const resetTime = (entry?.resetTime || now + this.options.windowMs);
    
    // Reset the counter if the window has passed
    if (!entry || now > entry.resetTime) {
      this.store[key] = {
        count: weight,
        resetTime: now + this.options.windowMs,
      };
      
      return {
        allowed: true,
        limit: this.options.limit,
        remaining: this.options.limit - weight,
        resetTime: now + this.options.windowMs,
        retryAfter: 0,
        identifier,
      };
    }
    
    // Check if the request would exceed the limit
    const newCount = entry.count + weight;
    const allowed = newCount <= this.options.limit;
    
    if (allowed) {
      this.store[key].count = newCount;
    } else if (this.options.onLimitExceeded) {
      const result: RateLimitResult = {
        allowed: false,
        limit: this.options.limit,
        remaining: Math.max(0, this.options.limit - entry.count),
        resetTime: entry.resetTime,
        retryAfter: Math.max(0, entry.resetTime - now),
        identifier,
      };
      
      await this.options.onLimitExceeded(result);
    }
    
    return {
      allowed,
      limit: this.options.limit,
      remaining: Math.max(0, this.options.limit - (allowed ? newCount : entry.count)),
      resetTime: entry.resetTime,
      retryAfter: Math.max(0, entry.resetTime - now),
      identifier,
    };
  }
  
  /**
   * Check rate limits using Redis
   */
  private async checkWithRedis(
    key: string,
    identifier: string,
    weight: number,
    now: number
  ): Promise<RateLimitResult> {
    if (!this.redisClient) {
      throw new Error('Redis client is not available');
    }
    
    try {
      // Use Redis multi/exec for atomic operations
      const multi = this.redisClient.multi();
      
      // Get current counter and set expiration if needed
      multi.get(key);
      multi.ttl(key);
      
      const [count, ttl] = await new Promise<[string | null, number]>((resolve, reject) => {
        multi.exec((err: Error | null, results: [any, any]) => {
          if (err) {
            reject(err);
          } else {
            resolve([results[0][1], results[1][1]]);
          }
        });
      });
      
      const currentCount = count ? parseInt(count, 10) : 0;
      const resetTime = now + (ttl > 0 ? ttl * 1000 : this.options.windowMs);
      
      // Check if the request would exceed the limit
      const newCount = currentCount + weight;
      const allowed = newCount <= this.options.limit;
      
      if (allowed) {
        // Increment the counter and set expiration if this is the first request
        if (currentCount === 0) {
          await this.redisClient.setex(key, Math.ceil(this.options.windowMs / 1000), newCount);
        } else {
          await this.redisClient.incrby(key, weight);
        }
      } else if (this.options.onLimitExceeded) {
        const result: RateLimitResult = {
          allowed: false,
          limit: this.options.limit,
          remaining: Math.max(0, this.options.limit - currentCount),
          resetTime: now + (ttl > 0 ? ttl * 1000 : this.options.windowMs),
          retryAfter: Math.max(0, (ttl > 0 ? ttl * 1000 : this.options.windowMs) - now),
          identifier,
        };
        
        await this.options.onLimitExceeded(result);
      }
      
      return {
        allowed,
        limit: this.options.limit,
        remaining: Math.max(0, this.options.limit - (allowed ? newCount : currentCount)),
        resetTime,
        retryAfter: Math.max(0, resetTime - now),
        identifier,
      };
    } catch (error) {
      console.error('Redis error in rate limiter:', error);
      
      // Fail open - allow the request if there's a Redis error
      return {
        allowed: true,
        limit: this.options.limit,
        remaining: this.options.limit,
        resetTime: now + this.options.windowMs,
        retryAfter: 0,
        identifier,
        metadata: { error: 'Redis error', redisError: error },
      };
    }
  }
  
  /**
   * Clean up expired rate limit entries (for in-memory store only)
   */
  public cleanup(): void {
    if (this.options.useRedis) {
      return; // Redis handles expiration automatically
    }
    
    const now = Date.now();
    
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }
}

/**
 * Default rate limiter instance with default options
 */
export const defaultRateLimiter = new RateLimiter();