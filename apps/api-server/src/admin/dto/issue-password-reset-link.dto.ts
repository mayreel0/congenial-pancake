import { createZodDto } from 'nestjs-zod';
import { issuePasswordResetLinkSchema } from 'shared/dto';

export class IssuePasswordResetLinkDto extends createZodDto(
  issuePasswordResetLinkSchema,
) {}
