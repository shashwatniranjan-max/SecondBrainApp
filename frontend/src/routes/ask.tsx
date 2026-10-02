import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUp, BookOpen, BrainCircuit, Copy, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/second-brain/app-shell";
import { SourceCard, Tag } from "@/components/second-brain/knowledge-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { knowledgeService } from "@/services/knowledge-service";
import type { BrainAnswer } from "@/types/knowledge";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask My Brain — Second Brain" },
      {
        name: "description",
        content: "Ask questions grounded in your personal knowledge library.",
      },
      { property: "og:title", content: "Ask My Brain — Second Brain" },
      {
        property: "og:description",
        content: "Ask questions grounded in your personal knowledge library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskPage,
});

type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; answer: BrainAnswer };
const initialQuestion = "What did I learn about distributed systems?";
const initialAnswer: BrainAnswer = {
  id: "initial-answer",
  question: initialQuestion,
  answer:
    "Your notes describe distributed systems as a set of deliberate trade-offs rather than a fixed recipe. Reliability means expecting partial failures and building recovery paths. Scalability starts with measurable load parameters, while tools like replication, caching, and queues improve resilience—but add consistency and operational complexity. [1] [2]",
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
  relatedKnowledgeIds: ["designing-data-intensive-applications", "system-design-primer"],
  suggestedQuestions: [
    "How do queues improve system reliability?",
    "Compare strong and eventual consistency",
    "What should I review next?",
  ],
};
const opening: Message[] = [
  { id: "initial-question", role: "user", content: initialQuestion },
  { id: "initial-response", role: "assistant", answer: initialAnswer },
];

export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-lg bg-chat-user px-4 py-3 text-sm leading-6 text-chat-user-foreground shadow-sm">
        {children}
      </div>
    </div>
  );
}
function AIMessage({ answer }: { answer: BrainAnswer }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
        <BrainCircuit className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="prose-brain max-w-3xl text-[15px] leading-7 text-foreground/90">
          {answer.answer}
        </div>
        <div className="mt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Sources
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {answer.sources.map((source, index) => (
              <SourceCard key={source.knowledgeId} source={source} index={index + 1} />
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Copy answer">
            <Copy />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Regenerate answer">
            <RotateCcw />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AskPage() {
  const [messages, setMessages] = useState<Message[]>(opening);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "thinking" | "error">("ready");
  const endRef = useRef<HTMLDivElement>(null);
  const latestAnswer = [...messages]
    .reverse()
    .find(
      (message): message is Extract<Message, { role: "assistant" }> => message.role === "assistant",
    )?.answer;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);
  const ask = async (question = input) => {
    const clean = question.trim();
    if (!clean || status === "thinking") return;
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: clean },
    ]);
    setStatus("thinking");
    try {
      const answer = await knowledgeService.askBrain(clean);
      setMessages((current) => [...current, { id: answer.id, role: "assistant", answer }]);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };
  return (
    <AppShell title="Ask My Brain" eyebrow="Knowledge assistant">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-[calc(100vh-136px)] flex-col rounded-lg border bg-card shadow-card">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <BrainCircuit className="size-5" />
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-mint-strong" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Knowledge assistant</h2>
                <p className="text-xs text-muted-foreground">Grounded in 128 saved items</p>
              </div>
            </div>
            <Tag>Private workspace</Tag>
          </header>
          <div className="flex-1 space-y-8 overflow-y-auto p-5 md:p-7">
            {messages.map((message) =>
              message.role === "user" ? (
                <UserMessage key={message.id}>{message.content}</UserMessage>
              ) : (
                <AIMessage key={message.id} answer={message.answer} />
              ),
            )}
            {status === "thinking" && (
              <div className="flex gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <BrainCircuit className="size-4" />
                </div>
                <div className="flex items-center gap-1 py-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Connecting your ideas...
                  </span>
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">
                I couldn’t answer that. Please try again.
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t bg-background p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void ask();
              }}
              className="rounded-lg border bg-card p-2 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"
            >
              <Textarea
                aria-label="Ask your knowledge"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask();
                  }
                }}
                className="min-h-20 resize-none border-0 px-2 shadow-none focus-visible:ring-0"
                placeholder="Ask anything about your knowledge..."
              />
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-[11px] text-muted-foreground">Answers cite your saved sources</p>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || status === "thinking"}
                  aria-label="Send question"
                >
                  <ArrowUp />
                </Button>
              </div>
            </form>
          </div>
        </section>
        <aside className="space-y-6">
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Try asking
            </p>
            <div className="space-y-2">
              {latestAnswer?.suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  onClick={() => void ask(question)}
                  className="h-auto w-full justify-start whitespace-normal p-3 text-left text-xs leading-5 shadow-none"
                >
                  {question}
                </Button>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h3 className="text-sm font-bold">Related knowledge</h3>
            </div>
            <div className="space-y-3">
              <Link
                to="/knowledge/$knowledgeId"
                params={{ knowledgeId: "designing-data-intensive-applications" }}
                className="block border-b pb-3 text-sm font-semibold hover:text-primary"
              >
                Designing Data-Intensive Applications
                <p className="mt-1 text-xs font-normal text-muted-foreground">PDF · 18 min read</p>
              </Link>
              <Link
                to="/knowledge/$knowledgeId"
                params={{ knowledgeId: "system-design-primer" }}
                className="block text-sm font-semibold hover:text-primary"
              >
                System Design Primer
                <p className="mt-1 text-xs font-normal text-muted-foreground">URL · 24 min read</p>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
