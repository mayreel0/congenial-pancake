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
// feed-author-slots.ts for what it does instead. assignAuthorSlots itself
// is unmodified by the nickname-reveal feature: slots keep being computed
// for every identity regardless of `anonymous`, and the frontend prefers
// the real `author` field whenever author.anonymous === false.
export function toFeedItemDto(
  item: FeedItem,
  nicknameByUserId: Map<string, string | null>,
): FeedItemResponseDto {
  const { requestAuthorSlot, replySlots } = assignAuthorSlots(
    item.request,
    item.replies,
  );

  return {
    request: {
      ...toRequestResponseDto(item.request, nicknameByUserId),
      replyCount: item.replies.length,
      authorSlot: requestAuthorSlot,
    },
    replies: item.replies.map((reply, index) => ({
      ...toReplyResponseDto(reply, nicknameByUserId),
      authorSlot: replySlots[index],
    })),
  };
}
