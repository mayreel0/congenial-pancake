import { IsBoolean, IsOptional } from 'class-validator';

// Partial update — each field independent, all optional so the frontend
// can flip one switch at a time without resending the other two.
export class UpdateProfileVisibilityDto {
  @IsOptional()
  @IsBoolean()
  showRequestsOnProfile?: boolean;

  @IsOptional()
  @IsBoolean()
  showRepliesOnProfile?: boolean;

  @IsOptional()
  @IsBoolean()
  showCountsOnProfile?: boolean;
}
