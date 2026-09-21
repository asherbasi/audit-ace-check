import { bandClasses, formatPct, scoreBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function ScorePill({
  pct,
  size = "md",
  label,
  className,
}: {
  pct: number | null | undefined;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const band = scoreBand(pct);
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-full border font-semibold tabular-nums",
        bandClasses(band),
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        size === "lg" && "px-4 py-1.5 text-lg",
        className,
      )}
    >
      {formatPct(pct)}
      {label ? <span className="text-[0.7em] font-medium opacity-80">{label}</span> : null}
    </span>
  );
}
