import { Router } from 'express';
import { getYouTubeTranscript } from '../controllers/youtube.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Retrieve YouTube transcript
router.post('/transcript', requireAuth, getYouTubeTranscript);

export default router;
