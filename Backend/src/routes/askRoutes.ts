import { Router } from 'express';
import { askBrain, getAskHistory, deleteAskQuery } from '../controllers/askController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/ask - Ask question grounded in knowledge
router.post('/', requireAuth, askBrain);

// GET /api/ask/history - Retrieve question & answer history
router.get('/history', requireAuth, getAskHistory);

// DELETE /api/ask/history/:id - Remove a specific history item
router.delete('/history/:id', requireAuth, deleteAskQuery);

export default router;
