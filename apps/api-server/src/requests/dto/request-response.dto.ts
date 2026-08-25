import type { RequestRecord } from '../requests.repository';

export type RequestResponseDto = {
  id: string;
  body: string;
  createdAt: Date;
  replyCount: number;
};

// authorId/guestId never cross the HTTP boundary — matching the prototype's
// "익명 N" convention, the API doesn't expose who wrote a request at all.
// replyCount defaults to 0 for a just-created request, which never has any
// replies yet; the list endpoint passes the real count from the repository.
export function toRequestResponseDto(
  request: RequestRecord & { replyCount?: number },
): RequestResponseDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt,
    replyCount: request.replyCount ?? 0,
  };
}
