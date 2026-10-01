import { createFileRoute } from "@tanstack/react-router";
import { Bell, BrainCircuit, Library, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/second-brain/app-shell";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Second Brain" },
      { name: "description", content: "Manage your Second Brain workspace preferences." },
      { property: "og:title", content: "Settings — Second Brain" },
      { property: "og:description", content: "Manage your Second Brain workspace preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const sections = [
  {
    icon: BrainCircuit,
    title: "Brain responses",
    description: "Control how answers are formed from your knowledge.",
    rows: [
      {
        label: "Show source excerpts",
        detail: "Include matching passages beneath answers",
        control: <Switch defaultChecked />,
      },
      {
        label: "Answer depth",
        detail: "Balance concise responses with richer context",
        control: (
          <Select defaultValue="balanced">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
    ],
  },
  {
    icon: Library,
    title: "Knowledge defaults",
    description: "Choose how new material is organized.",
    rows: [
      {
        label: "Auto-suggest tags",
        detail: "Suggest relevant tags during processing",
        control: <Switch defaultChecked />,
      },
      {
        label: "Save original source",
        detail: "Keep the source URL or uploaded filename",
        control: <Switch defaultChecked />,
      },
    ],
  },
  {
    icon: Bell,
    title: "Learning reminders",
    description: "Stay connected to ideas worth revisiting.",
    rows: [
      {
        label: "Weekly review",
        detail: "A Sunday digest of notes to revisit",
        control: <Switch defaultChecked />,
      },
      {
        label: "Continue learning prompts",
        detail: "Remind me about partially read items",
        control: <Switch />,
      },
    ],
  },
];
function SettingsPage() {
  return (
    <AppShell title="Settings" eyebrow="Workspace">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Make it yours</h2>
          <p className="mt-2 text-muted-foreground">
            Tune your learning workspace and response preferences.
          </p>
        </div>
        <div className="space-y-5">
          {sections.map(({ icon: Icon, title, description, rows }) => (
            <section key={title} className="rounded-lg border bg-card shadow-card">
              <div className="flex gap-3 border-b p-5">
                <div className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-[18px]" />
                </div>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-6 p-5">
                    <div>
                      <p className="text-sm font-semibold">{row.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
                    </div>
                    {row.control}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button>
            <SlidersHorizontal />
            Save preferences
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
