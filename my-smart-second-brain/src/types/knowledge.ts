export type KnowledgeType = "Note" | "PDF" | "Article" | "URL";

export interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  type: KnowledgeType;
  tags: string[];
  dateAdded: string;
  source: string;
  readingTime: number;
  progress: number;
  content: string[];
  keyIdeas: string[];
  accent: "blue" | "lavender" | "mint";
}

export interface AddKnowledgeInput {
  title: string;
  description: string;
  tags: string[];
  mode: "upload" | "text" | "url";
  content: string;
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
}

export interface KnowledgeService {
  getKnowledge(): Promise<KnowledgeItem[]>;
  getKnowledgeById(id: string): Promise<KnowledgeItem | null>;
  searchKnowledge(query: string): Promise<KnowledgeItem[]>;
  addKnowledge(data: AddKnowledgeInput): Promise<KnowledgeItem>;
  askBrain(question: string): Promise<BrainAnswer>;
}
