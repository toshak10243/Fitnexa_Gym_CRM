import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@fitnexa/shared';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const anyRes = res as Record<string, any>;
        message = anyRes['message'] || exception.message;
        errorName = anyRes['error'] || exception.name;
      } else {
        message = exception.message;
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      // In production, avoid leaking internal implementation details
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'An unexpected error occurred' : exception.message;
      errorName = exception.name;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `req-${Date.now()}`;

    const errorBody: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error: errorName,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    response.status(status).json(errorBody);
  }
}
