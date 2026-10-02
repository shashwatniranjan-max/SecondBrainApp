import { Router } from 'express';
import multer from 'multer';
import { 
  getKnowledge, 
  searchKnowledge, 
  getKnowledgeById, 
  addKnowledge, 
  deleteKnowledge,
  serveUploadedFile
} from '../controllers/knowledgeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Protect all knowledge routes
router.use(requireAuth);

router.get('/', getKnowledge);
router.get('/search', searchKnowledge); // Make sure this is above /:id
router.get('/file/:id', serveUploadedFile);
router.get('/:id', getKnowledgeById);
router.post('/', upload.single('file'), addKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
