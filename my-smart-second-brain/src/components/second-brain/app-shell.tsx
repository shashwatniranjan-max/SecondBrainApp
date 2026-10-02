import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/add", label: "Add Knowledge", icon: Plus },
  { to: "/ask", label: "Ask My Brain", icon: BrainCircuit },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="relative grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
        <BrainCircuit className="size-5" />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-mint-strong" />
      </span>
      <span className="text-[17px] font-bold text-foreground">Second Brain</span>
    </Link>
  );
}

function NavItems({ close }: { close?: () => void }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={close}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-[18px]",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/signin" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-app">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <div className="flex-1 px-3 py-4">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
            Workspace
          </p>
          <NavItems />
        </div>
        <div className="m-3 rounded-lg border bg-background p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-lavender text-lavender-foreground">
              <CircleHelp className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Need a hand?</p>
              <p className="text-[11px] text-muted-foreground">Visit the help center</p>
            </div>
          </div>
        </div>
        <div className="border-t p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold text-background uppercase">
              {user.name.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">Personal workspace</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={logout}
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[280px] border-r bg-sidebar p-4 shadow-xl flex flex-col">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="flex-1">
              <NavItems close={() => setMobileOpen(false)} />
            </div>
            <div className="border-t pt-4 mt-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold text-background uppercase">
                  {user.name.substring(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Button
              className="lg:hidden"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <div>
              <p className="text-xs font-medium text-primary">{eyebrow}</p>
              <h1 className="text-lg font-bold md:text-xl">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
            </Button>
            {actions}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
