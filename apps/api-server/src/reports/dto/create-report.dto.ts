import { IsIn, IsUUID } from 'class-validator';

export class CreateReportDto {
  @IsIn(['request', 'reply'])
  targetType!: 'request' | 'reply';

  @IsUUID()
  targetId!: string;
}
