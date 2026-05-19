import { Router } from 'express';
import {
  cancelReservation,
  createReservation,
  listUserReservations,
  updateReservation
} from '../controllers/reservationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { reservationCreateSchema, reservationUpdateSchema } from '../schemas.js';

export const reservationRoutes = Router();

reservationRoutes.post('/reservations', requireAuth, validateBody(reservationCreateSchema), createReservation);
reservationRoutes.put('/reservations/:id', requireAuth, validateBody(reservationUpdateSchema), updateReservation);
reservationRoutes.delete('/reservations/:id', requireAuth, cancelReservation);
reservationRoutes.get('/user/reservations', requireAuth, listUserReservations);
