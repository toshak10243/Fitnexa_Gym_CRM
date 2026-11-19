import { z } from 'zod';

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  correlationId?: string;
}

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'error', 'degraded']),
  timestamp: z.string(),
  uptime: z.number(),
  environment: z.string(),
  version: z.string(),
  services: z.object({
    database: z.object({
      status: z.enum(['up', 'down']),
      responseTimeMs: z.number().optional(),
      error: z.string().optional(),
    }),
    redis: z.object({
      status: z.enum(['up', 'down', 'disabled']),
      responseTimeMs: z.number().optional(),
      error: z.string().optional(),
    }),
    memory: z.object({
      heapUsedMb: z.number(),
      rssMb: z.number(),
    }),
  }),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
