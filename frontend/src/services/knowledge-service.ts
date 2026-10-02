import type {
  AddKnowledgeInput,
  BrainAnswer,
  KnowledgeItem,
  KnowledgeService,
} from "@/types/knowledge";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const API_BASE = (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000");
const API_URL = `${API_BASE}/api/knowledge`;

const getHeaders = (omitContentType = false) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    ...(!omitContentType && { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const knowledgeService: KnowledgeService = {
  async getKnowledge() {
    const res = await fetch(API_URL, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch knowledge");
    const json = await res.json();
    return json.data;
  },
  async getKnowledgeById(id) {
    const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  },
  async searchKnowledge(query) {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to search knowledge");
    const json = await res.json();
    return json.data;
  },
  async addKnowledge(data: AddKnowledgeInput) {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("mode", data.mode);
    formData.append("tags", JSON.stringify(data.tags));
    if (data.mode === "upload" && data.file) {
      formData.append("file", data.file);
    } else {
      formData.append("content", data.content);
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to add knowledge");
    const json = await res.json();
    return json.data;
  },
  async deleteKnowledge(id: string) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete knowledge");
  },
  async askBrain(question) {
    await wait(1100);
    const related = ["designing-data-intensive-applications", "system-design-primer"];
    const response: BrainAnswer = {
      id: `answer-${Date.now()}`,
      question,
      answer:
        "Your notes frame distributed systems as an exercise in explicit trade-offs. Reliability comes from expecting partial failure and designing recovery paths, while scalability starts by naming the actual load parameters instead of treating scale as a generic quality. You also noted that caching, queues, and replication improve resilience and throughput, but each introduces consistency or operational complexity. [1] [2]",
      sources: [
        {
          knowledgeId: "designing-data-intensive-applications",
          title: "Designing Data-Intensive Applications",
          excerpt:
            "Reliable systems tolerate expected faults without interrupting the user experience.",
          relevance: 96,
        },
        {
          knowledgeId: "system-design-primer",
          title: "System Design Primer",
          excerpt:
            "Caching and queues improve latency and resilience while introducing new trade-offs.",
          relevance: 89,
        },
      ],
      relatedKnowledgeIds: related,
      suggestedQuestions: [
        "How do queues improve system reliability?",
        "Compare strong and eventual consistency",
        "What should I review next?",
      ],
    };
    return response;
  },
};
