import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClipboardCheck, LineChart, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/movenpick-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACE Audit — Monthly Mövenpick store audits" },
      {
        name: "description",
        content:
          "Run the monthly ACE checklist across all 15 Mövenpick stores, score each section instantly and track performance over time.",
      },
      { property: "og:title", content: "ACE Audit — Monthly Mövenpick store audits" },
      {
        property: "og:description",
        content: "Score the 6-section ACE checklist on your phone and track every store from head office.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/stores", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-primary">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="flex h-10 w-36 items-center rounded bg-primary-foreground px-2">
            <img src={logoAsset.url} alt="Mövenpick Swiss Ice Cream" className="h-auto w-full" />
          </span>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="ml-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >

            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
          Monthly store audits, scored the moment you tap.
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          One checklist, six sections, fifteen stores. Fill it in on your phone in store, and head office
          sees the score straight away.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/auth">Start an audit</Link>
        </Button>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, title: "Guided checklist", body: "Yes / No / N/A with a note for anything that needs fixing." },
            { icon: LineChart, title: "Live scoring", body: "Weighted section and overall scores update as you go." },
            { icon: ShieldCheck, title: "Head office view", body: "Every store's latest score and trend in one sortable table." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-3 font-bold text-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
