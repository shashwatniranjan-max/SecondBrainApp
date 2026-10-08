import { test } from 'node:test';
import assert from 'node:assert';
import { YouTubeService } from './youtube.service';

test('YouTube URL Validation', (t) => {
  const validUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'
  ];

  const invalidUrls = [
    'https://www.google.com',
    'https://youtube.com/watch',
    'not a url'
  ];

  validUrls.forEach(url => {
    assert.strictEqual(YouTubeService.extractVideoId(url), 'dQw4w9WgXcQ');
  });

  invalidUrls.forEach(url => {
    assert.strictEqual(YouTubeService.extractVideoId(url), null);
  });
});

test('Successful Transcript Retrieval', async (t) => {
  // Using a known video that has captions
  const res = await YouTubeService.getTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(res.title.includes('Rick Astley'));
  assert.strictEqual(res.originalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(res.transcript.length > 0);
  assert.ok(res.transcript[0].includes('[00:'));
});

test('Failure Transcript Retrieval - Invalid Video', async (t) => {
  try {
    await YouTubeService.getTranscript('https://www.youtube.com/watch?v=invalid_id');
    assert.fail('Should have thrown an error');
  } catch (error: any) {
    assert.ok(error.message.includes('Could not retrieve transcript') || error.message.includes('Invalid'));
  }
});
