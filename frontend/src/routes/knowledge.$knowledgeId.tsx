import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Maximize,
  Minimize,
  Settings2,
  Check
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
import { useState, useEffect } from "react";
import { useServiceQuery } from "@/hooks/use-service-query";
import { UrlEmbed } from "@/components/second-brain/url-embed";
import { DocumentRenderer } from "@/components/second-brain/document-renderer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function useFocusPreferences() {
  const [focusBg, setFocusBg] = useState<"light" | "sepia" | "dark">(() => {
    return (localStorage.getItem("focusBg") as any) || "dark";
  });
  const [focusFont, setFocusFont] = useState<"sans" | "serif">(() => {
    return (localStorage.getItem("focusFont") as any) || "sans";
  });
  const [focusFontSize, setFocusFontSize] = useState<number>(() => {
    return Number(localStorage.getItem("focusFontSize")) || 18;
  });

  useEffect(() => {
    localStorage.setItem("focusBg", focusBg);
  }, [focusBg]);
  useEffect(() => {
    localStorage.setItem("focusFont", focusFont);
  }, [focusFont]);
  useEffect(() => {
    localStorage.setItem("focusFontSize", focusFontSize.toString());
  }, [focusFontSize]);

  return { focusBg, setFocusBg, focusFont, setFocusFont, focusFontSize, setFocusFontSize };
}

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

function PdfFocusViewer({ sourceUrl, onExit }: { sourceUrl: string; onExit: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUrl() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${(import.meta.env['VITE_API_URL']?.replace(/\/$/, "") || "http://localhost:5000")}${sourceUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load PDF");
        const json = await res.json();
        setUrl(json.data.url);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchUrl();
  }, [sourceUrl]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200">
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#121212]">
        <Button variant="ghost" onClick={onExit} className="hover:bg-white/10 hover:text-white transition-colors">
          <ArrowLeft className="size-4 mr-2" /> Exit Focus
        </Button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Open externally <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0 relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-zinc-500 font-medium">Loading PDF viewer...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span className="text-red-400 font-medium">Failed to load PDF</span>
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 hover:text-white" onClick={onExit}>Return to details</Button>
          </div>
        )}
        {url && (
          <iframe src={url} className="w-full h-full border-0" title="PDF Viewer" />
        )}
      </div>
    </div>
  );
}

function KnowledgeDetailPage() {
  const { knowledgeId } = Route.useParams();
  const navigate = useNavigate();
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode]);

  const itemQuery = useServiceQuery(
    () => knowledgeService.getKnowledgeById(knowledgeId),
    [knowledgeId],
  );
  const relatedQuery = useServiceQuery(() => knowledgeService.getKnowledge(), []);
  const prefs = useFocusPreferences();

  if (focusMode && itemQuery.data) {
    if (itemQuery.data.type === "PDF" && itemQuery.data.sourceUrl) {
      return <PdfFocusViewer sourceUrl={itemQuery.data.sourceUrl} onExit={() => setFocusMode(false)} />;
    }
    const bgStyles = {
      light: "bg-[#fcfcfc] text-[#333333]",
      sepia: "bg-[#f4ecd8] text-[#4a3c31]",
      dark: "bg-[#1f2022] text-[#c9c9c9]",
    }[prefs.focusBg];

    const linkStyles = {
      light: "text-[#555555] hover:text-[#000000]",
      sepia: "text-[#7a6a58] hover:text-[#3e2f23]",
      dark: "text-[#999999] hover:text-[#ffffff]",
    }[prefs.focusBg];

    const fontClass = prefs.focusFont === "serif" ? "font-serif" : "font-sans";

    return (
      <div className={cn("min-h-screen flex justify-center py-12 px-6 sm:px-10 transition-colors duration-300", bgStyles, fontClass)}>
        <div className="w-full max-w-[850px]">
          <div className="flex items-center justify-between mb-10">
            <Button variant="ghost" className="hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setFocusMode(false)}>
              <Minimize className="size-4 mr-2" /> Exit Focus
            </Button>
            
            <div className="flex items-center gap-4">
              {itemQuery.data.sourceUrl && (
                <a href={itemQuery.data.sourceUrl} target="_blank" rel="noopener noreferrer" className={cn("text-sm font-medium flex items-center gap-2 transition-colors", linkStyles)}>
                  Open original source <ExternalLink className="size-3" />
                </a>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-black/5 dark:hover:bg-white/5">
                    <Settings2 className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-5 space-y-6">
                  <h4 className="font-semibold text-sm mb-1">Display Options</h4>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Background</label>
                    <div className="flex gap-3">
                      <button onClick={() => prefs.setFocusBg('light')} className={cn("size-8 rounded-full border-2 bg-[#fcfcfc] flex items-center justify-center", prefs.focusBg === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border')} title="Light">{prefs.focusBg === 'light' && <Check className="size-4 text-black" />}</button>
                      <button onClick={() => prefs.setFocusBg('sepia')} className={cn("size-8 rounded-full border-2 bg-[#f4ecd8] flex items-center justify-center", prefs.focusBg === 'sepia' ? 'border-primary ring-2 ring-primary/20' : 'border-border')} title="Sepia">{prefs.focusBg === 'sepia' && <Check className="size-4 text-black" />}</button>
                      <button onClick={() => prefs.setFocusBg('dark')} className={cn("size-8 rounded-full border-2 bg-[#1f2022] flex items-center justify-center", prefs.focusBg === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border')} title="Dark">{prefs.focusBg === 'dark' && <Check className="size-4 text-white" />}</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Font</label>
                    <div className="flex gap-2">
                      <Button variant={prefs.focusFont === 'sans' ? 'default' : 'outline'} className="flex-1 font-sans" onClick={() => prefs.setFocusFont('sans')}>Sans</Button>
                      <Button variant={prefs.focusFont === 'serif' ? 'default' : 'outline'} className="flex-1 font-serif" onClick={() => prefs.setFocusFont('serif')}>Serif</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Size</label>
                    <div className="flex items-center justify-between border rounded-md p-1">
                      <Button variant="ghost" size="sm" onClick={() => prefs.setFocusFontSize(Math.max(14, prefs.focusFontSize - 1))}>A-</Button>
                      <span className="text-sm font-medium">{prefs.focusFontSize}</span>
                      <Button variant="ghost" size="sm" onClick={() => prefs.setFocusFontSize(Math.min(22, prefs.focusFontSize + 1))}>A+</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div style={{ fontSize: `${prefs.focusFontSize}px` }}>
            <h1 className="text-[2.2em] font-bold leading-tight mb-[0.6em]">{itemQuery.data.title}</h1>
            {itemQuery.data.description && <p className="text-[1.15em] opacity-80 leading-relaxed mb-[2em]">{itemQuery.data.description}</p>}
            
            {itemQuery.data.type === "URL" ? (
              <div className="my-[2em]">
                <UrlEmbed url={itemQuery.data.sourceUrl || itemQuery.data.content[0]} title={itemQuery.data.title} description={itemQuery.data.description} />
              </div>
            ) : (
              <DocumentRenderer content={itemQuery.data.content} readingTheme={prefs.focusBg} />
            )}
          </div>
        </div>
      </div>
    );
  }

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
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Tag>{itemQuery.data.type}</Tag>
                      {itemQuery.data.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => setFocusMode(true)}>
                        <Maximize className="size-4 mr-2" /> Focus Mode
                      </Button>
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
                  {itemQuery.data.type === "URL" ? (
                    <div className="my-6">
                      <UrlEmbed 
                        url={itemQuery.data.sourceUrl || itemQuery.data.content[0]} 
                        title={itemQuery.data.title} 
                        description={itemQuery.data.description} 
                      />
                    </div>
                  ) : (
                    <DocumentRenderer content={itemQuery.data.content} />
                  )}
                </div>
                <div className="mt-8 rounded-lg border-l-4 border-muted bg-muted/30 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-muted-foreground">Core idea</p>
                    <Button variant="outline" size="sm" className="h-7 text-xs opacity-60 pointer-events-none">
                      <BrainCircuit className="size-3 mr-1.5" />
                      Generate
                    </Button>
                  </div>
                  <p className="mt-1 leading-7 text-muted-foreground italic text-sm">
                    Core idea will be generated when AI analysis is available.
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
                      const res = await fetch(`${(import.meta.env['VITE_API_URL']?.replace(/\/$/, "") || "http://localhost:5000")}${sourceUrl}`, {
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
              <div className="columns-1 gap-4 md:columns-3">
                {relatedQuery.data
                  .filter((item) => item.id !== knowledgeId)
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="break-inside-avoid mb-4">
                      <KnowledgeCard item={item} compact />
                    </div>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
