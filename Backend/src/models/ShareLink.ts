import mongoose, { Document, Schema } from 'mongoose';

export interface IShareLink extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  enabled: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: { updatedAt: false } }
);

export const ShareLink = mongoose.model<IShareLink>('ShareLink', shareLinkSchema);
