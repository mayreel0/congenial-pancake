import type { ReplyRecord, RequestRecord } from '../requests.repository';
import { toMyRequestLogEntryDto } from './my-request-log-entry.dto';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'user-1',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
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

describe('toMyRequestLogEntryDto', () => {
  it('renders request and reply authors through per-post nickname reveal rules', () => {
    const result = toMyRequestLogEntryDto(
      {
        request: makeRequest(),
        replies: [
          makeReply(),
          makeReply({
            id: 'reply-2',
            authorId: 'user-3',
            anonymous: true,
          }),
          makeReply({
            id: 'reply-3',
            authorId: null,
            guestId: 'guest-1',
          }),
        ],
      },
      new Map([
        ['user-1', '민들레'],
        ['user-2', '햇살'],
        ['user-3', '바다'],
      ]),
    );

    expect(result).toEqual({
      request: {
        id: 'request-1',
        body: '오늘 조금 힘들었어요.',
        createdAt: '2026-08-21T00:00:00.000Z',
        author: {
          anonymous: false,
          nickname: '민들레',
          nicknameDiscriminator: 'SER1',
        },
      },
      replies: [
        {
          id: 'reply-1',
          body: '괜찮아요.',
          createdAt: '2026-08-21T01:00:00.000Z',
          author: {
            anonymous: false,
            nickname: '햇살',
            nicknameDiscriminator: 'SER2',
          },
        },
        {
          id: 'reply-2',
          body: '괜찮아요.',
          createdAt: '2026-08-21T01:00:00.000Z',
          author: { anonymous: true },
        },
        {
          id: 'reply-3',
          body: '괜찮아요.',
          createdAt: '2026-08-21T01:00:00.000Z',
          author: { anonymous: true },
        },
      ],
    });
  });
});
