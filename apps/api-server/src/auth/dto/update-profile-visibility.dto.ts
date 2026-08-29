import { IsBoolean, IsOptional } from 'class-validator';

// Partial update — each field independent, all optional so the frontend
// can flip one switch at a time without resending the others.
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

  // Hides the nickname everywhere (not just /u/[slug]) without touching the
  // nickname text itself or its change cooldown — see
  // UsersService.updateProfileVisibility.
  @IsOptional()
  @IsBoolean()
  nicknameVisible?: boolean;
}
