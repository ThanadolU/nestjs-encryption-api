import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ApiException } from './api.exception';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  beforeEach(() => jest.clearAllMocks());

  const expectResponse = (status: number, errorCode: string) => {
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({
      successful: false,
      error_code: errorCode,
      data: null,
    });
  };

  it('uses the error code from an ApiException', () => {
    filter.catch(new ApiException(400, 'CUSTOM'), host);
    expectResponse(400, 'CUSTOM');
  });

  it('derives the error code from other HTTP exceptions', () => {
    filter.catch(new NotFoundException(), host);
    expectResponse(404, 'NOT_FOUND');
  });

  it('keeps the 4xx status of Express errors', () => {
    filter.catch(Object.assign(new Error('too large'), { status: 413 }), host);
    expectResponse(413, 'PAYLOAD_TOO_LARGE');
  });

  it('logs unexpected errors and hides the details from the client', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const error = new Error('secret detail');

    filter.catch(error, host);

    expectResponse(500, 'INTERNAL_SERVER_ERROR');
    expect(log).toHaveBeenCalledWith(error);
  });
});
