import { z } from 'zod';

/**
 * Schema for saving payment method
 */
export const SavePaymentMethodSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  squareCustomerId: z.string().min(1),
  squareCardId: z.string().min(1),
  cardLastFour: z.string().length(4),
  cardBrand: z.string().min(1),
});

/**
 * Schema for retrieving saved payment methods
 */
export const GetPaymentMethodsQuerySchema = z.object({
  email: z.string().email(),
});

export type SavePaymentMethod = z.infer<typeof SavePaymentMethodSchema>;
export type GetPaymentMethodsQuery = z.infer<typeof GetPaymentMethodsQuerySchema>;

