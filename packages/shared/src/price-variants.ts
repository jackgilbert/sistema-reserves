/**
 * Price variant utilities for handling multi-tier pricing
 */

import type { PriceVariant } from './index';

/**
 * Selected variant quantities for a booking
 */
export interface VariantSelection {
  variantKey: string; // maps to PriceVariant.name
  quantity: number;
}

/**
 * Price breakdown with variant details
 */
export interface PriceBreakdown {
  basePrice: number;
  currency: string;
  variants: Array<{
    key: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
}

/**
 * Calculate total price for variant selections
 */
export function calculateVariantPrice(
  variants: PriceVariant[],
  selections: VariantSelection[],
  basePrice: number
): number {
  let total = 0;
  
  for (const selection of selections) {
    const variant = variants.find(v => v.name === selection.variantKey);
    if (variant) {
      total += variant.price * selection.quantity;
    } else if (selection.variantKey === '' || selection.variantKey === 'default') {
      // Empty variant key means base price
      total += basePrice * selection.quantity;
    }
  }
  
  return total;
}

/**
 * Generate a detailed price breakdown
 */
export function getPriceBreakdown(
  variants: PriceVariant[],
  selections: VariantSelection[],
  basePrice: number,
  currency: string = 'EUR'
): PriceBreakdown {
  const variantDetails: PriceBreakdown['variants'] = [];
  let total = 0;
  
  for (const selection of selections) {
    const variant = variants.find(v => v.name === selection.variantKey);
    let unitPrice = basePrice;
    let key = selection.variantKey;
    
    if (variant) {
      unitPrice = variant.price;
      key = variant.name;
    }
    
    const subtotal = unitPrice * selection.quantity;
    total += subtotal;
    
    variantDetails.push({
      key,
      quantity: selection.quantity,
      unitPrice,
      subtotal
    });
  }
  
  return {
    basePrice,
    currency,
    variants: variantDetails,
    total
  };
}

/**
 * Validate variant selections against defined variants
 */
export function validateVariantSelections(
  variants: PriceVariant[],
  selections: VariantSelection[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const selection of selections) {
    if (selection.quantity <= 0) {
      errors.push(`Invalid quantity for variant ${selection.variantKey}`);
      continue;
    }
    
    const variant = variants.find(v => v.name === selection.variantKey);
    if (!variant && selection.variantKey !== '' && selection.variantKey !== 'default') {
      errors.push(`Unknown variant: ${selection.variantKey}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

