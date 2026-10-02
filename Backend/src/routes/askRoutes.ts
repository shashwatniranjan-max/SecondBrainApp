import { Router } from 'express';
import { askBrain } from '../controllers/askController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, askBrain);

export default router;
