import {
  calculateMembershipEndDate,
  calculateDaysBetween,
  addDaysToDate,
} from './date.util';

describe('DateUtil - Asia/Kolkata boundary conventions', () => {
  it('should calculate 1 month membership correctly', () => {
    // 2026-01-01 to 2026-01-31 (1 full calendar month)
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = calculateMembershipEndDate(startDate, 'MONTHS', 1);

    expect(endDate.toISOString().split('T')[0]).toBe('2026-01-31');
  });

  it('should calculate 12 months (1 year) membership correctly', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = calculateMembershipEndDate(startDate, 'YEARS', 1);

    expect(endDate.toISOString().split('T')[0]).toBe('2026-12-31');
  });

  it('should calculate 30 days membership correctly', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = calculateMembershipEndDate(startDate, 'DAYS', 30);

    expect(endDate.toISOString().split('T')[0]).toBe('2026-01-30');
  });

  it('should calculate days between two dates inclusively', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-10T00:00:00.000Z');
    const days = calculateDaysBetween(start, end);

    expect(days).toBe(10);
  });

  it('should correctly extend date by days', () => {
    const initial = new Date('2026-06-30T00:00:00.000Z');
    const extended = addDaysToDate(initial, 15);

    expect(extended.toISOString().split('T')[0]).toBe('2026-07-15');
  });
});
