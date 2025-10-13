const redis = require('redis');

const createRedisClient = () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  return client;
};

module.exports = createRedisClient;