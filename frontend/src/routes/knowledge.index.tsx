import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/second-brain/app-shell";
import { KnowledgeCard, SearchField } from "@/components/second-brain/knowledge-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/second-brain/states";
import { knowledgeService } from "@/services/knowledge-service";
import type { KnowledgeItem, KnowledgeType } from "@/types/knowledge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/knowledge/")({
  head: () => ({
    meta: [
      { title: "Knowledge Library — Second Brain" },
      {
        name: "description",
        content: "Search and organize everything saved in your Second Brain.",
      },
      { property: "og:title", content: "Knowledge Library — Second Brain" },
      {
        property: "og:description",
        content: "Search and organize everything saved in your Second Brain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

const filters = ["All", "Notes", "PDFs", "Articles", "URLs"] as const;
type Filter = (typeof filters)[number];
const typeForFilter: Partial<Record<Filter, KnowledgeType>> = {
  Notes: "Note",
  PDFs: "PDF",
  Articles: "Article",
  URLs: "URL",
};

function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState("newest");
  useEffect(() => {
    let active = true;
    setItems(null);
    setError(false);
    const request = query.trim()
      ? knowledgeService.searchKnowledge(query)
      : knowledgeService.getKnowledge();
    request.then((data) => active && setItems(data)).catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [query]);
  
  const filtered = useMemo(() => {
    if (!items) return [];
    const target = typeForFilter[filter];
    return [...items]
      .filter((item) => !target || item.type === target)
      .sort((a, b) =>
        sort === "title" ? a.title.localeCompare(b.title) : b.dateAdded.localeCompare(a.dateAdded),
      );
  }, [items, filter, sort]);
  return (
    <AppShell
      title="Knowledge"
      eyebrow="Library"
      actions={
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/add">
            <Plus />
            Add Knowledge
          </Link>
        </Button>
      }
    >
      <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold">Your knowledge library</h2>
          <p className="mt-2 text-muted-foreground">
            Everything you’ve saved, ready to search and connect.
          </p>
        </div>
        {items && (
          <p className="text-sm font-medium text-muted-foreground">
            {filtered.length} of {items.length} items
          </p>
        )}
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <SearchField value={query} onChange={setQuery} />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {filters.map((value) => (
          <Button
            key={value}
            variant="ghost"
            onClick={() => setFilter(value)}
            className={`h-10 shrink-0 rounded-none border-b-2 px-4 ${filter === value ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {value}
          </Button>
        ))}
      </div>
      {error ? (
        <ErrorState retry={() => setQuery("")} />
      ) : items === null ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching knowledge"
          description="Try a different search or filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {filtered.map((item) => (
            <div key={item.id} className="break-inside-avoid mb-4">
              <KnowledgeCard item={item} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
