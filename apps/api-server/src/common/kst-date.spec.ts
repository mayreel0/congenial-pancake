import {
  currentKstMonthRange,
  isValidDateString,
  kstDateRange,
  kstDateStringsInRange,
  kstDayRange,
  resolveDayCountsRange,
  yesterdayKstDateString,
} from './kst-date';

describe('isValidDateString', () => {
  it('accepts a real calendar date in YYYY-MM-DD form', () => {
    expect(isValidDateString('2026-08-31')).toBe(true);
  });

  it('rejects a malformed shape', () => {
    expect(isValidDateString('2026/08/31')).toBe(false);
    expect(isValidDateString('26-08-31')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
  });

  // Date.UTC silently rolls Feb 30 over into March — this check catches
  // that instead of accepting a nonexistent calendar date.
  it('rejects a date that does not exist', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
  });
});

describe('kstDayRange', () => {
  it('covers [00:00, 24:00) KST as the equivalent UTC instants', () => {
    const { start, end } = kstDayRange('2026-08-31');

    // KST is UTC+9, so 2026-08-31 00:00 KST is 2026-08-30 15:00 UTC.
    expect(start.toISOString()).toBe('2026-08-30T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-31T15:00:00.000Z');
  });
});

describe('kstDateRange', () => {
  it('leaves both bounds undefined when neither from nor to is given', () => {
    expect(kstDateRange(undefined, undefined)).toEqual({
      start: undefined,
      end: undefined,
    });
  });

  it('is inclusive of both the from and to day', () => {
    const { start, end } = kstDateRange('2026-08-01', '2026-08-31');

    expect(start?.toISOString()).toBe('2026-07-31T15:00:00.000Z');
    // end is exclusive of the instant *after* 2026-08-31 KST, so the whole
    // 31st is still included.
    expect(end?.toISOString()).toBe('2026-08-31T15:00:00.000Z');
  });

  it('supports an open-ended range with only one bound given', () => {
    const fromOnly = kstDateRange('2026-08-01', undefined);
    expect(fromOnly.start).toBeDefined();
    expect(fromOnly.end).toBeUndefined();

    const toOnly = kstDateRange(undefined, '2026-08-31');
    expect(toOnly.start).toBeUndefined();
    expect(toOnly.end).toBeDefined();
  });
});

describe('yesterdayKstDateString', () => {
  it('subtracts one day in KST, not UTC', () => {
    // 2026-08-31 00:30 KST is still 2026-08-30 15:30 UTC — a naive
    // UTC-based "yesterday" would wrongly say 2026-08-29.
    const justAfterKstMidnight = new Date('2026-08-30T15:30:00.000Z');
    expect(yesterdayKstDateString(justAfterKstMidnight)).toBe('2026-08-30');
  });

  it('rolls over a KST month boundary correctly', () => {
    const kstSep1Morning = new Date('2026-08-31T20:00:00.000Z'); // 2026-09-01 05:00 KST
    expect(yesterdayKstDateString(kstSep1Morning)).toBe('2026-08-31');
  });
});

describe('kstDateStringsInRange', () => {
  it('is inclusive of both endpoints', () => {
    expect(kstDateStringsInRange('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ]);
  });

  it('returns a single-element array when from equals to', () => {
    expect(kstDateStringsInRange('2026-08-31', '2026-08-31')).toEqual([
      '2026-08-31',
    ]);
  });

  it('returns an empty array when to is before from', () => {
    expect(kstDateStringsInRange('2026-09-02', '2026-08-30')).toEqual([]);
  });
});

describe('currentKstMonthRange', () => {
  it('spans the 1st of the KST month through today (KST)', () => {
    // 2026-09-01 05:00 KST
    const now = new Date('2026-08-31T20:00:00.000Z');
    expect(currentKstMonthRange(now)).toEqual({
      from: '2026-09-01',
      to: '2026-09-01',
    });
  });
});

describe('resolveDayCountsRange', () => {
  it('falls back to the current KST month when from/to are missing', () => {
    expect(resolveDayCountsRange(undefined, undefined)).toEqual(
      currentKstMonthRange(),
    );
  });

  it('falls back to the current KST month when from/to are malformed', () => {
    expect(resolveDayCountsRange('not-a-date', '2026-09-02')).toEqual(
      currentKstMonthRange(),
    );
  });

  it('passes through a valid explicit range unchanged', () => {
    expect(resolveDayCountsRange('2026-08-01', '2026-08-31')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('clamps a span longer than 100 days down to 100 days', () => {
    const { from, to } = resolveDayCountsRange('2020-01-01', '2030-01-01');
    expect(from).toBe('2020-01-01');
    expect(kstDateStringsInRange(from, to)).toHaveLength(100);
  });
});
