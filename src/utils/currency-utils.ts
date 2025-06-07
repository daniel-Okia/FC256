/**
 * Currency utility functions for Ugandan Shillings (UGX)
 */

/**
 * Formats a number as UGX currency
 */
export const formatUGX = (amount: number | undefined): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'UGX 0';
  }
  
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats a number as UGX with custom formatting
 */
export const formatUGXCustom = (amount: number | undefined): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'UGX 0';
  }
  
  // Format with commas for thousands
  const formatted = amount.toLocaleString('en-UG');
  return `UGX ${formatted}`;
};

/**
 * Parses a UGX string back to number
 */
export const parseUGX = (ugxString: string): number => {
  const cleaned = ugxString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validates if a UGX amount is valid
 */
export const isValidUGXAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0 && isFinite(amount);
};