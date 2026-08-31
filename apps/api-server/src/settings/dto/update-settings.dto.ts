import { createZodDto } from 'nestjs-zod';
import { updateSettingsSchema } from 'shared/dto';

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
