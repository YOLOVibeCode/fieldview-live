/**
 * Shared marketplace pricing: platform fee, processing estimate, list validation.
 */

import { z } from 'zod';

export const PLATFORM_FEE_BPS = 1000;
export const MIN_CHARGE_CENTS = 100;
export const MAX_LIST_PRICE_CENTS = 1_000_000;

export const PROCESSING_ESTIMATE = {
  rateBps: 290,
  fixedCents: 30,
} as const;

export type ProcessingEstimate = {
  rateBps: number;
  fixedCents: number;
};

export type FeeMode = 'absorb' | 'pass_through';

export class InvalidListPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidListPriceError';
  }
}

export function validateListPrice(cents: number): void {
  if (!Number.isInteger(cents)) {
    throw new InvalidListPriceError('Price must be an integer number of cents');
  }
  if (cents < 0) {
    throw new InvalidListPriceError('Price cannot be negative');
  }
  if (cents > MAX_LIST_PRICE_CENTS) {
    throw new InvalidListPriceError(
      `Price cannot exceed ${MAX_LIST_PRICE_CENTS / 100} USD`,
    );
  }
  if (cents > 0 && cents < MIN_CHARGE_CENTS) {
    throw new InvalidListPriceError(
      `Paid price must be at least $${MIN_CHARGE_CENTS / 100} or free (0)`,
    );
  }
}

export function isValidListPrice(cents: number): boolean {
  try {
    validateListPrice(cents);
    return true;
  } catch {
    return false;
  }
}

export function platformFeePercentLabel(): string {
  return `${PLATFORM_FEE_BPS / 100}%`;
}

const defaultProcessing = (): ProcessingEstimate => ({ ...PROCESSING_ESTIMATE });

function processingRateFraction(processing: ProcessingEstimate): number {
  return processing.rateBps / 10_000;
}

function platformRateFraction(): number {
  return PLATFORM_FEE_BPS / 10_000;
}

export function viewerPrice({
  listCents,
  feeMode,
  processingEstimate = defaultProcessing(),
}: {
  listCents: number;
  feeMode: FeeMode;
  processingEstimate?: ProcessingEstimate;
}): number {
  validateListPrice(listCents);
  if (feeMode === 'absorb') {
    return listCents;
  }
  const platformRate = platformRateFraction();
  const processingRate = processingRateFraction(processingEstimate);
  const denominator = 1 - platformRate - processingRate;
  if (denominator <= 0) {
    throw new Error('Invalid fee rates: pass-through denominator must be positive');
  }
  return Math.ceil((listCents + processingEstimate.fixedCents) / denominator);
}

export type SplitResult = {
  platformFeeCents: number;
  processingCents: number;
  coachNetCents: number;
};

export function split({
  chargedCents,
  processingEstimate = defaultProcessing(),
}: {
  chargedCents: number;
  processingEstimate?: ProcessingEstimate;
}): SplitResult {
  if (chargedCents < 0) {
    throw new Error('Charged amount cannot be negative');
  }
  const platformFeeCents = Math.round(
    (chargedCents * PLATFORM_FEE_BPS) / 10_000,
  );
  const processingCents = Math.round(
    (chargedCents * processingEstimate.rateBps) / 10_000 +
      processingEstimate.fixedCents,
  );
  const coachNetCents = chargedCents - platformFeeCents - processingCents;
  return { platformFeeCents, processingCents, coachNetCents };
}

export const zListPriceInCents = () =>
  z
    .number()
    .int()
    .min(0)
    .max(MAX_LIST_PRICE_CENTS)
    .superRefine((val, ctx) => {
      try {
        validateListPrice(val);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid list price';
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    });

export const zListPriceInCentsOptional = () => zListPriceInCents().optional();

export const zListPriceInCentsNullableOptional = () =>
  zListPriceInCents().nullable().optional();
