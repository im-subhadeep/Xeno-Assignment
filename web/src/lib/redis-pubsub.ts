import Redis from 'ioredis';

// Create Redis connection for pub/sub operations
export const redisConnection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: true, // Don't connect immediately during build
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: true, // Don't connect immediately during build
    });

export default redisConnection;
