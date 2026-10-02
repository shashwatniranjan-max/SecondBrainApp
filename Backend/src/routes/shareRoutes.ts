import { Router } from 'express';
import { 
  createShareLink, 
  getShareLinks, 
  toggleShareLink, 
  getPublicSharedKnowledge 
} from '../controllers/shareController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public route
router.get('/public/:token', getPublicSharedKnowledge);

// Protected routes
router.use(requireAuth);
router.post('/', createShareLink);
router.get('/', getShareLinks);
router.patch('/:id', toggleShareLink);

export default router;
