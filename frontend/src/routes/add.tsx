import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Link2, NotebookPen, Plus, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/second-brain/app-shell";
import { ProcessingState } from "@/components/second-brain/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { knowledgeService } from "@/services/knowledge-service";
import type { AddKnowledgeInput } from "@/types/knowledge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Add Knowledge — Second Brain" },
      { name: "description", content: "Add documents, notes, and links to your Second Brain." },
      { property: "og:title", content: "Add Knowledge — Second Brain" },
      {
        property: "og:description",
        content: "Add documents, notes, and links to your Second Brain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddKnowledgePage,
});

type Mode = AddKnowledgeInput["mode"];
const modes = [
  {
    id: "upload" as const,
    label: "Upload document",
    detail: "PDF, DOCX, or TXT",
    icon: UploadCloud,
  },
  { id: "text" as const, label: "Paste text", detail: "Notes or excerpts", icon: NotebookPen },
  { id: "url" as const, label: "Add URL", detail: "Article or webpage", icon: Link2 },
];

function AddKnowledgePage() {
  const [mode, setMode] = useState<Mode>("upload");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>(["Learning"]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (status !== "processing") return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + 8, 94)), 120);
    return () => window.clearInterval(timer);
  }, [status]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || (mode !== "upload" && !content.trim()) || (mode === "upload" && !fileName))
      return;
    setStatus("processing");
    setProgress(12);
    try {
      await knowledgeService.addKnowledge({
        title,
        description,
        tags,
        mode,
        content: mode === "upload" ? fileName : content,
        ...(fileObj ? { file: fileObj } : {}),
      });
      setProgress(100);
      window.setTimeout(() => setStatus("success"), 280);
    } catch {
      setStatus("error");
    }
  };
  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput("");
  };
  if (status === "success")
    return (
      <AppShell title="Add Knowledge" eyebrow="Library">
        <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-mint text-mint-foreground">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Knowledge added</h2>
          <p className="mt-3 text-muted-foreground">
            “{title}” is processed and ready to search, review, or ask questions about.
          </p>
          <div className="mt-7 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStatus("idle");
                setProgress(0);
                setTitle("");
                setDescription("");
                setContent("");
                setFileName("");
                setFileObj(null);
              }}
            >
              Add another
            </Button>
            <Button asChild>
              <Link to="/knowledge">View library</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  return (
    <AppShell title="Add Knowledge" eyebrow="Library">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <h2 className="text-3xl font-bold">Grow your second brain</h2>
          <p className="mt-2 text-muted-foreground">
            Add something worth remembering. We’ll make it searchable and connected.
          </p>
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {modes.map(({ id, label, detail, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              onClick={() => {
                setMode(id);
                setContent("");
              }}
              className={cn(
                "h-auto justify-start p-4 text-left shadow-none",
                mode === id && "border-primary bg-primary-soft text-primary",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-md",
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {detail}
                </span>
              </span>
            </Button>
          ))}
        </div>
        <form onSubmit={submit} className="rounded-lg border bg-card p-5 shadow-card md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give this knowledge a clear title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A short summary (optional)"
              />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => setTags(tags.filter((value) => value !== tag))}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="tags"
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag..."
              />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor={mode === "text" ? "main-content" : undefined}>Main content</Label>
            {mode === "upload" ? (
              <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft/50">
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setFileName(file.name);
                      setFileObj(file);
                      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                />
                {fileName ? (
                  <>
                    <FileText className="size-9 text-primary" />
                    <p className="mt-4 font-semibold">{fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ready to process · Click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center rounded-lg bg-background shadow-sm">
                      <UploadCloud className="size-6 text-primary" />
                    </span>
                    <p className="mt-4 font-semibold">Drop a document here, or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, DOCX, TXT · Up to 20MB
                    </p>
                  </>
                )}
              </label>
            ) : mode === "text" ? (
              <Textarea
                id="main-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-56 resize-none"
                placeholder="Paste your notes, highlights, or any text worth remembering..."
                required
              />
            ) : (
              <div className="rounded-lg border bg-muted/25 p-5">
                <Label htmlFor="url">Article or webpage URL</Label>
                <div className="relative mt-2">
                  <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="url"
                    type="url"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="h-11 bg-background pl-9"
                    placeholder="https://example.com/article"
                    required
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  We’ll extract the readable content and preserve the original source.
                </p>
              </div>
            )}
          </div>
          {status === "processing" ? (
            <div className="mt-6">
              <ProcessingState progress={progress} />
            </div>
          ) : (
            <div className="mt-7 flex items-center justify-between gap-4 border-t pt-6">
              <p className="text-xs text-muted-foreground">
                You can edit details later from your library.
              </p>
              <Button type="submit" className="h-10">
                <Plus />
                Add Knowledge
              </Button>
            </div>
          )}
          {status === "error" && (
            <p className="mt-4 text-sm font-medium text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}
