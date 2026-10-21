import app from './app';
import { connectDB } from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Non-blocking initialization of Atlas Vector Search index
  import('./services/rag.service').then(({ ragService }) => {
    ragService.ensureVectorIndex().catch((err: any) => {
      console.warn('Vector index initialization notice:', err.message);
    });
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
