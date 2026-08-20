import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super(message, status);
  }
}

export class EmailAlreadyExistsException extends AppException {
  constructor() {
    super(
      'AUTH_EMAIL_TAKEN',
      'Email is already registered.',
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super(
      'AUTH_INVALID_CREDENTIALS',
      'Invalid email or password.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class OAuthExchangeFailedException extends AppException {
  constructor(provider: string) {
    super(
      'AUTH_OAUTH_EXCHANGE_FAILED',
      `Failed to complete ${provider} sign-in.`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
