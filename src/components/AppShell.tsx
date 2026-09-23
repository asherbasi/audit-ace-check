import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LogOut, LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/ace-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/movenpick-logo.png.asset.json";

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
    "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground";

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-primary-foreground/10 bg-primary shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link to="/stores" className="flex min-w-0 items-center gap-3" aria-label="Mövenpick ACE Audit">
            <span className="flex h-10 w-28 items-center rounded bg-primary-foreground px-2 sm:w-36">
              <img src={logoAsset.url} alt="Mövenpick Swiss Ice Cream" className="h-auto w-full" />
            </span>
            <span className="hidden text-xs font-semibold uppercase text-primary-foreground/70 md:inline">
              ACE Audit
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Link to="/stores" className={linkClass} activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}>
              <Building2 className="size-4" />
              <span className="hidden sm:inline">Stores</span>
            </Link>
            <Link to="/hq" className={linkClass} activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}>
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Head office</span>
            </Link>
            {profile ? (
              <Button type="button" variant="ghost" size="icon" onClick={signOut} className={cn(linkClass)} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  );
}
