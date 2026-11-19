export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiration: string;
    refreshSecret: string;
    refreshExpiration: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:Root@123@localhost:5432/fitnexa_dev?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'fitnexa-development-secret-key-min-32-chars-long-2026',
    expiration: process.env.JWT_EXPIRATION || '8h',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'fitnexa-development-refresh-secret-key-32-chars-2026',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
});
