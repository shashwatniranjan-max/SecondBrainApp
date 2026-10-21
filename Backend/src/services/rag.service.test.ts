import { test } from 'node:test';
import assert from 'node:assert';
import { RAGService } from './rag.service';

test('RAGService - splitTextIntoChunks handles small and large text', (t) => {
  const rag = new RAGService();

  // Test 1: Short text returns single chunk
  const shortText = 'Short note content.';
  const shortChunks = rag.splitTextIntoChunks(shortText, 500, 50);
  assert.strictEqual(shortChunks.length, 1);
  assert.strictEqual(shortChunks[0], 'Short note content.');

  // Test 2: Multiline text splitting by paragraphs
  const longText = Array.from({ length: 10 }, (_, i) => 
    `Paragraph ${i + 1}: This is detailed content about distributed systems architecture and database replication principles.`
  ).join('\n\n');

  const chunks = rag.splitTextIntoChunks(longText, 300, 50);
  assert.ok(chunks.length > 1, 'Should create multiple chunks for long content');
  
  // Verify chunks are non-empty and have reasonable length
  for (const c of chunks) {
    assert.ok(c.length > 0);
  }
});

test('RAGService - buildGroundedPrompt handles grounded and general questions', (t) => {
  const rag = new RAGService();

  // Case 1: Grounded question with retrieved chunks
  const mockChunks = [
    {
      knowledgeId: '6abf7f9a09528c4a8155cf2f',
      title: 'Express Router Architecture',
      type: 'Note',
      text: 'express.Router creates modular route handlers.',
      score: 0.88,
      sourceKind: 'text',
      chunkIndex: 0,
    },
  ];

  const grounded = rag.buildGroundedPrompt('How does Express Router work?', mockChunks);
  assert.ok(grounded.prompt.includes('Express Router Architecture'));
  assert.ok(grounded.prompt.includes('88%'));
  assert.ok(grounded.systemInstruction.includes('SAVED KNOWLEDGE QUESTIONS'));

  // Case 2: General question with 0 chunks
  const general = rag.buildGroundedPrompt('What is the capital of Japan?', []);
  assert.ok(general.prompt.includes('No relevant notes found'));
  assert.ok(general.systemInstruction.includes('GENERAL QUESTIONS'));
});
