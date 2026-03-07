// src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// Estas rutas se sumarán al prefijo que le daremos en el index.ts
router.post('/register', register);
router.post('/login', login);

export default router;