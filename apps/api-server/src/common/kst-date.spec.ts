import {
  isValidDateString,
  kstDateRange,
  kstDayRange,
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
