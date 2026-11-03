import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from './api.exception';

// Every failure, including 404s and body parser errors, uses the API's response shape.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const status = this.getStatus(exception);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        successful: false,
        error_code:
          exception instanceof ApiException
            ? exception.errorCode
            : (HttpStatus[status] ?? String(status)),
        data: null,
      });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    // Express body parser errors (e.g. payload too large) carry a 4xx `status`
    // rather than extending HttpException.
    const status = (exception as { status?: unknown } | null)?.status;
    return typeof status === 'number' && status >= 400 && status < 500
      ? status
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
