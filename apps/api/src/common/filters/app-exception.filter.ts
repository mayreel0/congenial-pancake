import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

const STATUS_CODE_FALLBACKS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

function extractMessage(response: unknown, fallback: string): string {
  if (typeof response === 'string') return response;
  if (
    response &&
    typeof response === 'object' &&
    'message' in response &&
    (typeof response.message === 'string' || Array.isArray(response.message))
  ) {
    const { message } = response as { message: string | string[] };
    return Array.isArray(message) ? message.join(' ') : message;
  }
  return fallback;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        code: STATUS_CODE_FALLBACKS[status] ?? 'HTTP_ERROR',
        message: extractMessage(exception.getResponse(), exception.message),
      });
      return;
    }

    // The client only ever sees a generic message — log the real cause here
    // or it's lost. Nest's default filter does this for you; a custom
    // @Catch() filter has to do it itself.
    this.logger.error(
      exception instanceof Error ? exception.message : 'Unknown error',
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
  }
}
