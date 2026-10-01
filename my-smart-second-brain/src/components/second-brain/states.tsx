import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Loading your knowledge..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "Nothing found",
  description = "Try another search or add new knowledge.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/35 px-6 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-lg bg-background shadow-sm">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-destructive/5 px-6 text-center">
      <AlertCircle className="mb-3 size-6 text-destructive" />
      <h3 className="font-semibold">We couldn't load this</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your knowledge is safe. Please try again.
      </p>
      {retry && (
        <Button className="mt-4" variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ProcessingState({ progress }: { progress: number }) {
  return (
    <div className="rounded-lg border bg-primary-soft p-6">
      <div className="flex items-center gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">Processing your knowledge</p>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Extracting content, finding key ideas, and preparing it for search.
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
