import type { RequestRecord } from '../../requests/requests.repository';
import type { ReplyRecord, ReplyWithRequest } from '../replies.repository';
import { toMyAnswerLogEntryDto } from './my-answer-log-entry.dto';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'user-1',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    contentRemoved: false,
    reviewedAt: null,
    anonymous: false,
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: 'reply-1',
    requestId: 'request-1',
    body: '괜찮아요.',
    authorId: 'user-2',
    guestId: null,
    createdAt: new Date('2026-08-21T01:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: false,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<ReplyWithRequest> = {},
): ReplyWithRequest {
  return {
    request: makeRequest(),
    reply: makeReply(),
    ...overrides,
  };
}

describe('toMyAnswerLogEntryDto', () => {
  it('shows the real request/reply body when neither is removed', () => {
    const result = toMyAnswerLogEntryDto(
      makeEntry(),
      new Map([
        ['user-1', '민들레'],
        ['user-2', '햇살'],
      ]),
    );

    expect(result.requestBody).toBe('오늘 조금 힘들었어요.');
    expect(result.requestRemoved).toBe(false);
    expect(result.replyBody).toBe('괜찮아요.');
    expect(result.replyRemoved).toBe(false);
  });

  it('shows the removed-request placeholder when the request author deleted it', () => {
    const result = toMyAnswerLogEntryDto(
      makeEntry({ request: makeRequest({ contentRemoved: true }) }),
      new Map([
        ['user-1', '민들레'],
        ['user-2', '햇살'],
      ]),
    );

    expect(result.requestBody).toBe('삭제된 글이에요.');
    expect(result.requestRemoved).toBe(true);
    expect(result.replyBody).toBe('괜찮아요.');
    expect(result.replyRemoved).toBe(false);
  });

  // The replier's own view of their own reply — deleting it must actually
  // hide it even from the replier's own answer log, not just from others.
  it('shows the removed-reply placeholder when the replier deleted their own reply', () => {
    const result = toMyAnswerLogEntryDto(
      makeEntry({
        reply: makeReply({ deletedAt: new Date('2026-08-22T00:00:00.000Z') }),
      }),
      new Map([
        ['user-1', '민들레'],
        ['user-2', '햇살'],
      ]),
    );

    expect(result.requestBody).toBe('오늘 조금 힘들었어요.');
    expect(result.requestRemoved).toBe(false);
    expect(result.replyBody).toBe('삭제된 답변이에요.');
    expect(result.replyRemoved).toBe(true);
  });
});
