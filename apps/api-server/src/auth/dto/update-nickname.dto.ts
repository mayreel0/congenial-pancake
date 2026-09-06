import { createZodDto } from 'nestjs-zod';
import { updateNicknameSchema } from 'shared/dto';

export class UpdateNicknameDto extends createZodDto(updateNicknameSchema) {}
