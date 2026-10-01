import { z } from 'zod';

export const smsOptInSchema = z.literal(true);

export const optionalE164PhoneSchema = z.string().min(1).optional();
