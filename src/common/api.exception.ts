import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly errorCode: string,
  ) {
    super(errorCode, status);
  }
}
