import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  queueFreshnessHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  queueReplyCap?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  guestReplyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  nicknameCooldownDays?: number;
}
