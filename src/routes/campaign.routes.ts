// src/routes/contact.routes.ts
import { Router } from 'express';
import { bulkCreateContacts, getMyContacts } from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { sendSSTCampaign } from '../controllers/campaign.controller';

const router = Router();

// 1. Cargar nuevos correos (POST)
router.post('/bulk', authenticate, bulkCreateContacts);

// 2. LISTAR correos guardados (GET) -> Esta es la que falta para el Dashboard
router.get('/', authenticate, getMyContacts);

router.post('/send', authenticate, sendSSTCampaign);

export default router;