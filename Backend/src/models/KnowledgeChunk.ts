import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  knowledgeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata: {
    title: string;
    type: 'Note' | 'PDF' | 'Article' | 'URL' | 'Image';
    tags: string[];
    sourceKind: string;
    sourceUrl?: string;
  };
  createdAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    knowledgeId: {
      type: Schema.Types.ObjectId,
      ref: 'Knowledge',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      title: { type: String, required: true },
      type: {
        type: String,
        enum: ['Note', 'PDF', 'Article', 'URL', 'Image'],
        required: true,
      },
      tags: { type: [String], default: [] },
      sourceKind: { type: String, required: true },
      sourceUrl: { type: String },
    },
  },
  { timestamps: { updatedAt: false } }
);

// Compound indexes for rapid lookup, user-isolation and clean cascade deletion
knowledgeChunkSchema.index({ knowledgeId: 1, chunkIndex: 1 });
knowledgeChunkSchema.index({ userId: 1 });

export const KnowledgeChunk = mongoose.model<IKnowledgeChunk>('KnowledgeChunk', knowledgeChunkSchema);
