import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

// Matches class-validator's ValidationPipe's own default shape
// (BadRequestException with a message: string[]) exactly, so
// AppExceptionFilter (common/filters/app-exception.filter.ts) needs no
// changes — it already extracts a joined message and falls back to
// code: 'VALIDATION_ERROR' for any generic 400.
function toBadRequestException(error: unknown): BadRequestException {
  const issues =
    error && typeof error === 'object' && 'issues' in error
      ? (error as { issues: { message: string }[] }).issues
      : [];
  const messages = issues.map((issue) => issue.message);
  return new BadRequestException(
    messages.length > 0 ? messages : ['잘못된 요청입니다.'],
  );
}

// Wired as APP_PIPE in app.module.ts, replacing class-validator's global
// ValidationPipe. Validates any @Body()/@Query()/@Param() typed as a
// nestjs-zod DTO (createZodDto(...)) — untyped/non-DTO params pass through
// unvalidated, same as the old ValidationPipe's behavior for plain types.
export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: toBadRequestException,
});
