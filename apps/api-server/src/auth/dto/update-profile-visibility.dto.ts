import { createZodDto } from 'nestjs-zod';
import { updateProfileVisibilitySchema } from 'shared/dto';

// Partial update — each field independent, all optional so the frontend
// can flip one switch at a time without resending the others.
export class UpdateProfileVisibilityDto extends createZodDto(
  updateProfileVisibilitySchema,
) {}
