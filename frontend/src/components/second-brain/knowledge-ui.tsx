import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Clock3,
  FileText,
  Globe2,
  MoreHorizontal,
  NotebookPen,
  Search,
} from "lucide-react";
import type { BrainSource, KnowledgeItem, KnowledgeType } from "@/types/knowledge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const typeIcon: Record<KnowledgeType, typeof FileText> = {
  PDF: FileText,
  Article: BookOpen,
  Note: NotebookPen,
  URL: Globe2,
};
const accentStyle = {
  blue: "bg-primary-soft text-primary",
  lavender: "bg-lavender text-lavender-foreground",
  mint: "bg-mint text-mint-foreground",
} as const;

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-border/80 bg-muted/55 px-2.5 text-[11px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

export function KnowledgeTypeIcon({
  item,
  className,
}: {
  item: KnowledgeItem;
  className?: string;
}) {
  const Icon = typeIcon[item.type];
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg",
        accentStyle[item.accent],
        className,
      )}
    >
      <Icon className="size-5" />
    </div>
  );
}

import { UrlPreviewBanner } from "@/components/second-brain/url-embed";
import { parseUrl } from "@/lib/url-parser";

export function KnowledgeCard({
  item,
  compact = false,
}: {
  item: KnowledgeItem;
  compact?: boolean;
}) {
  const isUrl = item.type === "URL";
  const parsedUrl = isUrl ? parseUrl(item.sourceUrl || item.content[0] || "") : null;

  return (
    <Link
      to="/knowledge/$knowledgeId"
      params={{ knowledgeId: item.id }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover",
      )}
    >
      {isUrl && <UrlPreviewBanner url={item.sourceUrl || item.content[0] || ""} />}

      <div className={cn("flex gap-4", isUrl ? "flex-col flex-1" : "", compact ? "p-4" : "p-5")}>
        {!isUrl && <KnowledgeTypeIcon item={item} />}

        <div className="min-w-0 flex-1 flex flex-col h-full">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-card-foreground group-hover:text-primary">
                {item.title}
              </h3>
              <p
                className={cn(
                  "mt-1 text-sm leading-6 text-muted-foreground",
                  compact ? "line-clamp-1" : "line-clamp-2",
                )}
              >
                {item.description}
              </p>
            </div>
            {!isUrl && <MoreHorizontal className="size-4 shrink-0 text-muted-foreground/60" />}
          </div>
          <div className={cn("flex flex-wrap items-center gap-2", isUrl ? "mt-auto pt-4" : "mt-4")}>
            {isUrl && parsedUrl && (
              <span className="inline-flex h-6 items-center rounded-full border border-border/80 bg-muted/55 px-2.5 text-[11px] font-semibold text-muted-foreground capitalize">
                {parsedUrl.platform}
              </span>
            )}
            {item.tags.slice(0, isUrl ? 1 : 2).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{item.dateAdded}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SourceCard({ source, index }: { source: BrainSource; index: number }) {
  return (
    <Link
      to="/knowledge/$knowledgeId"
      params={{ knowledgeId: source.knowledgeId }}
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
          {index}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold group-hover:text-primary">{source.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {source.excerpt}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-primary">{source.relevance}% match</p>
        </div>
      </div>
    </Link>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search your knowledge...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search knowledge"
        className="h-10 bg-background pl-9 shadow-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ContinueCard({ item }: { item: KnowledgeItem }) {
  return (
    <Link
      to="/knowledge/$knowledgeId"
      params={{ knowledgeId: item.id }}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-card transition-colors hover:border-primary/25"
    >
      <KnowledgeTypeIcon item={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{item.progress}%</span>
        </div>
      </div>
      <Clock3 className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-base font-bold">{title}</h2>
      {action}
    </div>
  );
}

export function InlineButtonLink({
  to,
  children,
}: {
  to: "/knowledge" | "/ask";
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={to}>{children}</Link>
    </Button>
  );
}
