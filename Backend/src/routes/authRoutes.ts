import { Router } from 'express';
import { signup, signin, getMe } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', requireAuth, getMe);

export default router;
