import { Injectable } from '@nestjs/common';
import {
  ReplyNotFoundException,
  ReportAlreadySubmittedException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import { ModerationService } from '../moderation/moderation.service';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';
import type { CreateReportDto } from './dto/create-report.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly requestsService: RequestsService,
    private readonly repliesService: RepliesService,
    private readonly moderationService: ModerationService,
  ) {}

  async create(dto: CreateReportDto, reporterId: string): Promise<void> {
    if (dto.targetType === 'request') {
      const target = await this.requestsService.findVisibleById(dto.targetId);
      if (!target) throw new RequestNotFoundException();
    } else {
      const target = await this.repliesService.findVisibleById(dto.targetId);
      if (!target) throw new ReplyNotFoundException();
    }

    const existing = await this.reportsRepository.findByTargetAndReporter(
      dto.targetType,
      dto.targetId,
      reporterId,
    );
    if (existing) throw new ReportAlreadySubmittedException();

    await this.reportsRepository.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      reporterId,
    });

    const distinctReporterCount =
      await this.reportsRepository.countDistinctReporters(
        dto.targetType,
        dto.targetId,
      );
    await this.moderationService.evaluateAutoHide(
      dto.targetType,
      dto.targetId,
      distinctReporterCount,
    );
  }
}
