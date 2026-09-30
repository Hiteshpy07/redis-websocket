import 'dotenv/config';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL);
export const redisSub = redis.duplicate(); // duplicate redis client for Pub/Sub model 