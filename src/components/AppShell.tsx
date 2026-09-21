import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ClipboardCheck, LogOut, LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/ace-data";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/15 hover:text-primary-foreground";

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-primary shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/stores" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary-foreground text-primary">
              <ClipboardCheck className="size-5" />
            </span>
            <span className="text-base font-extrabold uppercase tracking-tight text-primary-foreground">
              ACE Audit
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Link to="/stores" className={linkClass} activeProps={{ className: "bg-white/20 text-primary-foreground" }}>
              <Building2 className="size-4" />
              <span className="hidden sm:inline">Stores</span>
            </Link>
            {profile?.isAdmin ? (
              <Link to="/hq" className={linkClass} activeProps={{ className: "bg-white/20 text-primary-foreground" }}>
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">Head office</span>
              </Link>
            ) : null}
            <button type="button" onClick={signOut} className={cn(linkClass)} aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  );
}
