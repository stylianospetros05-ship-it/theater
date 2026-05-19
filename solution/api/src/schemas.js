import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const reservationCreateSchema = z.object({
  showtimeId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1).max(12)
});

export const reservationUpdateSchema = z.object({
  showtimeId: z.string().uuid().optional(),
  seatIds: z.array(z.string().uuid()).min(1).max(12)
});
