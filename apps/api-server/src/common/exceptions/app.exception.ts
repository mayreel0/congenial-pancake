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
  constructor() {
    super(
      'REPLY_GUEST_LIMIT_EXCEEDED',
      'Guests may only reply 5 times in total. Log in to reply more.',
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

export class NicknameRequiredException extends AppException {
  constructor() {
    super(
      'NICKNAME_REQUIRED',
      'Set a nickname before posting under your name.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Korean, not English — unlike most exceptions here, NicknameSection shows
// this message directly (no frontend code→text lookup table), matching how
// UpdateNicknameDto's own class-validator messages are already Korean and
// shown as-is. Deliberately doesn't restate the total cooldown length (that
// constant lives in users/nickname-cooldown.constants.ts) — common/
// exceptions shouldn't reach into a feature module just to echo a number
// back in a message.
export class NicknameCooldownException extends AppException {
  constructor(daysRemaining: number) {
    super(
      'AUTH_NICKNAME_COOLDOWN',
      `닉네임 변경 쿨타임이 아직 남아있어요. ${daysRemaining}일 후에 다시 시도해주세요.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
