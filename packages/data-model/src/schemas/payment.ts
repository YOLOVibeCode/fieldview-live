import { z } from 'zod';

export const SavePaymentMethodSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cardLastFour: z.string().length(4).optional(),
  cardBrand: z.string().min(1).optional(),
});

export const GetPaymentMethodsQuerySchema = z.object({
  email: z.string().email(),
});

export type SavePaymentMethod = z.infer<typeof SavePaymentMethodSchema>;
export type GetPaymentMethodsQuery = z.infer<typeof GetPaymentMethodsQuerySchema>;
