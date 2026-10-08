import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, FileText, Link2, NotebookPen, Search, X } from "lucide-react";
import { knowledgeService } from "@/services/knowledge-service";
import type { KnowledgeItem } from "@/types/knowledge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const navigate = useNavigate();

  // Load all knowledge items when the dialog opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    knowledgeService
      .getKnowledge()
      .then(setItems)
      .catch(() => setItems([]));
  }, [open]);

  // Filter items based on the search query
  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const iconForType = (type: string) => {
    switch (type) {
      case "Note":
        return NotebookPen;
      case "PDF":
        return FileText;
      case "URL":
        return Link2;
      default:
        return BookOpen;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close search"
      />
      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-xl">
        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your knowledge..."
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? "No results found." : "No knowledge items yet."}
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = iconForType(item.type);
              return (
                <button
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                  onClick={() => {
                    navigate({ to: "/knowledge/$knowledgeId", params: { knowledgeId: item.id } });
                    onClose();
                  }}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.type} · {new Date(item.dateAdded).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {/* Footer hint */}
        <div className="border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              Esc
            </kbd>{" "}
            to close
          </p>
        </div>
      </div>
    </div>
  );
}
