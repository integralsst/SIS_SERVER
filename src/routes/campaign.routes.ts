// src/routes/contact.routes.ts
import { Router } from 'express';
import { bulkCreateContacts, getMyContacts } from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 1. Cargar nuevos correos (POST)
router.post('/bulk', authenticate, bulkCreateContacts);

// 2. LISTAR correos guardados (GET) -> Esta es la que falta para el Dashboard
router.get('/', authenticate, getMyContacts);

export default router;