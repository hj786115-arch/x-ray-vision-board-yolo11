import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Calendar, UploadCloud, ScanLine, FileImage, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useScans } from "@/hooks/use-scans";
import type { ScanListItem } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — XRayVision AI" }] }),
  component: HistoryPage,
});

const filters = ["All", "Chest", "Fracture", "Wound"] as const;
const urgencyStyle: Record<string, string> = {
  review: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-success/15 text-success border-success/30",
  clear: "bg-muted text-muted-foreground border-border",
};

function HistoryPage() {
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const { t, format, term, formatDate } = useLanguage();
  const [query, setQuery] = useState("");

  const scanType = filter === "All" ? undefined : filter.toLowerCase();
  const { data, isLoading } = useScans({ scan_type: scanType, limit: 50 });

  const scans = (data?.scans ?? []).filter((s) => {
    if (query && !s.id.includes(query) && !(s.session_label || "").toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell title="Scan History" titleKey="hist.title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">{t("hist.kicker")}</p>
          <h2 className="mt-1 font-display text-3xl font-bold">{t("hist.heading")}</h2>
        </div>
        <Link to="/analyze" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
          <ScanLine size={16} /> {t("nav.analyze")}
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hist.search")}
            className="w-full rounded-md border border-border bg-background/60 py-2 ps-9 pe-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-background/60 p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "All" ? t("common.all") : term(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : scans.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scans.map((s, i) => (
            <Link
              key={s.id}
              to="/results/$scanId"
              params={{ scanId: s.id }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-[var(--shadow-md)] animate-fade-up"
              style={{ animationDelay: `${i * 40}ms`, background: "var(--gradient-card)" }}
            >
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-black">
                {s.image_url ? (
                  <img src={s.image_url} alt={`Scan ${s.id}`} className="h-full w-full object-cover opacity-60" />
                ) : (
                  <FileImage size={36} className="text-muted-foreground/40" />
                )}
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
                <span className={`absolute end-3 top-3 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[s.urgency] || urgencyStyle.clear}`}>
                  {term(s.urgency)}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {term(s.scan_type)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{format("hist.findings", { n: s.findings_count })}</span>
                </div>
                <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{s.id.slice(0, 16)}…</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.session_label || "—"}</span>
                  <span className="text-muted-foreground">{formatDate(s.created_at)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">{t("hist.view")} <span className="rtl-flip inline-block">→</span></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-muted-foreground">
        <UploadCloud size={28} />
      </div>
      <h3 className="mt-4 font-display text-xl font-bold">{t("hist.emptyTitle")}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("hist.emptyBody")}
      </p>
      <Link to="/analyze" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
        <ScanLine size={16} /> {t("hist.start")}
      </Link>
    </div>
  );
}
