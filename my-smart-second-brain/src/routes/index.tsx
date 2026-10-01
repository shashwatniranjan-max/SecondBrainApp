import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Clock3,
  FileText,
  Link2,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Second Brain" },
      { name: "description", content: "Your personal knowledge workspace and learning dashboard." },
      { property: "og:title", content: "Dashboard — Second Brain" },
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

const statCards = [
  {
    label: "Knowledge items",
    value: "128",
    change: "+12 this month",
    icon: BookOpen,
    tone: "bg-primary-soft text-primary",
  },
  {
    label: "Notes",
    value: "54",
    change: "42% of library",
    icon: NotebookPen,
    tone: "bg-mint text-mint-foreground",
  },
  {
    label: "Documents",
    value: "37",
    change: "8 hrs to review",
    icon: FileText,
    tone: "bg-lavender text-lavender-foreground",
  },
  {
    label: "Questions asked",
    value: "86",
    change: "+18 this week",
    icon: BrainCircuit,
    tone: "bg-warm text-warm-foreground",
  },
];

function DashboardPage() {
  const query = useServiceQuery(() => knowledgeService.getKnowledge(), []);
  return (
    <AppShell title="Dashboard" eyebrow="Overview">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Thursday, October 1</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Good evening, Shashwat.</h2>
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
        {statCards.map(({ label, value, change, icon: Icon, tone }) => (
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
            <div className="grid gap-4 md:grid-cols-2">
              {query.data.slice(0, 4).map((item) => (
                <KnowledgeCard key={item.id} item={item} compact />
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
              <div className="rounded-lg border bg-card shadow-card">
                <Link
                  to="/ask"
                  className="flex gap-3 border-b p-4 transition-colors hover:bg-muted/30"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                    <BrainCircuit className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      What did I learn about distributed systems?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">2 sources · 2 days ago</p>
                  </div>
                </Link>
                <Link to="/ask" className="flex gap-3 p-4 transition-colors hover:bg-muted/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-lavender text-lavender-foreground">
                    <Link2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Connect my notes on learning and memory</p>
                    <p className="mt-1 text-xs text-muted-foreground">3 sources · 5 days ago</p>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
