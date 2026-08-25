import { Injectable } from '@nestjs/common';
import { ReplyNotFoundException } from '../common/exceptions/app.exception';
import { RepliesService } from '../replies/replies.service';
import { SavedRepliesRepository } from './saved-replies.repository';

@Injectable()
export class SavedRepliesService {
  constructor(
    private readonly savedRepliesRepository: SavedRepliesRepository,
    private readonly repliesService: RepliesService,
  ) {}

  async save(replyId: string, authorId: string): Promise<void> {
    const reply = await this.repliesService.findVisibleById(replyId);
    if (!reply) throw new ReplyNotFoundException();

    await this.savedRepliesRepository.save(replyId, authorId);
  }

  unsave(replyId: string, authorId: string): Promise<void> {
    return this.savedRepliesRepository.unsave(replyId, authorId);
  }

  findSavedReplyIds(authorId: string): Promise<string[]> {
    return this.savedRepliesRepository.findSavedReplyIdsForAuthor(authorId);
  }
}
