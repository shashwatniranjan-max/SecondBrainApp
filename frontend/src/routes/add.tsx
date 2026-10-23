import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/second-brain/app-shell";
import { ProcessingState } from "@/components/second-brain/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { knowledgeService } from "@/services/knowledge-service";
import type { AddKnowledgeInput, ImageAnalysisData } from "@/types/knowledge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Add Knowledge — Virtual Brain" },
      { name: "description", content: "Add documents, images, notes, and links to your Virtual Brain." },
      { property: "og:title", content: "Add Knowledge — Virtual Brain" },
      {
        property: "og:description",
        content: "Add documents, images, notes, and links to your Virtual Brain.",
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
  {
    id: "image" as const,
    label: "Analyze image",
    detail: "Diagrams, notes & charts",
    icon: ImageIcon,
  },
  { id: "text" as const, label: "Paste text", detail: "Notes or excerpts", icon: NotebookPen },
  { id: "url" as const, label: "Add URL", detail: "Article or webpage", icon: Link2 },
  { id: "youtube" as const, label: "YouTube", detail: "Import transcript", icon: Youtube },
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

  // Image mode states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisData | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysisStep, setImageAnalysisStep] = useState("Analyzing image...");
  const [imageError, setImageError] = useState("");

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [youtubeTranscript, setYoutubeTranscript] = useState<{
    title: string;
    originalUrl: string;
    transcript: string[];
  } | null>(null);
  const [fetchingYoutube, setFetchingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");

  useEffect(() => {
    if (status !== "processing") return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + 8, 94)), 120);
    return () => window.clearInterval(timer);
  }, [status]);

  const handleImageSelect = (file: File) => {
    setImageError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageError("Image file size exceeds 15MB limit.");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setImageAnalysis(null);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageFile) return;
    setAnalyzingImage(true);
    setImageError("");
    setImageAnalysisStep("Uploading image...");

    const step1 = setTimeout(() => {
      setImageAnalysisStep("Analyzing visual elements...");
    }, 2500);

    const step2 = setTimeout(() => {
      setImageAnalysisStep("Extracting text, formulas, diagrams & concepts...");
    }, 8000);

    const step3 = setTimeout(() => {
      setImageAnalysisStep("Structuring extracted knowledge...");
    }, 16000);

    try {
      const data = await knowledgeService.analyzeImage(imageFile);
      setImageAnalysis(data);

      // Auto-populate title if empty or matches original filename
      if (!title || title === imageFile.name.replace(/\.[^/.]+$/, "")) {
        const suggestedTitle = data.summary.slice(0, 50).replace(/\.[^.]*$/, "");
        if (suggestedTitle) setTitle(suggestedTitle);
      }
      if (!description) {
        setDescription(data.summary);
      }
      if (data.keyConcepts && data.keyConcepts.length > 0) {
        const newTags = [...tags];
        for (const concept of data.keyConcepts.slice(0, 4)) {
          if (!newTags.includes(concept)) newTags.push(concept);
        }
        setTags(newTags);
      }
    } catch (err) {
      setImageError((err as Error).message || "Failed to analyze image. Please try again.");
    } finally {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      setAnalyzingImage(false);
    }
  };

  const handleFetchYoutube = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setFetchingYoutube(true);
    setYoutubeError("");
    try {
      const data = await knowledgeService.getYouTubeTranscript(trimmed);
      setYoutubeTranscript(data);
      if (!title || title === "YouTube Video") setTitle(data.title);
    } catch (err) {
      setYoutubeError((err as Error).message || "Failed to fetch transcript");
    } finally {
      setFetchingYoutube(false);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setTitle("");
    setDescription("");
    setContent("");
    setFileName("");
    setFileObj(null);
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setImageAnalysis(null);
    setImageError("");
    setYoutubeTranscript(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      (!title.trim() && mode !== "image") ||
      (mode === "text" && !content.trim()) ||
      (mode === "url" && !content.trim()) ||
      (mode === "upload" && !fileName) ||
      (mode === "youtube" && !youtubeTranscript) ||
      (mode === "image" && !imageFile && !content.trim())
    )
      return;

    setStatus("processing");
    setProgress(12);
    try {
      await knowledgeService.addKnowledge({
        title: title || (imageFile ? imageFile.name.replace(/\.[^/.]+$/, "") : "Image Knowledge"),
        description,
        tags,
        mode,
        content:
          mode === "upload"
            ? fileName
            : mode === "youtube" && youtubeTranscript
              ? youtubeTranscript.transcript.join("\n\n")
              : mode === "image" && imageAnalysis
                ? `## Summary\n${imageAnalysis.summary}\n\n## Extracted Text\n${imageAnalysis.extractedText}\n\n## Detailed Explanation\n${imageAnalysis.detailedExplanation}`
                : content,
        originalUrl:
          mode === "youtube" && youtubeTranscript ? youtubeTranscript.originalUrl : undefined,
        ...(mode === "upload" && fileObj ? { file: fileObj } : {}),
        ...(mode === "image" && imageFile ? { file: imageFile } : {}),
        ...(mode === "image" && imageAnalysis ? { imageMetadata: imageAnalysis } : {}),
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
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={handleReset}>
              Add another
            </Button>
            <Button asChild variant="outline">
              <Link to="/knowledge">View library</Link>
            </Button>
            <Button asChild>
              <Link to="/ask" search={{ q: `What are the key points in ${title}?` }}>
                <BrainCircuit className="size-4 mr-1.5" />
                Ask My Brain
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell title="Add Knowledge" eyebrow="Library">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <h2 className="text-3xl font-bold">Grow your virtual brain</h2>
          <p className="mt-2 text-muted-foreground">
            Add something worth remembering. We’ll make it searchable and connected.
          </p>
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modes.map(({ id, label, detail, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              onClick={() => {
                setMode(id);
                setContent("");
                setYoutubeTranscript(null);
                setYoutubeError("");
                setImageError("");
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
              <Label htmlFor="title">
                Title {mode === "image" && <span className="text-muted-foreground text-xs font-normal">(optional — auto-generated from image)</span>}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={mode === "image" ? "Optional title (or auto-generated from image)" : "Give this knowledge a clear title"}
                required={mode !== "image"}
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
            ) : mode === "image" ? (
              <div className="space-y-4">
                {!imageFile ? (
                  <label className="flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/30">
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleImageSelect(file);
                      }}
                    />
                    <span className="grid size-12 place-items-center rounded-lg bg-background shadow-sm text-primary mb-3">
                      <ImageIcon className="size-6" />
                    </span>
                    <p className="text-base font-semibold">Drop an image here, or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Diagrams, charts, handwritten notes, lecture slides, flowcharts
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground/80">
                      JPEG, PNG, WebP · Up to 15MB
                    </p>
                  </label>
                ) : (
                  <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative shrink-0 w-36 h-28 rounded-md border bg-black/5 dark:bg-black/30 overflow-hidden flex items-center justify-center p-1">
                        {imagePreviewUrl ? (
                          <img
                            src={imagePreviewUrl}
                            alt="Selected"
                            className="max-h-full max-w-full object-contain rounded"
                          />
                        ) : (
                          <ImageIcon className="size-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                        <p className="font-semibold text-sm truncate">{imageFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(imageFile.size / (1024 * 1024)).toFixed(2)} MB · {imageFile.type}
                        </p>
                        <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageSelect(f);
                              }}
                            />
                            <RefreshCw className="size-3" /> Replace image
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                              setImagePreviewUrl(null);
                              setImageAnalysis(null);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline ml-2"
                          >
                            <X className="size-3" /> Remove
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {!imageAnalysis && (
                          <Button
                            type="button"
                            onClick={handleAnalyzeImage}
                            disabled={analyzingImage}
                            className="gap-2"
                          >
                            {analyzingImage ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-4 text-warm-foreground" />
                                Analyze image
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {analyzingImage && (
                      <div className="rounded-md border border-primary/20 bg-primary-soft/40 p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
                          <Loader2 className="size-4 animate-spin" />
                          <span>{imageAnalysisStep}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Extracting handwritten/printed text, identifying diagrams, and structuring concepts for semantic search.
                        </p>
                      </div>
                    )}

                    {imageError && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">Image processing notice</p>
                          <p className="text-xs mt-0.5">{imageError}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAnalyzeImage}
                          className="text-xs h-7 border-destructive/40 hover:bg-destructive/10"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {imageAnalysis && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="grid size-6 place-items-center rounded-full bg-mint text-mint-foreground">
                              <CheckCircle2 className="size-4" />
                            </span>
                            <span className="text-sm font-semibold">Extracted Knowledge Preview</span>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-mint/20 text-mint-foreground dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-medium">
                            <CheckCircle2 className="size-3" />
                            Analysis complete
                          </span>
                        </div>

                        <div className="rounded-md border bg-background p-4 space-y-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Summary
                            </p>
                            <p className="mt-1 text-sm font-medium leading-relaxed">
                              {imageAnalysis.summary}
                            </p>
                          </div>

                          {imageAnalysis.keyConcepts && imageAnalysis.keyConcepts.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                Key Concepts & Entities
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {imageAnalysis.keyConcepts.map((concept, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                                  >
                                    {concept}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {imageAnalysis.detailedExplanation && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Diagram & Technical Breakdown
                              </p>
                              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line bg-muted/30 p-2.5 rounded border">
                                {imageAnalysis.detailedExplanation}
                              </p>
                            </div>
                          )}

                          {imageAnalysis.extractedText && imageAnalysis.extractedText !== "No text present" && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Extracted Text & Code
                              </p>
                              <pre className="max-h-36 overflow-y-auto text-xs text-muted-foreground font-mono bg-muted/30 p-2.5 rounded border whitespace-pre-wrap">
                                {imageAnalysis.extractedText}
                              </pre>
                            </div>
                          )}

                          {imageAnalysis.uncertainties && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded">
                              <span className="font-semibold">Uncertainties/Ambiguities: </span>
                              {imageAnalysis.uncertainties}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : mode === "text" ? (
              <Textarea
                id="main-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-56 resize-none"
                placeholder="Paste your notes, highlights, or any text worth remembering..."
                required
              />
            ) : mode === "youtube" ? (
              <div className="rounded-lg border bg-muted/25 p-5">
                <Label htmlFor="youtube-url">YouTube Video URL</Label>
                <div className="relative mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="youtube-url"
                      type="text"
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setYoutubeTranscript(null);
                        setYoutubeError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !youtubeTranscript && content.trim()) {
                          e.preventDefault();
                          handleFetchYoutube();
                        }
                      }}
                      className="h-11 bg-background pl-9"
                      placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                      required
                    />
                  </div>
                  {!youtubeTranscript && (
                    <Button
                      type="button"
                      onClick={handleFetchYoutube}
                      disabled={fetchingYoutube || !content.trim()}
                      className="h-11"
                    >
                      {fetchingYoutube ? "Fetching..." : "Fetch Transcript"}
                    </Button>
                  )}
                </div>
                {youtubeError && <p className="mt-3 text-sm text-destructive">{youtubeError}</p>}
                {!youtubeTranscript ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Paste a YouTube link to extract its captions and save them as knowledge.
                  </p>
                ) : (
                  <div className="mt-4 rounded border bg-background p-4 text-sm">
                    <h4 className="font-semibold text-foreground mb-2">
                      Transcript Preview ({youtubeTranscript.transcript.length} segments)
                    </h4>
                    <div className="h-40 overflow-y-auto text-muted-foreground space-y-2 pr-2">
                      {youtubeTranscript.transcript.slice(0, 50).map((t, i) => (
                        <p key={i}>{t}</p>
                      ))}
                      {youtubeTranscript.transcript.length > 50 && (
                        <p className="italic">
                          ...and {youtubeTranscript.transcript.length - 50} more segments.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              <Button
                type="submit"
                className="h-10"
                disabled={
                  (mode === "youtube" && !youtubeTranscript) ||
                  (mode === "image" && !imageFile && !content.trim())
                }
              >
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
