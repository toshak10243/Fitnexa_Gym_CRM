/**
 * Authoritative financial calculation utilities for Fitnexa
 * Operating strictly in integer paise (₹1 = 100 paise)
 */

export interface LineItemCalculation {
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  totalAmountInPaise: number;
}

/**
 * Computes taxable amount and GST with integer half-up rounding
 */
export function calculateLineItemFinancials(
  unitPriceInPaise: number,
  quantity: number,
  discountInPaise: number = 0,
  taxRateBps: number = 1800, // 1800 bps = 18.00%
  isTaxInclusive: boolean = false,
): LineItemCalculation {
  const grossInPaise = Math.max(0, unitPriceInPaise * quantity - discountInPaise);

  if (taxRateBps <= 0) {
    return {
      taxableAmountInPaise: grossInPaise,
      taxAmountInPaise: 0,
      totalAmountInPaise: grossInPaise,
    };
  }

  if (isTaxInclusive) {
    // Total gross includes tax
    // Tax = Math.round((gross * taxRateBps) / (10000 + taxRateBps))
    const taxAmountInPaise = Math.round((grossInPaise * taxRateBps) / (10000 + taxRateBps));
    const taxableAmountInPaise = grossInPaise - taxAmountInPaise;
    return {
      taxableAmountInPaise,
      taxAmountInPaise,
      totalAmountInPaise: grossInPaise,
    };
  } else {
    // Total gross is before tax
    // Tax = Math.round((gross * taxRateBps) / 10000)
    const taxAmountInPaise = Math.round((grossInPaise * taxRateBps) / 10000);
    const totalAmountInPaise = grossInPaise + taxAmountInPaise;
    return {
      taxableAmountInPaise: grossInPaise,
      taxAmountInPaise,
      totalAmountInPaise,
    };
  }
}

export type DuesAgingBucket =
  | 'NOT_DUE'
  | 'OVERDUE_1_7'
  | 'OVERDUE_8_30'
  | 'OVERDUE_31_60'
  | 'OVERDUE_60_PLUS';

/**
 * Calculates dues aging category based on Asia/Kolkata calendar days difference
 */
export function categorizeDuesAging(dueDate: Date, referenceDate: Date = new Date()): DuesAgingBucket {
  const utcDue = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const utcRef = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  const diffMs = utcRef - utcDue;
  const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return 'NOT_DUE';
  } else if (daysOverdue >= 1 && daysOverdue <= 7) {
    return 'OVERDUE_1_7';
  } else if (daysOverdue >= 8 && daysOverdue <= 30) {
    return 'OVERDUE_8_30';
  } else if (daysOverdue >= 31 && daysOverdue <= 60) {
    return 'OVERDUE_31_60';
  } else {
    return 'OVERDUE_60_PLUS';
  }
}

export function formatPaiseToInr(paise: number): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inr);
}

export function parseInrToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
