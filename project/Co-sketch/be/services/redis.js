import Redis from 'ioredis';

export const redis = new Redis('redis://localhost:6379'); // Connect to Redis server in docer, not direclty running it ,  so redis:// not http://
export const redisSub = redis.duplicate();//duplicate redis server for pubsub model 