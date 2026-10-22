export type KnowledgeType = "Note" | "PDF" | "Article" | "URL" | "Image";

export interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  type: KnowledgeType;
  tags: string[];
  dateAdded: string;
  source: string;
  sourceUrl?: string;
  readingTime: number;
  progress: number;
  content: string[];
  keyIdeas: string[];
  accent: "blue" | "lavender" | "mint";
}

export interface ImageAnalysisData {
  summary: string;
  extractedText: string;
  keyConcepts: string[];
  detailedExplanation: string;
  importantRelationships: string[];
  uncertainties?: string;
  modelUsed?: string;
}

export interface AddKnowledgeInput {
  title: string;
  description: string;
  tags: string[];
  mode: "upload" | "text" | "url" | "youtube" | "image";
  content: string;
  originalUrl?: string;
  file?: File;
  imageMetadata?: ImageAnalysisData;
}

export interface BrainSource {
  knowledgeId: string;
  title: string;
  excerpt: string;
  relevance: number;
}

export interface BrainAnswer {
  id: string;
  question: string;
  answer: string;
  sources: BrainSource[];
  relatedKnowledgeIds: string[];
  suggestedQuestions: string[];
  createdAt?: string;
}

export interface KnowledgeService {
  getKnowledge(): Promise<KnowledgeItem[]>;
  getKnowledgeById(id: string): Promise<KnowledgeItem | null>;
  searchKnowledge(query: string): Promise<KnowledgeItem[]>;
  addKnowledge(data: AddKnowledgeInput): Promise<KnowledgeItem>;
  deleteKnowledge(id: string): Promise<void>;
  askBrain(question: string): Promise<BrainAnswer>;
  getAskHistory(): Promise<BrainAnswer[]>;
  deleteAskQuery(id: string): Promise<void>;
  getYouTubeTranscript(
    url: string,
  ): Promise<{ title: string; originalUrl: string; transcript: string[] }>;
  analyzeImage(file: File): Promise<ImageAnalysisData>;
}
