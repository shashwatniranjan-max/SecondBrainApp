import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db';
import { Knowledge } from '../models/Knowledge';
import { ragService } from '../services/rag.service';

dotenv.config();

async function runBackfill() {
  console.log('--- Starting Backfill of Embeddings for Existing Knowledge ---');
  await connectDB();

  // Find all items that are either pending, not yet indexed, or have 0 chunks
  const items = await Knowledge.find({
    $or: [
      { embeddingStatus: { $ne: 'completed' } },
      { chunkCount: { $exists: false } },
      { chunkCount: 0 },
    ],
  });

  console.log(`Found ${items.length} knowledge items requiring indexing.`);

  let successCount = 0;
  let failCount = 0;
  let totalChunks = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] Processing: "${item.title}" (${item.type})...`);

    try {
      const chunksIndexed = await ragService.indexKnowledge(item._id);
      totalChunks += chunksIndexed;
      successCount++;
    } catch (err: any) {
      console.error(`Failed to index "${item.title}":`, err.message);
      failCount++;
      item.embeddingStatus = 'failed';
      await item.save();
    }
  }

  console.log('--- Backfill Complete ---');
  console.log(`Total items processed: ${items.length}`);
  console.log(`Successfully indexed: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total vector chunks created: ${totalChunks}`);

  await mongoose.disconnect();
  process.exit(0);
}

runBackfill().catch((err) => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
