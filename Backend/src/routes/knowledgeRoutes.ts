import { Router } from 'express';
import multer from 'multer';
import { 
  getKnowledge, 
  searchKnowledge, 
  getKnowledgeById, 
  addKnowledge, 
  deleteKnowledge,
  serveUploadedFile,
  analyzeImage,
} from '../controllers/knowledgeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents and JPEG, PNG, WebP images are allowed'));
    }
  },
});

// Protect all knowledge routes
router.use(requireAuth);

router.get('/', getKnowledge);
router.get('/search', searchKnowledge); // Make sure this is above /:id
router.get('/file/:id', serveUploadedFile);
router.get('/:id', getKnowledgeById);
router.post('/analyze-image', upload.single('file'), analyzeImage);
router.post('/', upload.single('file'), addKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
