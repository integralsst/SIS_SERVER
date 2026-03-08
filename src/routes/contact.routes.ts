// src/routes/contact.routes.ts
import { Router } from 'express';
import { bulkCreateContacts, getMyContacts } from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/bulk', authenticate, bulkCreateContacts);
router.get('/', authenticate, getMyContacts);

export default router;