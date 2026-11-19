/**
 * Date calculation utilities respecting Asia/Kolkata boundary conventions
 */

export function calculateMembershipEndDate(
  startDateStr: string | Date,
  durationType: 'DAYS' | 'MONTHS' | 'YEARS',
  durationValue: number,
): Date {
  const date = new Date(startDateStr);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const endDate = new Date(Date.UTC(year, month, day));

  if (durationType === 'DAYS') {
    endDate.setUTCDate(endDate.getUTCDate() + durationValue - 1);
  } else if (durationType === 'MONTHS') {
    endDate.setUTCMonth(endDate.getUTCMonth() + durationValue);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else if (durationType === 'YEARS') {
    endDate.setUTCFullYear(endDate.getUTCFullYear() + durationValue);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  return endDate;
}

export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const utcStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const utcEnd = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const diffMs = utcEnd - utcStart;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
