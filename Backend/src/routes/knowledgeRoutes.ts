import { Router } from 'express';
import { 
  getKnowledge, 
  searchKnowledge, 
  getKnowledgeById, 
  addKnowledge, 
  deleteKnowledge 
} from '../controllers/knowledgeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all knowledge routes
router.use(requireAuth);

router.get('/', getKnowledge);
router.get('/search', searchKnowledge); // Make sure this is above /:id
router.get('/:id', getKnowledgeById);
router.post('/', addKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
