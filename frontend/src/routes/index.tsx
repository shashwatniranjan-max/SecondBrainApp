import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Clock3,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  NotebookPen,
  Plus,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/second-brain/app-shell";
import {
  ContinueCard,
  KnowledgeCard,
  SectionHeading,
} from "@/components/second-brain/knowledge-ui";
import { ErrorState, LoadingState } from "@/components/second-brain/states";
import { Button } from "@/components/ui/button";
import { knowledgeService } from "@/services/knowledge-service";
import { useServiceQuery } from "@/hooks/use-service-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function getTimeAgo(dateInput?: string | Date): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Virtual Brain" },
      { name: "description", content: "Your personal knowledge workspace and learning dashboard." },
      { property: "og:title", content: "Dashboard — Virtual Brain" },
      {
        property: "og:description",
        content: "Your personal knowledge workspace and learning dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const query = useServiceQuery(() => knowledgeService.getKnowledge(), []);
  const askHistoryQuery = useServiceQuery(() => knowledgeService.getAskHistory(), []);
  const { user } = useAuth();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <AppShell title="Dashboard" eyebrow="Overview">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">{dateLabel}</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {firstName}.
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Your ideas are getting clearer. Pick up where you left off or add something new.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/add">
              <Plus />
              Add Knowledge
            </Link>
          </Button>
          <Button asChild>
            <Link to="/ask">
              <BrainCircuit />
              Ask My Brain
            </Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Knowledge items",
            value: query.data ? query.data.length.toString() : "0",
            change: "Total saved",
            icon: BookOpen,
            tone: "bg-primary-soft text-primary",
          },
          {
            label: "Notes",
            value: query.data ? query.data.filter((i) => i.type === "Note").length.toString() : "0",
            change: "Written notes",
            icon: NotebookPen,
            tone: "bg-mint text-mint-foreground",
          },
          {
            label: "Documents",
            value: query.data ? query.data.filter((i) => i.type === "PDF").length.toString() : "0",
            change: "Uploaded PDFs",
            icon: FileText,
            tone: "bg-lavender text-lavender-foreground",
          },
          {
            label: "Questions asked",
            value: askHistoryQuery.data ? askHistoryQuery.data.length.toString() : "0",
            change: "Ask My Brain history",
            icon: BrainCircuit,
            tone: "bg-warm text-warm-foreground",
          },
        ].map(({ label, value, change, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
              <div className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="size-5" />
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5 text-mint-foreground" />
              {change}
            </p>
          </div>
        ))}
      </section>
      {query.status === "loading" ? (
        <LoadingState />
      ) : query.status === "error" ? (
        <div className="mt-8">
          <ErrorState retry={query.retry} />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <section>
            <SectionHeading
              title="Recent knowledge"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/knowledge">
                    View all <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <div className="columns-1 gap-4 md:columns-2">
              {query.data.slice(0, 4).map((item) => (
                <div key={item.id} className="break-inside-avoid mb-4">
                  <KnowledgeCard item={item} compact />
                </div>
              ))}
            </div>
          </section>
          <div className="space-y-8">
            <section>
              <SectionHeading title="Continue learning" />
              <div className="space-y-3">
                {query.data.slice(0, 2).map((item) => (
                  <ContinueCard key={item.id} item={item} />
                ))}
              </div>
            </section>
            <section>
              <SectionHeading
                title="Recently asked"
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/ask">Open chat</Link>
                  </Button>
                }
              />
              <div className="rounded-lg border bg-card shadow-card divide-y overflow-hidden">
                {askHistoryQuery.status === "loading" ? (
                  <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Loading questions...</span>
                  </div>
                ) : !askHistoryQuery.data || askHistoryQuery.data.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="mx-auto grid size-10 place-items-center rounded-full bg-primary-soft text-primary mb-3">
                      <MessageSquare className="size-5" />
                    </div>
                    <p className="text-sm font-medium">No questions asked yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ask your brain questions grounded in your notes and saved resources.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link to="/ask">
                        <BrainCircuit className="size-3.5 mr-1.5" />
                        Ask your first question
                      </Link>
                    </Button>
                  </div>
                ) : (
                  askHistoryQuery.data.slice(0, 4).map((item, idx) => {
                    const sourceCount = item.sources?.length || 0;
                    const sourceText =
                      sourceCount === 0
                        ? "General knowledge"
                        : `${sourceCount} source${sourceCount > 1 ? "s" : ""}`;
                    const timeAgo = getTimeAgo(item.createdAt);

                    return (
                      <Link
                        key={item.id || idx}
                        to="/ask"
                        search={{ q: item.question }}
                        className="flex gap-3 p-4 transition-colors hover:bg-muted/30 group"
                      >
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
                            idx % 2 === 0
                              ? "bg-primary-soft text-primary group-hover:bg-primary/20"
                              : "bg-lavender text-lavender-foreground group-hover:bg-lavender/80"
                          )}
                        >
                          {idx % 2 === 0 ? (
                            <BrainCircuit className="size-4" />
                          ) : (
                            <MessageSquare className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {item.question}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {sourceText} · {timeAgo}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
