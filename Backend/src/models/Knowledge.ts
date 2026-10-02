import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledge extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'Note' | 'PDF' | 'Article' | 'URL';
  tags: string[];
  dateAdded: Date;
  source: {
    kind: string;
    url?: string;
    originalName?: string;
    objectKey?: string;
    mimeType?: string;
    size?: number;
  };
  readingTime: number;
  progress: number;
  content: string[];
  keyIdeas: string[];
  accent?: 'blue' | 'lavender' | 'mint';
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeSchema = new Schema<IKnowledge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Note', 'PDF', 'Article', 'URL'],
      required: true,
    },
    tags: { type: [String], default: [] },
    dateAdded: { type: Date, default: Date.now },
    source: {
      kind: { type: String, required: true },
      url: { type: String },
      originalName: { type: String },
      objectKey: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
    readingTime: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    content: { type: [String], default: [] },
    keyIdeas: { type: [String], default: [] },
    accent: {
      type: String,
      enum: ['blue', 'lavender', 'mint'],
    },
  },
  { timestamps: true }
);

// Index for text search (Ask My Brain V1 / general search)
knowledgeSchema.index({ title: 'text', description: 'text', 'content': 'text', tags: 'text' });
knowledgeSchema.index({ userId: 1 });

export const Knowledge = mongoose.model<IKnowledge>('Knowledge', knowledgeSchema);
