import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { InvalidCredentialsException } from '../exceptions/app.exception';
import { AppExceptionFilter } from './app-exception.filter';

function makeHost(): { host: ArgumentsHost; res: jest.Mocked<Response> } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AppExceptionFilter', () => {
  const filter = new AppExceptionFilter();

  it('uses the exception code for an AppException', () => {
    const { host, res } = makeHost();

    filter.catch(new InvalidCredentialsException(), host);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  });

  it('maps a plain HttpException status to a fallback code', () => {
    const { host, res } = makeHost();

    filter.catch(new NotFoundException('Nope'), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Nope',
    });
  });

  it('joins array-style validation messages', () => {
    const { host, res } = makeHost();

    filter.catch(
      new BadRequestException(['field a is bad', 'field b is bad']),
      host,
    );

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'field a is bad field b is bad',
    });
  });

  it('falls back to a generic 500 for unknown errors', () => {
    const { host, res } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
  });

  it('logs the real error for unknown errors so it is not silently lost', () => {
    const { host } = makeHost();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const boom = new Error('boom');
    filter.catch(boom, host);

    expect(errorSpy).toHaveBeenCalledWith('boom', boom.stack);
    errorSpy.mockRestore();
  });
});
