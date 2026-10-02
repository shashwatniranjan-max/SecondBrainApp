import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import askRoutes from './routes/askRoutes';
import shareRoutes from './routes/shareRoutes';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/ask', askRoutes);
app.use('/api/share', shareRoutes);

// Base route for health check
app.get('/', (req, res) => {
  res.json({ message: 'Second Brain API is running' });
});

// Error handling middleware should be last
app.use(errorHandler);

export default app;
