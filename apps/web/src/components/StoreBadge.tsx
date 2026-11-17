/** Store name with its brand colour as a dot — colour is never the only cue. */
export function StoreBadge({ name, color, strong }: { name: string; color: string | null; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${strong ? "font-semibold text-ink" : "text-ink-muted"}`}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? "#94a3b8" }} aria-hidden="true" />
      {name}
    </span>
  );
}
