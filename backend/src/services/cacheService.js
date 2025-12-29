const Redis = require('ioredis');

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

let redis = null;

try {
  redis = new Redis(redisConfig);
  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });
} catch (error) {
  console.warn('Redis not available, using in-memory cache');
}

// In-memory fallback cache
const memoryCache = new Map();

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  // Get value from cache
  async get(key) {
    try {
      if (redis) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      }
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }
      memoryCache.delete(key);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set value in cache
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(value));
      } else {
        memoryCache.set(key, {
          value,
          expiry: Date.now() + ttl * 1000,
        });
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (redis) {
        await redis.del(key);
      } else {
        memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete by pattern
  async delPattern(pattern) {
    try {
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of memoryCache.keys()) {
          if (regex.test(key)) {
            memoryCache.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Get or set (cache-aside pattern)
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  // Invalidate cache for entity
  async invalidate(entity, id = null) {
    const pattern = id ? `${entity}:${id}*` : `${entity}:*`;
    await this.delPattern(pattern);
  }

  // Cache keys for different entities
  keys = {
    skill: (id) => `skill:${id}`,
    skillsList: (params) => `skills:list:${JSON.stringify(params)}`,
    user: (id) => `user:${id}`,
    userSkills: (userId) => `user:${userId}:skills`,
    exchange: (id) => `exchange:${id}`,
    userExchanges: (userId) => `user:${userId}:exchanges`,
    messages: (exchangeId) => `messages:${exchangeId}`,
    search: (query) => `search:${query}`,
    recommendations: (userId) => `recommendations:${userId}`,
  };

  // Middleware for caching API responses
  cacheMiddleware(keyFn, ttl = 300) {
    return async (req, res, next) => {
      const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
      
      const cached = await this.get(key);
      if (cached) {
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache response
      res.json = async (data) => {
        await this.set(key, data, ttl);
        return originalJson(data);
      };

      next();
    };
  }
}

module.exports = new CacheService();
