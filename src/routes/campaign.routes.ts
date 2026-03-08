// src/routes/campaign.routes.ts
import { Router } from 'express';
import { sendSSTCampaign } from '../controllers/campaign.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Solo tú (autenticado) puedes disparar campañas comerciales
router.post('/send', authenticate, sendSSTCampaign);

export default router;