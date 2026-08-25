import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Guests can't report — SessionGuard (not OptionalSessionGuard) 401s
  // anonymous requests outright.
  @Post()
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.reportsService.create(dto, userId);
  }
}
