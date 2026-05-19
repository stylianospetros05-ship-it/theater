import { Router } from 'express';
import { login, refreshSession, register } from '../controllers/authController.js';
import { loginSchema, refreshSchema, registerSchema } from '../schemas.js';
import { validateBody } from '../middleware/validate.js';

export const authRoutes = Router();

authRoutes.post('/register', validateBody(registerSchema), register);
authRoutes.post('/login', validateBody(loginSchema), login);
authRoutes.post('/refresh', validateBody(refreshSchema), refreshSession);
