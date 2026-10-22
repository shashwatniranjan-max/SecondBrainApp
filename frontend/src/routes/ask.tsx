import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  BrainCircuit,
  ArrowUp,
  Loader2,
  Sparkles,
  ExternalLink,
  History,
  Trash2,
  MessageSquare,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Plus,
  Copy,
  Check,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/second-brain/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { knowledgeService } from "@/services/knowledge-service";
import { DocumentRenderer } from "@/components/second-brain/document-renderer";
import type { BrainAnswer, KnowledgeItem } from "@/types/knowledge";
import { cn } from "@/lib/utils";

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
  validateSearch: (search: Record<string, unknown>): { q?: string; imageId?: string } => {
    return {
      q: typeof search["q"] === "string" ? search["q"] : undefined,
      imageId: typeof search["imageId"] === "string" ? search["imageId"] : undefined,
    };
  },
  component: AskPage,
});

const STARTER_PROMPTS = [
  "What did I learn about Express Router in my notes?",
  "Summarize key insights from my saved YouTube transcripts.",
  "What is in my 120-day plan?",
  "Connect my notes on AI agents and security threats.",
];

function AskPage() {
  const searchParams = useSearch({ from: "/ask" });
  const [question, setQuestion] = useState(searchParams.q || "");
  const [loading, setLoading] = useState(false);
  // Track currently active question being fetched so user immediately sees what they asked!
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  // Full conversational thread: keeps all asked questions and answers visible!
  const [messages, setMessages] = useState<BrainAnswer[]>([]);
  const [history, setHistory] = useState<BrainAnswer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(searchParams.imageId || null);
  const [selectedImageItem, setSelectedImageItem] = useState<KnowledgeItem | null>(null);
  const [savedImages, setSavedImages] = useState<KnowledgeItem[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, pendingQuestion]);

  // Load past query history on mount
  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const data = await knowledgeService.getAskHistory();
        setHistory(data);
      } catch (err) {
        console.warn("Could not load query history:", err);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Fetch image metadata when imageId is present
  useEffect(() => {
    if (selectedImageId) {
      knowledgeService
        .getKnowledgeById(selectedImageId)
        .then((item) => {
          if (item && item.type === "Image") {
            setSelectedImageItem(item);
          }
        })
        .catch((err) => console.warn("Failed to load attached image:", err));
    } else {
      setSelectedImageItem(null);
    }
  }, [selectedImageId]);

  // Load saved images list for the image attachment picker
  useEffect(() => {
    knowledgeService
      .getKnowledge()
      .then((items) => {
        const images = items.filter((item) => item.type === "Image");
        setSavedImages(images);
      })
      .catch(() => {});
  }, []);

  // Handle auto-submit if ?q= was provided in URL
  useEffect(() => {
    if (searchParams.q && messages.length === 0 && !loading) {
      handleAsk(searchParams.q);
    }
  }, [searchParams.q]);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || loading) return;

    // Immediately display the question in the chat thread
    setPendingQuestion(q);
    setLoading(true);
    setError(null);
    setQuestion("");

    try {
      const conversationHistory = messages.slice(-4).flatMap((m) => [
        { role: "user" as const, content: m.question },
        { role: "assistant" as const, content: m.answer },
      ]);
      const response = await knowledgeService.askBrain(
        q,
        conversationHistory,
        selectedImageId || undefined
      );
      // Append to the active conversation so earlier messages STAY VISIBLE
      setMessages((prev) => [...prev, response]);
      // Also update history list
      setHistory((prev) => [response, ...prev.filter((item) => item.id !== response.id)]);
    } catch (err: any) {
      setError(err.message || "Failed to query your brain. Please try again.");
    } finally {
      setLoading(false);
      setPendingQuestion(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setPendingQuestion(null);
    setError(null);
    setQuestion("");
    inputRef.current?.focus();
  };

  const handleSelectHistoryItem = (item: BrainAnswer) => {
    setMessages([item]);
    setError(null);
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await knowledgeService.deleteAskQuery(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setMessages((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete query:", err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell title="Ask My Brain" eyebrow="AI Knowledge Assistant" contentClassName="p-0 sm:p-4 md:p-6 lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] h-[calc(100dvh-72px)] sm:h-[calc(100vh-140px)]">
        {/* Main ChatGPT-like Chat Canvas */}
        <div className="flex flex-col h-full rounded-none sm:rounded-2xl bg-[#212121] border-0 sm:border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Top Chat Header */}
          <div className="flex items-center justify-between px-3.5 py-3 md:px-6 md:py-3.5 border-b border-zinc-800 bg-[#1e1e1e] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
                <BrainCircuit className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-100 truncate">Second Brain</h2>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                    Knowledge AI
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
                  Semantic retrieval over saved notes, transcripts & PDFs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile History Drawer Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDrawerOpen(true)}
                className="xl:hidden gap-1.5 text-xs h-8 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white px-2.5 rounded-lg"
                title="Chat History"
              >
                <History className="size-3.5 text-primary" />
                <span className="hidden sm:inline">History</span>
                {history.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-200">
                    {history.length}
                  </span>
                )}
              </Button>

              {/* New Chat Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className={cn(
                  "gap-1.5 text-xs h-8 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white px-2.5 rounded-lg",
                  messages.length === 0 && "hidden sm:flex"
                )}
                title="Start New Chat"
              >
                <Plus className="size-3.5 text-primary" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 sm:p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 min-h-0">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && !loading && (
              <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-5 sm:p-8 text-center shadow-lg my-auto">
                <div className="grid size-12 sm:size-14 place-items-center rounded-2xl bg-primary/20 text-primary mb-3 sm:mb-4 shadow-sm border border-primary/20">
                  <Sparkles className="size-6 sm:size-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1.5 sm:mb-2">
                  How can I help you today?
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5 sm:mb-6 leading-relaxed">
                  Ask questions about your saved notes, YouTube videos, and documents, or explore general knowledge.
                </p>

                <div className="w-full text-left">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Suggested prompts:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleAsk(prompt)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 sm:p-3 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white text-left"
                      >
                        <span className="line-clamp-2">{prompt}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg, index) => (
              <div key={msg.id || index} className="space-y-4 max-w-3xl mx-auto">
                {/* User Message Bubble (Right-aligned, ChatGPT style) */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl bg-[#2f2f2f] text-white px-5 py-3 shadow-sm border border-white/5">
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                      {msg.question}
                    </p>
                  </div>
                </div>

                {/* Assistant Grounded Response (Left-aligned) */}
                <div className="flex items-start gap-3.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary border border-primary/20 shadow-sm mt-0.5">
                    <BrainCircuit className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3.5">
                    {/* Header bar: Badge and grounding info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">Second Brain</span>
                      </div>
                      {msg.sources && msg.sources.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium">
                          <BookOpen className="size-3" />
                          Grounded in {msg.sources.length} saved{" "}
                          {msg.sources.length === 1 ? "source" : "sources"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/40 px-2.5 py-0.5 text-xs font-medium">
                          General knowledge
                        </span>
                      )}
                    </div>

                    {/* Answer Body */}
                    <div className="text-sm leading-relaxed text-zinc-200 space-y-2">
                      <DocumentRenderer content={[msg.answer]} />
                    </div>

                    {/* Grounded Source Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-3.5 mt-3">
                        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <BookOpen className="size-3.5 text-emerald-400" /> Grounded in your saved library:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {msg.sources.map((src, idx) => (
                            <Link
                              key={idx}
                              to={`/knowledge/$knowledgeId`}
                              params={{ knowledgeId: src.knowledgeId }}
                              className="group flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-800 text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-zinc-200 group-hover:text-primary transition-colors line-clamp-1">
                                  {src.title}
                                </p>
                                <span className="shrink-0 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {src.relevance}% match
                                </span>
                              </div>
                              {src.excerpt && (
                                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed italic">
                                  "{src.excerpt}"
                                </p>
                              )}
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>View note</span>
                                <ExternalLink className="size-2.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar (Copy) */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.answer)}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="size-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span className="text-[11px]">Copy answer</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Suggested Follow-up Questions (Only for latest answer) */}
                    {index === messages.length - 1 &&
                      msg.suggestedQuestions &&
                      msg.suggestedQuestions.length > 0 && (
                        <div className="border-t border-zinc-800/80 pt-3 mt-2">
                          <p className="text-[11px] font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                            <HelpCircle className="size-3.5 text-primary" /> Follow-up questions:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestedQuestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleAsk(suggestion)}
                                className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}

            {/* LIVE OPTIMISTIC STATE: User question immediately visible + Thinking Bubble */}
            {loading && pendingQuestion && (
              <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                {/* User Message appears instantly! */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl bg-[#2f2f2f] text-white px-5 py-3 shadow-sm border border-white/5">
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                      {pendingQuestion}
                    </p>
                  </div>
                </div>

                {/* Assistant Generating State */}
                <div className="flex items-start gap-3.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary border border-primary/20 shadow-sm mt-0.5">
                    <Sparkles className="size-4 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">Second Brain</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-medium">
                        Gemma 4
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce" />
                      </div>
                      <span className="ml-1 text-zinc-300">
                        Searching knowledge library & synthesizing grounded response...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="max-w-3xl mx-auto rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Error retrieving answer</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Floating Input Bar (ChatGPT Style) */}
          <div className="p-3 sm:p-4 bg-[#212121] border-t border-zinc-800/80 shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Attached Image Context Chip */}
              {selectedImageItem && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-zinc-700/80 bg-zinc-800/95 px-3 py-1.5 text-xs text-zinc-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-6 place-items-center rounded-lg bg-primary/20 text-primary shrink-0">
                      <ImageIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedImageItem.title}</p>
                      <p className="text-[10px] text-zinc-400">
                        {selectedImageItem.analysisStatus === "completed"
                          ? "Analyzed image context"
                          : "Direct vision context (unanalyzed image)"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageId(null);
                      setSelectedImageItem(null);
                    }}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors ml-2"
                    title="Remove attached image"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              <div className="relative">
                {/* Image Picker Dropdown */}
                {showImagePicker && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 rounded-xl border border-zinc-700 bg-[#252525] p-2.5 shadow-2xl z-50 text-xs text-zinc-200">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-700/60 mb-1.5">
                      <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-primary" />
                        Attach saved image
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {savedImages.length === 0 ? (
                      <div className="p-3 text-center text-zinc-400">
                        <p>No images saved in your library yet.</p>
                        <Link
                          to="/add"
                          className="text-primary hover:underline mt-1 inline-block text-[11px]"
                        >
                          Add an image first
                        </Link>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1">
                        {savedImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              setSelectedImageId(img.id);
                              setSelectedImageItem(img);
                              setShowImagePicker(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                              selectedImageId === img.id
                                ? "bg-primary/20 text-primary font-medium"
                                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            )}
                          >
                            <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{img.title}</p>
                              <span className="text-[10px] text-zinc-400">
                                {img.analysisStatus === "completed" ? "Analyzed" : "Analysis pending"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex items-center rounded-3xl border border-zinc-700/60 bg-[#2f2f2f] shadow-xl focus-within:border-zinc-500 transition-colors pl-2.5 sm:pl-3 pr-3 sm:pr-4 py-1.5 sm:py-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker((prev) => !prev)}
                    className={cn(
                      "size-7 sm:size-8 rounded-full flex items-center justify-center transition-colors mr-1 shrink-0",
                      selectedImageId
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    )}
                    title={selectedImageId ? "Change attached image" : "Attach saved image from library"}
                  >
                    <ImageIcon className="size-4" />
                  </button>

                  <Textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      selectedImageItem
                        ? `Ask a question about "${selectedImageItem.title}"...`
                        : "Message Second Brain..."
                    }
                    rows={1}
                    className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent text-white placeholder-zinc-400 py-2 pr-11 text-sm md:text-[15px] focus-visible:ring-0 shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAsk()}
                    disabled={loading || !question.trim()}
                    className={cn(
                      "absolute right-2.5 top-1/2 -translate-y-1/2 size-7 sm:size-8 rounded-full flex items-center justify-center transition-all",
                      question.trim() && !loading
                        ? "bg-white text-black hover:bg-zinc-200 cursor-pointer shadow-md"
                        : "bg-zinc-700/60 text-zinc-500 cursor-not-allowed"
                    )}
                    title="Send message"
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 sm:size-4 animate-spin text-zinc-400" />
                    ) : (
                      <ArrowUp className="size-3.5 sm:size-4 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-center text-zinc-500 mt-1.5 sm:mt-2 line-clamp-1">
                Second Brain answers from your library or general knowledge.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar: Chat & Query History (Hidden on mobile/tablet) */}
        <aside className="hidden xl:block space-y-4 h-full overflow-hidden">
          <div className="rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-4 shadow-xl text-zinc-200 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <History className="size-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">Chat History</h3>
              </div>
              <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                {history.length}
              </span>
            </div>

            {/* New Chat Button */}
            <Button
              onClick={handleNewChat}
              className="w-full justify-start gap-2 mb-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs h-9 rounded-xl shrink-0"
            >
              <Plus className="size-4 text-primary" />
              <span>Start New Chat</span>
            </Button>

            {historyLoading ? (
              <div className="py-8 text-center text-xs text-zinc-400 my-auto">
                <Loader2 className="size-4 animate-spin mx-auto mb-2 text-primary" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 my-auto">
                <MessageSquare className="size-5 mx-auto mb-2 opacity-40" />
                No past questions yet. Ask something to get started!
              </div>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className={cn(
                      "group flex items-start justify-between gap-2 rounded-xl p-2.5 text-xs transition-colors cursor-pointer text-left border",
                      messages.some((m) => m.id === item.id)
                        ? "bg-[#2f2f2f] text-white border-zinc-700 font-medium"
                        : "border-transparent hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 leading-snug">{item.question}</p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        {item.sources && item.sources.length > 0
                          ? `${item.sources.length} sources`
                          : "General knowledge"}
                      </span>
                    </div>
                    {/* Delete button: visible on touch devices and on desktop hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      title="Delete question"
                      className="opacity-100 xl:opacity-0 xl:group-hover:opacity-100 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-all text-zinc-400 shrink-0"
                      aria-label="Delete question"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Slide-Over History Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setHistoryDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-[#1e1e1e] border-l border-zinc-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#181818] shrink-0">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-white">Chat History</h3>
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                  {history.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryDrawerOpen(false)}
                className="size-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                aria-label="Close history"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* New Chat Button in Drawer */}
            <div className="p-3 border-b border-zinc-800/60 shrink-0">
              <Button
                onClick={() => {
                  handleNewChat();
                  setHistoryDrawerOpen(false);
                }}
                className="w-full justify-start gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs h-9 rounded-xl"
              >
                <Plus className="size-4 text-primary" />
                <span>Start New Chat</span>
              </Button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  <Loader2 className="size-4 animate-spin mx-auto mb-2 text-primary" />
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  <MessageSquare className="size-5 mx-auto mb-2 opacity-40" />
                  No past questions yet. Ask something to get started!
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleSelectHistoryItem(item);
                      setHistoryDrawerOpen(false);
                    }}
                    className={cn(
                      "group flex items-start justify-between gap-2 rounded-xl p-3 text-xs transition-colors cursor-pointer text-left border",
                      messages.some((m) => m.id === item.id)
                        ? "bg-[#2f2f2f] text-white border-zinc-700 font-medium"
                        : "border-transparent hover:bg-zinc-800/70 text-zinc-300 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 leading-snug font-medium text-zinc-200">{item.question}</p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        {item.sources && item.sources.length > 0
                          ? `${item.sources.length} sources`
                          : "General knowledge"}
                      </span>
                    </div>
                    {/* Delete Button (ALWAYS clearly visible and easily tappable on mobile) */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      title="Delete question"
                      className="size-8 p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 active:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Delete question"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
