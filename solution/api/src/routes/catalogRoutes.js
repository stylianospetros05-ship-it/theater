import { Router } from 'express';
import { listSeats, listShows, listShowtimes, listTheatres } from '../controllers/catalogController.js';

export const catalogRoutes = Router();

catalogRoutes.get('/theatres', listTheatres);
catalogRoutes.get('/shows', listShows);
catalogRoutes.get('/showtimes', listShowtimes);
catalogRoutes.get('/seats', listSeats);
