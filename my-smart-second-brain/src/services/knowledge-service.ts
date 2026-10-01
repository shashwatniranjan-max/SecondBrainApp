import type {
  AddKnowledgeInput,
  BrainAnswer,
  KnowledgeItem,
  KnowledgeService,
} from "@/types/knowledge";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const knowledge: KnowledgeItem[] = [
  {
    id: "designing-data-intensive-applications",
    title: "Designing Data-Intensive Applications",
    description:
      "Notes on reliability, scalability, data models, replication, and distributed system trade-offs.",
    type: "PDF",
    tags: ["Distributed Systems", "Databases"],
    dateAdded: "Sep 29, 2026",
    source: "designing-data-intensive-applications.pdf",
    readingTime: 18,
    progress: 72,
    accent: "blue",
    content: [
      "Reliable systems continue to work correctly even when hardware, software, or humans fail. The goal is not to prevent every fault, but to design systems that tolerate expected failures without interrupting the user experience.",
      "Scalability describes a system's ability to cope with increased load. It is most useful when load is expressed through concrete parameters—requests per second, read-to-write ratio, active users, or dataset size—rather than as a vague property.",
      "In distributed systems, consistency, availability, and partition tolerance create unavoidable trade-offs. The right architecture depends on which guarantees matter most for the product and which failure modes the team can safely accept.",
    ],
    keyIdeas: [
      "Design for faults, not just ideal operation",
      "Describe load with measurable parameters",
      "Choose consistency guarantees from product needs",
    ],
  },
  {
    id: "spaced-repetition",
    title: "How Spaced Repetition Changes Learning",
    description:
      "A practical review of retrieval practice, memory curves, and scheduling durable learning.",
    type: "Article",
    tags: ["Learning", "Memory"],
    dateAdded: "Sep 27, 2026",
    source: "nesslabs.com/spaced-repetition",
    readingTime: 7,
    progress: 45,
    accent: "lavender",
    content: [
      "Spaced repetition strengthens memory by revisiting material near the point of forgetting.",
      "Active recall is more durable than passive rereading because it forces the brain to reconstruct an idea.",
      "A useful review system adapts intervals based on confidence instead of treating every note equally.",
    ],
    keyIdeas: [
      "Review near the point of forgetting",
      "Prefer active recall",
      "Adapt intervals to confidence",
    ],
  },
  {
    id: "postgres-indexing",
    title: "Postgres Indexing Patterns",
    description:
      "Working notes on B-tree, GIN, partial indexes, query plans, and common performance traps.",
    type: "Note",
    tags: ["Postgres", "Performance"],
    dateAdded: "Sep 25, 2026",
    source: "Personal note",
    readingTime: 5,
    progress: 100,
    accent: "mint",
    content: [
      "Indexes speed reads by maintaining additional structures, but every index adds write and storage cost.",
      "Partial indexes are powerful when a frequently queried subset is much smaller than the full table.",
      "Use EXPLAIN ANALYZE to validate assumptions against real execution rather than optimizing from intuition.",
    ],
    keyIdeas: [
      "Every index has a write cost",
      "Partial indexes target hot subsets",
      "Measure with real query plans",
    ],
  },
  {
    id: "system-design-primer",
    title: "System Design Primer",
    description:
      "Reference covering load balancing, caching, queues, sharding, and practical architecture patterns.",
    type: "URL",
    tags: ["Architecture", "Distributed Systems"],
    dateAdded: "Sep 22, 2026",
    source: "github.com/donnemartin/system-design-primer",
    readingTime: 24,
    progress: 31,
    accent: "blue",
    content: [
      "Good system design starts with requirements, constraints, and rough capacity estimates.",
      "Caching reduces latency and backend load but introduces invalidation and consistency decisions.",
      "Queues decouple producers from consumers and help systems absorb bursts without dropping work.",
    ],
    keyIdeas: [
      "Start from explicit constraints",
      "Caching shifts consistency trade-offs",
      "Queues absorb uneven demand",
    ],
  },
  {
    id: "product-discovery",
    title: "Continuous Product Discovery",
    description:
      "Highlights on opportunity mapping, weekly interviews, assumptions, and rapid experiments.",
    type: "PDF",
    tags: ["Product", "Research"],
    dateAdded: "Sep 18, 2026",
    source: "continuous-discovery-habits.pdf",
    readingTime: 14,
    progress: 63,
    accent: "lavender",
    content: [
      "Continuous discovery connects small research activities to weekly product decisions.",
      "Opportunity solution trees make assumptions visible and prevent teams from committing too early.",
      "Frequent customer conversations reduce the distance between evidence and execution.",
    ],
    keyIdeas: [
      "Discover every week",
      "Map opportunities before solutions",
      "Test assumptions cheaply",
    ],
  },
  {
    id: "writing-clearer-notes",
    title: "Writing Notes That Compound",
    description:
      "A personal framework for atomic notes, durable phrasing, and linking ideas across topics.",
    type: "Note",
    tags: ["Writing", "Knowledge"],
    dateAdded: "Sep 14, 2026",
    source: "Personal note",
    readingTime: 4,
    progress: 88,
    accent: "mint",
    content: [
      "A useful note should make sense without the context in which it was captured.",
      "Atomic notes isolate one idea so it can be linked and reused in many future contexts.",
      "Writing in your own words exposes gaps that highlighting alone can hide.",
    ],
    keyIdeas: [
      "Make notes context-independent",
      "Keep ideas atomic",
      "Rewrite to test understanding",
    ],
  },
];

const related = ["designing-data-intensive-applications", "system-design-primer"];

export const knowledgeService: KnowledgeService = {
  async getKnowledge() {
    await wait(360);
    return [...knowledge];
  },
  async getKnowledgeById(id) {
    await wait(280);
    return knowledge.find((item) => item.id === id) ?? null;
  },
  async searchKnowledge(query) {
    await wait(220);
    const value = query.trim().toLowerCase();
    if (!value) return [...knowledge];
    return knowledge.filter((item) =>
      [item.title, item.description, item.type, ...item.tags].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  },
  async addKnowledge(data: AddKnowledgeInput) {
    await wait(1600);
    return {
      id: `mock-${Date.now()}`,
      title: data.title,
      description: data.description || "New knowledge ready to explore.",
      tags: data.tags,
      type: data.mode === "url" ? "URL" : data.mode === "upload" ? "PDF" : "Note",
      dateAdded: "Today",
      source:
        data.mode === "url"
          ? data.content
          : data.mode === "upload"
            ? "Uploaded document"
            : "Pasted text",
      readingTime: 6,
      progress: 0,
      accent: "mint",
      content: [data.content || "Your new knowledge has been processed."],
      keyIdeas: ["Ready for review", "Available in your knowledge library"],
    };
  },
  async askBrain(question) {
    await wait(1100);
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
