import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateNicknameDto {
  @IsString()
  @MinLength(1, { message: '닉네임을 입력해주세요.' })
  @MaxLength(20, { message: '닉네임은 20자 이하여야 합니다.' })
  @Matches(/\S/, { message: '닉네임은 공백만으로 이루어질 수 없습니다.' })
  nickname!: string;
}
