import type { ReplyResponseDto } from '../../replies/dto/reply-response.dto';
import { toReplyResponseDto } from '../../replies/dto/reply-response.dto';
import { assignAuthorSlots } from '../feed-author-slots';
import type { FeedItem } from '../requests.repository';
import {
  toRequestResponseDto,
  type RequestResponseDto,
} from './request-response.dto';

export type FeedReplyResponseDto = ReplyResponseDto & { authorSlot: number };
export type FeedItemResponseDto = {
  request: RequestResponseDto & { authorSlot: number };
  replies: FeedReplyResponseDto[];
};

// authorSlot never carries authorId/guestId across the boundary — see
// feed-author-slots.ts for what it does instead.
export function toFeedItemDto(item: FeedItem): FeedItemResponseDto {
  const { requestAuthorSlot, replySlots } = assignAuthorSlots(
    item.request,
    item.replies,
  );

  return {
    request: {
      ...toRequestResponseDto(item.request),
      replyCount: item.replies.length,
      authorSlot: requestAuthorSlot,
    },
    replies: item.replies.map((reply, index) => ({
      ...toReplyResponseDto(reply),
      authorSlot: replySlots[index],
    })),
  };
}
