// The one place every response mapper reads a request's body through —
// see requests.schema.ts's contentRemoved comment for why this needs to
// be structural rather than each mapper remembering to check the flag
// itself. No exceptions: the same placeholder shows in the public feed,
// the author's own records, and a replier's own answer log alike.
const REMOVED_BODY_PLACEHOLDER = '삭제된 글이에요.';
const REMOVED_REPLY_PLACEHOLDER = '삭제된 답변이에요.';

export function visibleRequestBody(request: {
  body: string;
  contentRemoved: boolean;
}): string {
  return request.contentRemoved ? REMOVED_BODY_PLACEHOLDER : request.body;
}

// RepliesRepository.softDelete sets deletedAt for both self-delete and
// admin's permanent delete alike — a reply's author viewing their own
// deletedAt !== null reply is the self-delete case having taken effect, so
// this must apply even to the reply's own recipient's unfiltered "내가 남긴
// 고민" list (RequestsRepository.findMine deliberately doesn't filter
// hidden/deletedAt there — see that method's comment), or self-deleting a
// reply would have no visible effect at all.
export function visibleReplyBody(reply: {
  body: string;
  deletedAt: Date | null;
}): string {
  return reply.deletedAt !== null ? REMOVED_REPLY_PLACEHOLDER : reply.body;
}
