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

export class RequestNotFoundException extends AppException {
  constructor() {
    super('REQUEST_NOT_FOUND', 'Request not found.', HttpStatus.NOT_FOUND);
  }
}

export class ReplyNotFoundException extends AppException {
  constructor() {
    super('REPLY_NOT_FOUND', 'Reply not found.', HttpStatus.NOT_FOUND);
  }
}

export class RequestGuestLimitExceededException extends AppException {
  constructor() {
    super(
      'REQUEST_GUEST_LIMIT_EXCEEDED',
      'Guests may only post one request. Log in to post more.',
      HttpStatus.CONFLICT,
    );
  }
}

export class ReplyAlreadySubmittedException extends AppException {
  constructor() {
    super(
      'REPLY_ALREADY_SUBMITTED',
      'You already replied to this request.',
      HttpStatus.CONFLICT,
    );
  }
}

export class ReplyGuestLimitExceededException extends AppException {
  constructor(limit: number) {
    super(
      'REPLY_GUEST_LIMIT_EXCEEDED',
      `Guests may only reply ${limit} times in total. Log in to reply more.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class ReportAlreadySubmittedException extends AppException {
  constructor() {
    super(
      'REPORT_ALREADY_SUBMITTED',
      'You already reported this.',
      HttpStatus.CONFLICT,
    );
  }
}

export class PasswordResetTokenInvalidException extends AppException {
  constructor() {
    super(
      'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      'This password reset link is invalid or expired.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EmailVerificationTokenInvalidException extends AppException {
  constructor() {
    super(
      'AUTH_EMAIL_VERIFICATION_TOKEN_INVALID',
      'This verification link is invalid or expired.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Only used for a deliberate resend request — signup swallows the same
// underlying EmailService failure instead (see AuthService.signup), since
// a flaky provider shouldn't block account creation. A resend the user
// explicitly asked for deserves real feedback, not a silent no-op.
export class EmailSendFailedException extends AppException {
  constructor() {
    super(
      'AUTH_EMAIL_SEND_FAILED',
      'Failed to send the verification email. Please try again later.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class ReplyUnverifiedLimitExceededException extends AppException {
  constructor(limit: number) {
    super(
      'REPLY_UNVERIFIED_LIMIT_EXCEEDED',
      `Unverified accounts may only reply ${limit} times in total. Verify your email to reply more.`,
      HttpStatus.CONFLICT,
    );
  }
}
