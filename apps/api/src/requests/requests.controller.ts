import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GuestId } from '../common/decorators/guest-id.decorator';
import { OptionalCurrentUser } from '../auth/optional-current-user.decorator';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import {
  toRequestResponseDto,
  type RequestResponseDto,
} from './dto/request-response.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @UseGuards(OptionalSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRequestDto,
    @OptionalCurrentUser() userId: string | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<RequestResponseDto> {
    const request = await this.requestsService.create(dto, userId, guestId);
    return toRequestResponseDto(request);
  }

  @Get()
  async findAll(): Promise<RequestResponseDto[]> {
    const requests = await this.requestsService.findVisible();
    return requests.map(toRequestResponseDto);
  }
}
