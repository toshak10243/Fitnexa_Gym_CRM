import {
  calculateLineItemFinancials,
  categorizeDuesAging,
  formatPaiseToInr,
  parseInrToPaise,
} from './financial.util';

describe('FinancialUtil - Integer Paise & GST Calculations', () => {
  it('should calculate tax-exclusive pricing correctly', () => {
    // ₹1,000 (100000 paise) + 18% GST = ₹1,180 (118000 paise)
    const result = calculateLineItemFinancials(100000, 1, 0, 1800, false);
    expect(result.taxableAmountInPaise).toBe(100000);
    expect(result.taxAmountInPaise).toBe(18000);
    expect(result.totalAmountInPaise).toBe(118000);
  });

  it('should calculate tax-inclusive pricing correctly', () => {
    // Total price is ₹1,180 (118000 paise) including 18% GST
    const result = calculateLineItemFinancials(118000, 1, 0, 1800, true);
    expect(result.taxableAmountInPaise).toBe(100000);
    expect(result.taxAmountInPaise).toBe(18000);
    expect(result.totalAmountInPaise).toBe(118000);
  });

  it('should apply discount before computing tax', () => {
    // Unit price ₹10,000 (1000000 paise), discount ₹1,000 (100000 paise) -> net ₹9,000 (900000 paise)
    // 18% GST on ₹9,000 = ₹1,620 (162000 paise)
    // Total = ₹10,620 (1062000 paise)
    const result = calculateLineItemFinancials(1000000, 1, 100000, 1800, false);
    expect(result.taxableAmountInPaise).toBe(900000);
    expect(result.taxAmountInPaise).toBe(162000);
    expect(result.totalAmountInPaise).toBe(1062000);
  });

  it('should handle zero tax rate (tax exempt)', () => {
    const result = calculateLineItemFinancials(50000, 2, 0, 0, false);
    expect(result.taxableAmountInPaise).toBe(100000);
    expect(result.taxAmountInPaise).toBe(0);
    expect(result.totalAmountInPaise).toBe(100000);
  });

  it('should correctly categorize dues aging buckets', () => {
    const today = new Date('2026-06-15T00:00:00.000Z');

    // Future due date
    const futureDue = new Date('2026-06-20T00:00:00.000Z');
    expect(categorizeDuesAging(futureDue, today)).toBe('NOT_DUE');

    // Due today
    expect(categorizeDuesAging(today, today)).toBe('NOT_DUE');

    // 3 days overdue (1 to 7)
    const overdue3 = new Date('2026-06-12T00:00:00.000Z');
    expect(categorizeDuesAging(overdue3, today)).toBe('OVERDUE_1_7');

    // 15 days overdue (8 to 30)
    const overdue15 = new Date('2026-05-31T00:00:00.000Z');
    expect(categorizeDuesAging(overdue15, today)).toBe('OVERDUE_8_30');

    // 45 days overdue (31 to 60)
    const overdue45 = new Date('2026-05-01T00:00:00.000Z');
    expect(categorizeDuesAging(overdue45, today)).toBe('OVERDUE_31_60');

    // 75 days overdue (> 60)
    const overdue75 = new Date('2026-04-01T00:00:00.000Z');
    expect(categorizeDuesAging(overdue75, today)).toBe('OVERDUE_60_PLUS');
  });

  it('should parse and format paise reliably', () => {
    expect(parseInrToPaise('1499.50')).toBe(149950);
    expect(parseInrToPaise(500)).toBe(50000);
    expect(formatPaiseToInr(149950)).toContain('1,499.50');
  });
});
