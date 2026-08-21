import type { RequestRecord } from '../requests.repository';

export type RequestResponseDto = {
  id: string;
  body: string;
  createdAt: Date;
};

// authorId/guestId never cross the HTTP boundary — matching the prototype's
// "익명 N" convention, the API doesn't expose who wrote a request at all.
export function toRequestResponseDto(
  request: RequestRecord,
): RequestResponseDto {
  return {
    id: request.id,
    body: request.body,
    createdAt: request.createdAt,
  };
}
