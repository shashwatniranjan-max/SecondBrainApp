import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/second-brain/app-shell";
import {
  KnowledgeCard,
  KnowledgeTypeIcon,
  SectionHeading,
  Tag,
} from "@/components/second-brain/knowledge-ui";
import { ErrorState, LoadingState } from "@/components/second-brain/states";
import { Button } from "@/components/ui/button";
import { knowledgeService } from "@/services/knowledge-service";
import { useServiceQuery } from "@/hooks/use-service-query";

export const Route = createFileRoute("/knowledge/$knowledgeId")({
  head: () => ({
    meta: [
      { title: "Knowledge Detail — Second Brain" },
      { name: "description", content: "Review saved knowledge, key ideas, and related material." },
      { property: "og:title", content: "Knowledge Detail — Second Brain" },
      {
        property: "og:description",
        content: "Review saved knowledge, key ideas, and related material.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgeDetailPage,
});

function KnowledgeDetailPage() {
  const { knowledgeId } = Route.useParams();
  const navigate = useNavigate();
  const itemQuery = useServiceQuery(
    () => knowledgeService.getKnowledgeById(knowledgeId),
    [knowledgeId],
  );
  const relatedQuery = useServiceQuery(() => knowledgeService.getKnowledge(), []);
  return (
    <AppShell title="Knowledge detail" eyebrow="Library">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link to="/knowledge">
          <ArrowLeft />
          Back to library
        </Link>
      </Button>
      {itemQuery.status === "loading" ? (
        <LoadingState />
      ) : itemQuery.status === "error" ? (
        <ErrorState retry={itemQuery.retry} />
      ) : !itemQuery.data ? (
        <div className="rounded-lg border p-10 text-center">
          <h2 className="font-bold">Knowledge not found</h2>
          <Button asChild className="mt-4">
            <Link to="/knowledge">Return to library</Link>
          </Button>
        </div>
      ) : (
        <>
          <article className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <header className="border-b pb-8">
                <div className="flex items-start gap-4">
                  <KnowledgeTypeIcon item={itemQuery.data} className="size-12" />
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Tag>{itemQuery.data.type}</Tag>
                      {itemQuery.data.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                    <h2 className="max-w-4xl text-3xl font-bold leading-tight md:text-4xl">
                      {itemQuery.data.title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                      {itemQuery.data.description}
                    </p>
                  </div>
                </div>
              </header>
              <div className="py-8">
                <h3 className="mb-6 text-xl font-bold">Notes & highlights</h3>
                <div className="space-y-6">
                  {itemQuery.data.content.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="max-w-3xl text-[15px] leading-8 text-foreground/85"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-8 rounded-lg border-l-4 border-primary bg-primary-soft p-5">
                  <p className="text-sm font-semibold text-primary">Core idea</p>
                  <p className="mt-2 leading-7">
                    Strong systems come from making trade-offs visible, measuring real load, and
                    planning for failure before it happens.
                  </p>
                </div>
              </div>
            </div>
            <aside className="space-y-5">
              <Button asChild className="h-11 w-full">
                <Link to="/ask">
                  <BrainCircuit />
                  Ask about this
                </Link>
              </Button>
              <div className="rounded-lg border bg-card p-5 shadow-card">
                <h3 className="mb-4 text-sm font-bold">Details</h3>
                <dl className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Date added</dt>
                      <dd className="mt-0.5 font-medium">{itemQuery.data.dateAdded}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock3 className="size-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Reading time</dt>
                      <dd className="mt-0.5 font-medium">{itemQuery.data.readingTime} minutes</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ExternalLink className="size-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Source</dt>
                      <dd className="mt-0.5 truncate font-medium">{itemQuery.data.source}</dd>
                    </div>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border bg-card p-5 shadow-card">
                <h3 className="mb-4 text-sm font-bold">Key ideas</h3>
                <div className="space-y-3">
                  {itemQuery.data.keyIdeas.map((idea) => (
                    <div key={idea} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint-foreground" />
                      <span>{idea}</span>
                    </div>
                  ))}
                </div>
              </div>
              {itemQuery.data.type === "PDF" && itemQuery.data.sourceUrl && (
                <Button
                  className="w-full h-11"
                  variant="outline"
                  onClick={async () => {
                    if (!itemQuery.data || !itemQuery.data.sourceUrl) return;
                    const sourceUrl = itemQuery.data.sourceUrl;
                    const newWindow = window.open("", "_blank");
                    if (!newWindow) return;
                    try {
                      const token = localStorage.getItem("token");
                      const res = await fetch(`http://localhost:5000${sourceUrl}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!res.ok) throw new Error("Failed to load PDF");
                      const json = await res.json();
                      newWindow.location.href = json.data.url;
                    } catch (err) {
                      console.error(err);
                      newWindow.close();
                    }
                  }}
                >
                  Open PDF
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full h-11"
                onClick={async () => {
                  try {
                    if (itemQuery.data) {
                      await knowledgeService.deleteKnowledge(itemQuery.data.id);
                      navigate({ to: "/knowledge" });
                    }
                  } catch (err) {
                    console.error("Failed to delete", err);
                  }
                }}
              >
                Delete Knowledge
              </Button>
            </aside>
          </article>
          {relatedQuery.status === "success" && (
            <section className="mt-10 border-t pt-8">
              <SectionHeading title="Related knowledge" />
              <div className="grid gap-4 md:grid-cols-3">
                {relatedQuery.data
                  .filter((item) => item.id !== knowledgeId)
                  .slice(0, 3)
                  .map((item) => (
                    <KnowledgeCard key={item.id} item={item} compact />
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
