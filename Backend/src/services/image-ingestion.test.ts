import { test } from 'node:test';
import assert from 'node:assert';
import {
  detectMagicBytes,
  MAX_IMAGE_FILE_SIZE,
  MAX_PDF_FILE_SIZE,
  SUPPORTED_IMAGE_MIMES,
} from '../utils/fileValidation';
import {
  geminiService,
  ImageAnalysisResult,
} from './gemini.service';
import { RAGService, RetrievedChunk } from './rag.service';
import { addKnowledgeSchema } from '../validators/knowledgeValidator';

// --- Test Suite 1: File Validation & Magic Byte Security ---
test('File Validation - detectMagicBytes accurately identifies authentic binary headers', () => {
  // 1. Valid JPEG
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegResult = detectMagicBytes(jpegHeader);
  assert.ok(jpegResult !== null);
  assert.strictEqual(jpegResult.mimeType, 'image/jpeg');
  assert.strictEqual(jpegResult.extension, 'jpg');
  assert.strictEqual(jpegResult.category, 'image');

  // 2. Valid PNG
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngResult = detectMagicBytes(pngHeader);
  assert.ok(pngResult !== null);
  assert.strictEqual(pngResult.mimeType, 'image/png');
  assert.strictEqual(pngResult.extension, 'png');

  // 3. Valid WebP (RIFF....WEBP)
  const webpHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // size
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);
  const webpResult = detectMagicBytes(webpHeader);
  assert.ok(webpResult !== null);
  assert.strictEqual(webpResult.mimeType, 'image/webp');
  assert.strictEqual(webpResult.extension, 'webp');

  // 4. Valid PDF
  const pdfHeader = Buffer.from('%PDF-1.7 header content here');
  const pdfResult = detectMagicBytes(pdfHeader);
  assert.ok(pdfResult !== null);
  assert.strictEqual(pdfResult.mimeType, 'application/pdf');
  assert.strictEqual(pdfResult.category, 'document');

  // 5. Spoofed text file claiming to be an image
  const fakeImage = Buffer.from('console.log("I am secretly javascript but named diagram.png")');
  const fakeResult = detectMagicBytes(fakeImage);
  assert.strictEqual(fakeResult, null, 'Should reject spoofed text files');

  // 6. Buffer too small
  const tinyBuffer = Buffer.from([0xff, 0xd8]);
  assert.strictEqual(detectMagicBytes(tinyBuffer), null);

  // 7. Max size constants
  assert.strictEqual(MAX_IMAGE_FILE_SIZE, 15 * 1024 * 1024);
  assert.strictEqual(MAX_PDF_FILE_SIZE, 25 * 1024 * 1024);
  assert.ok(SUPPORTED_IMAGE_MIMES.includes('image/jpeg'));
  assert.ok(SUPPORTED_IMAGE_MIMES.includes('image/png'));
  assert.ok(SUPPORTED_IMAGE_MIMES.includes('image/webp'));
});

// --- Test Suite 2: Gemma 4 Structured Analysis Parsing & Fallback ---
test('GeminiService - parseAndValidateImageAnalysis handles structured JSON and markdown fences', () => {
  // Case A: Clean JSON
  const validJson = JSON.stringify({
    summary: 'Microservices architecture with API Gateway and Kafka event bus.',
    extractedText: 'POST /orders -> OrderService -> Kafka Topic',
    keyConcepts: ['Microservices', 'API Gateway', 'Kafka', 'Event-Driven'],
    detailedExplanation: 'Clients communicate via HTTPS with the API Gateway. The Gateway routes order requests to OrderService which publishes to Kafka.',
    importantRelationships: ['Gateway routes to OrderService', 'OrderService produces to Kafka Topic'],
    uncertainties: 'None',
  });

  const resultA = geminiService.parseAndValidateImageAnalysis(validJson, 'gemma-4-31b-it');
  assert.strictEqual(resultA.summary, 'Microservices architecture with API Gateway and Kafka event bus.');
  assert.strictEqual(resultA.keyConcepts.length, 4);
  assert.strictEqual(resultA.modelUsed, 'gemma-4-31b-it');
  assert.strictEqual(resultA.uncertainties, undefined); // 'None' is filtered out

  // Case B: Markdown-wrapped JSON (```json ... ```)
  const wrappedJson = `\`\`\`json
${validJson}
\`\`\``;
  const resultB = geminiService.parseAndValidateImageAnalysis(wrappedJson, 'gemini-3-flash-preview');
  assert.strictEqual(resultB.summary, 'Microservices architecture with API Gateway and Kafka event bus.');
  assert.strictEqual(resultB.modelUsed, 'gemini-3-flash-preview');

  // Case C: Malformed non-JSON output (model hallucination or raw text)
  const rawTextOutput = `Summary: Flowchart illustrating the TCP three-way handshake protocol.
Extracted text: SYN -> SYN-ACK -> ACK
Detailed explanation: The client sends SYN packet, server replies with SYN-ACK, and client finishes with ACK.`;

  const resultC = geminiService.parseAndValidateImageAnalysis(rawTextOutput, 'gemma-4-31b-it');
  assert.ok(resultC.summary.includes('TCP three-way handshake'));
  assert.ok(resultC.extractedText.includes('SYN-ACK'));
  assert.strictEqual(resultC.modelUsed, 'gemma-4-31b-it');
  assert.ok(Array.isArray(resultC.keyConcepts));
});

test('GeminiService - formatImageAnalysisAsMarkdown creates rich searchable content', () => {
  const analysis: ImageAnalysisResult = {
    summary: 'High-level database replication architecture.',
    extractedText: 'Master (Write) -> Binary Log -> Replica (Read)',
    keyConcepts: ['Replication', 'Binary Log', 'Read Replicas'],
    detailedExplanation: 'All writes go to the primary node. Asynchronous worker threads stream changes from binary log to replica nodes.',
    importantRelationships: ['Primary replicates to secondary via binlog'],
    uncertainties: 'Port numbers in the bottom-left corner are blurred',
    modelUsed: 'gemma-4-31b-it',
  };

  const md = geminiService.formatImageAnalysisAsMarkdown(analysis);
  assert.ok(md.includes('## Summary'));
  assert.ok(md.includes('database replication architecture'));
  assert.ok(md.includes('## Extracted Text & Code'));
  assert.ok(md.includes('Binary Log'));
  assert.ok(md.includes('## Key Concepts'));
  assert.ok(md.includes('- Replication'));
  assert.ok(md.includes('## Detailed Diagram & Technical Breakdown'));
  assert.ok(md.includes('## Key Relationships & Connections'));
  assert.ok(md.includes('## Uncertainties & Ambiguities'));
  assert.ok(md.includes('Port numbers in the bottom-left corner'));
});

// --- Test Suite 3: RAG Chunking, Embeddings, and Retrieval for Images ---
test('RAGService - splits and chunks image markdown into semantic units with overlap', () => {
  const rag = new RAGService();

  const analysis: ImageAnalysisResult = {
    summary: 'Neural network transformer architecture with multi-head self-attention mechanisms and feedforward layers.',
    extractedText: 'Input Embedding -> Positional Encoding -> Multi-Head Attention -> Add & Norm -> Feed Forward -> Output Probabilities',
    keyConcepts: ['Transformer', 'Self-Attention', 'Positional Encoding', 'Feed Forward', 'Residual Connection'],
    detailedExplanation: Array.from({ length: 6 }, (_, i) =>
      `Layer ${i + 1} uses scaled dot-product attention Q * K^T / sqrt(d_k) followed by softmax and linear projection.`
    ).join('\n\n'),
    importantRelationships: ['Attention feeds into normalization layer', 'Residual connection bypasses attention'],
  };

  const markdown = geminiService.formatImageAnalysisAsMarkdown(analysis);
  const chunks = rag.splitTextIntoChunks(markdown, 400, 80);

  assert.ok(chunks.length >= 1, 'Should split content into valid chunks');
  for (const chunk of chunks) {
    assert.ok(chunk.length > 0);
  }
});

test('RAGService - buildGroundedPrompt supports Image knowledge sources and grounded Q&A', () => {
  const rag = new RAGService();

  const imageChunks: RetrievedChunk[] = [
    {
      knowledgeId: '6abf7f9a09528c4a8155cf3a',
      title: 'Kubernetes Cluster Architecture Diagram',
      type: 'Image',
      text: 'Detailed explanation: The Control Plane consists of kube-apiserver, etcd, kube-scheduler, and kube-controller-manager. Worker nodes run kubelet and kube-proxy.',
      score: 0.92,
      sourceKind: 'image',
      chunkIndex: 0,
    },
  ];

  // Grounded question about the image
  const grounded = rag.buildGroundedPrompt('What components are on the worker nodes in my cluster diagram?', imageChunks);
  assert.ok(grounded.prompt.includes('Kubernetes Cluster Architecture Diagram'));
  assert.ok(grounded.prompt.includes('(Image)'));
  assert.ok(grounded.prompt.includes('92%'));
  assert.ok(grounded.systemInstruction.includes('saved images, diagrams, flowcharts'));

  // Ensure answer generation instructions require citations
  assert.ok(grounded.systemInstruction.includes('[Source 1]'));
});

// --- Test Suite 4: Schema Validation for Image Knowledge Ingestion ---
test('KnowledgeValidator - accepts image mode with optional title and imageMetadata', () => {
  // Case 1: Valid image submission with title
  const input1 = {
    title: 'System Design Diagram',
    description: 'Architecture diagram from whiteboard',
    tags: ['Architecture', 'SystemDesign'],
    mode: 'image',
    content: '## Summary\nArchitecture diagram...',
  };
  const parsed1 = addKnowledgeSchema.parse(input1);
  assert.strictEqual(parsed1.mode, 'image');
  assert.strictEqual(parsed1.title, 'System Design Diagram');

  // Case 2: Image submission without title (auto-generated by backend)
  const input2 = {
    mode: 'image',
    tags: ['Whiteboard'],
  };
  const parsed2 = addKnowledgeSchema.parse(input2);
  assert.strictEqual(parsed2.mode, 'image');
  assert.strictEqual(parsed2.title, '');

  // Case 3: Rejects invalid mode
  assert.throws(() => {
    addKnowledgeSchema.parse({ mode: 'unsupported-type' });
  });
});

// --- Test Suite 5: Regression Tests for Existing Ingestion Types ---
test('Regression - Text, PDF, URL, and YouTube ingestion workflows remain intact', () => {
  // 1. Text Note
  const textInput = {
    title: 'Meeting Notes',
    description: 'Weekly team sync',
    tags: ['Team', 'Notes'],
    mode: 'text',
    content: 'Discussed Q4 roadmap and delivery goals.',
  };
  assert.strictEqual(addKnowledgeSchema.parse(textInput).mode, 'text');

  // 2. PDF upload
  const pdfInput = {
    title: 'Research Paper',
    mode: 'upload',
    content: 'Research_Paper.pdf',
  };
  assert.strictEqual(addKnowledgeSchema.parse(pdfInput).mode, 'upload');

  // 3. Web URL
  const urlInput = {
    title: 'React 19 Documentation',
    mode: 'url',
    content: 'https://react.dev/blog/2024/04/25/react-19',
  };
  assert.strictEqual(addKnowledgeSchema.parse(urlInput).mode, 'url');

  // 4. YouTube
  const youtubeInput = {
    title: 'Distributed Systems Lecture',
    mode: 'youtube',
    content: 'First transcript segment\n\nSecond segment',
    originalUrl: 'https://www.youtube.com/watch?v=12345',
  };
  assert.strictEqual(addKnowledgeSchema.parse(youtubeInput).mode, 'youtube');
});

// --- Test Suite 6: Decoupled Image Ingestion & Analysis Lifecycle ---
test('Decoupled Workflow - unanalysed images return empty text and keep pending embedding status', async () => {
  const rag = new RAGService();

  // 1. Mock unanalyzed image document
  const unanalyzedImageDoc: any = {
    type: 'Image',
    title: 'Whiteboard Architecture',
    analysisStatus: 'pending',
    embeddingStatus: 'pending',
    content: ['Your new knowledge has been processed.'],
    source: {
      kind: 'image',
      originalName: 'whiteboard.jpg',
      objectKey: 'users/123/knowledge/abc.jpg',
    },
  };

  // extractFullText must NOT analyze or return placeholder text for unanalyzed images
  const text = await rag.extractFullText(unanalyzedImageDoc);
  assert.strictEqual(text, '', 'Unanalyzed image must return empty string for full text');

  // 2. Mock completed image document
  const analyzedImageDoc: any = {
    type: 'Image',
    title: 'System Architecture',
    analysisStatus: 'completed',
    embeddingStatus: 'completed',
    content: ['## Summary\nClean microservices architecture with API Gateway.'],
  };

  const analyzedText = await rag.extractFullText(analyzedImageDoc);
  assert.ok(analyzedText.includes('Clean microservices architecture'));
});

test('Multimodal Q&A - GeminiService contains answerImageQuestion method', () => {
  assert.strictEqual(typeof (geminiService as any).answerImageQuestion, 'function');
});

