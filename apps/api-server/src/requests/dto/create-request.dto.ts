import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MinLength(1, { message: '내용을 입력해주세요.' })
  @MaxLength(500, { message: '500자 이하로 입력해주세요.' })
  body!: string;

  // Defaults to true (anonymous) in the service when omitted — guests can
  // never set this to false; enforced in RequestsService, not here.
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}
