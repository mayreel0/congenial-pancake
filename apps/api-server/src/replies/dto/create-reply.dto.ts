import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @MinLength(1, { message: '내용을 입력해주세요.' })
  @MaxLength(500, { message: '500자 이하로 입력해주세요.' })
  body!: string;
}
