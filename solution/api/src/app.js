import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRoutes } from './routes/authRoutes.js';
import { catalogRoutes } from './routes/catalogRoutes.js';
import { reservationRoutes } from './routes/reservationRoutes.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'theatre-reservation-api' });
});

app.use(authRoutes);
app.use(catalogRoutes);
app.use(reservationRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});
