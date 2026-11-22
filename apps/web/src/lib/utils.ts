import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatPaiseToInr(paise: number = 0): string {
  const inr = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inr);
}

export function parseInrToPaise(rupees: number | string = 0): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export interface LineItemCalculation {
  taxableAmountInPaise: number;
  taxAmountInPaise: number;
  totalAmountInPaise: number;
}

export function calculateLineItemFinancials(
  unitPriceInPaise: number,
  quantity: number,
  discountInPaise: number = 0,
  taxRateBps: number = 1800,
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
    const taxAmountInPaise = Math.round((grossInPaise * taxRateBps) / (10000 + taxRateBps));
    const taxableAmountInPaise = grossInPaise - taxAmountInPaise;
    return {
      taxableAmountInPaise,
      taxAmountInPaise,
      totalAmountInPaise: grossInPaise,
    };
  } else {
    const taxAmountInPaise = Math.round((grossInPaise * taxRateBps) / 10000);
    const totalAmountInPaise = grossInPaise + taxAmountInPaise;
    return {
      taxableAmountInPaise: grossInPaise,
      taxAmountInPaise,
      totalAmountInPaise,
    };
  }
}


