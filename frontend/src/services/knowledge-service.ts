import type {
  AddKnowledgeInput,
  BrainAnswer,
  KnowledgeItem,
  KnowledgeService,
} from "@/types/knowledge";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const API_BASE = import.meta.env["VITE_API_URL"]?.replace(/\/$/, "") || "http://localhost:5000";
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
  async askBrain(
    question: string,
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
  ) {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ question, conversationHistory }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || json.error || "Failed to query Second Brain");
    }
    const json = await res.json();
    return json.data;
  },
  async getAskHistory() {
    const res = await fetch(`${API_BASE}/api/ask/history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch query history");
    const json = await res.json();
    return json.data || [];
  },
  async deleteAskQuery(id: string) {
    const res = await fetch(`${API_BASE}/api/ask/history/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete query");
  },
  async getYouTubeTranscript(url: string) {
    const res = await fetch(`${API_URL.replace("/api/knowledge", "/api/youtube/transcript")}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Failed to fetch YouTube transcript");
    }
    const json = await res.json();
    return json.data;
  },
};
