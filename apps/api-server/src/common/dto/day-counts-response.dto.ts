import { createZodDto } from 'nestjs-zod';
import { dayCountsResponseSchema } from 'shared/dto';
import { kstDateStringsInRange } from '../kst-date';
import type { DayCount } from '../../requests/requests.repository';

export class DayCountsResponseDto extends createZodDto(
  dayCountsResponseSchema,
) {}

// Zero-fills every date in [from, to] that the repository's GROUP BY
// skipped (no rows that day) so HeatmapCalendar never has to enumerate the
// range itself.
export function toDayCountsResponseDto(
  from: string,
  to: string,
  rows: DayCount[],
): DayCountsResponseDto {
  const countByDate = new Map(rows.map((row) => [row.date, row.count]));
  return {
    from,
    to,
    days: kstDateStringsInRange(from, to).map((date) => ({
      date,
      count: countByDate.get(date) ?? 0,
    })),
  };
}
