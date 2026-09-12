import { visibleReplyBody, visibleRequestBody } from './request-content';

describe('visibleRequestBody', () => {
  it('returns the real body when not removed', () => {
    expect(
      visibleRequestBody({ body: '오늘 힘들었어요', contentRemoved: false }),
    ).toBe('오늘 힘들었어요');
  });

  it('returns a fixed placeholder when removed, never the real body', () => {
    expect(
      visibleRequestBody({ body: '오늘 힘들었어요', contentRemoved: true }),
    ).toBe('삭제된 글이에요.');
  });
});

describe('visibleReplyBody', () => {
  it('returns the real body when not deleted', () => {
    expect(visibleReplyBody({ body: '괜찮아요', deletedAt: null })).toBe(
      '괜찮아요',
    );
  });

  it('returns a fixed placeholder when deleted, never the real body', () => {
    expect(visibleReplyBody({ body: '괜찮아요', deletedAt: new Date() })).toBe(
      '삭제된 답변이에요.',
    );
  });
});
