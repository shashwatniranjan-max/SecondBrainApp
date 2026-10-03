import { createFileRoute, Link } from "@tanstack/react-router";
import { BrainCircuit } from "lucide-react";
import { AppShell } from "@/components/second-brain/app-shell";
import { Button } from "@/components/ui/button";

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
  component: AskPage,
});


function AskPage() {
  return (
    <AppShell title="Ask My Brain" eyebrow="Knowledge assistant">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-lg border bg-card p-12 text-center shadow-card min-h-[calc(100vh-136px)]">
        <div className="grid size-16 place-items-center rounded-xl bg-primary-soft text-primary mb-6">
          <BrainCircuit className="size-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          We're training your AI assistant to understand and connect all your saved knowledge. Check back later to start asking questions!
        </p>
        <Button asChild variant="outline">
          <Link to="/knowledge">Browse Knowledge Library</Link>
        </Button>
      </div>
    </AppShell>
  );
}
