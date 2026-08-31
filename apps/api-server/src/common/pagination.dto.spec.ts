import {
  parsePageParam,
  parsePageSizeParam,
  toPaginatedDto,
} from './pagination.dto';

describe('parsePageParam', () => {
  it('parses a valid positive integer string', () => {
    expect(parsePageParam('3')).toBe(3);
  });

  it.each([undefined, '', '0', '-1', '1.5', 'abc'])(
    'falls back to page 1 for %p rather than throwing',
    (input) => {
      expect(parsePageParam(input)).toBe(1);
    },
  );
});

describe('parsePageSizeParam', () => {
  it.each([10, 20, 50])('accepts %d, a whitelisted size', (size) => {
    expect(parsePageSizeParam(String(size))).toBe(size);
  });

  it.each([undefined, '', '0', '15', '999', 'abc'])(
    'falls back to the default (10) for %p rather than throwing',
    (input) => {
      expect(parsePageSizeParam(input)).toBe(10);
    },
  );
});

describe('toPaginatedDto', () => {
  it('computes totalPages from totalItems and pageSize', () => {
    expect(toPaginatedDto(['a', 'b'], 1, 45, 20)).toEqual({
      items: ['a', 'b'],
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
    });
  });

  it('reports at least 1 total page even when there are zero items', () => {
    expect(toPaginatedDto([], 1, 0, 20)).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });

  it('defaults pageSize to 10 when not given', () => {
    expect(toPaginatedDto(['a'], 1, 25)).toEqual({
      items: ['a'],
      page: 1,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });
});
