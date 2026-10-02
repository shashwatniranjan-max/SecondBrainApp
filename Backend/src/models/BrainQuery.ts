import mongoose, { Document, Schema } from 'mongoose';

export interface IBrainQuery extends Document {
  userId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  sources: Array<{
    knowledgeId: mongoose.Types.ObjectId;
    title: string;
    excerpt: string;
    relevance: number;
  }>;
  relatedKnowledgeIds: mongoose.Types.ObjectId[];
  suggestedQuestions: string[];
  createdAt: Date;
}

const brainQuerySchema = new Schema<IBrainQuery>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sources: [
      {
        knowledgeId: { type: Schema.Types.ObjectId, ref: 'Knowledge' },
        title: { type: String },
        excerpt: { type: String },
        relevance: { type: Number },
      },
    ],
    relatedKnowledgeIds: [{ type: Schema.Types.ObjectId, ref: 'Knowledge' }],
    suggestedQuestions: [{ type: String }],
  },
  { timestamps: { updatedAt: false } }
);

export const BrainQuery = mongoose.model<IBrainQuery>('BrainQuery', brainQuerySchema);
