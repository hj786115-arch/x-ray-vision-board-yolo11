import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Share2, Sparkles, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Tag, Loader2, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { scansApi } from "@/lib/api";
import { useScan } from "@/hooks/use-scans";
import { selectBoxFindings } from "@/lib/fracture-boxes";
import type { Finding as FindingType } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/results/$scanId")({
  head: () => ({ meta: [{ title: "Results — XRayVision AI" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const { scanId } = Route.useParams();
  const { data: scan, isLoading, error } = useScan(scanId);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const { t, format, term, isUrdu } = useLanguage();

  if (isLoading) {
    return (
      <AppShell title="Loading Results" titleKey="res.loading">
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !scan) {
    return (
      <AppShell title="Error" titleKey="res.errorTitle">
        <div className="mx-auto max-w-md text-center py-32">
          <AlertTriangle size={32} className="mx-auto text-destructive" />
          <h2 className="mt-4 font-display text-2xl font-bold">{t("res.notFound")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error?.message || t("res.notFoundBody")}</p>
          <Link to="/history" className="mt-6 inline-block text-sm text-primary hover:underline"><span className="rtl-flip inline-block">←</span> {t("res.backHistory")}</Link>
        </div>
      </AppShell>
    );
  }

  const allFindings = scan.findings || [];
  // Split findings: hide "clear/no fracture" entries from chest reports — not clinically useful
  const findings = allFindings.filter((f) => f.severity !== "clear");
  const clearFindings = allFindings.filter((f) => f.severity === "clear");
  // Group by confidence tier
  const primaryFindings = findings.filter((f) => scan.scan_type === "fracture" ? Boolean(f.bbox) : f.confidence >= 65);
  const secondaryFindings = findings.filter((f) => scan.scan_type === "fracture" ? !f.bbox : f.confidence >= 50 && f.confidence < 65);
  const borderline = scan.scan_type === "fracture" ? [] : findings.filter((f) => f.confidence < 50);
  const agent = scan.agent_synthesis;
  const lowConf = findings.some((f) => f.confidence < 60);
  const routing = scan.model_results?.routing as { note?: string | null } | undefined;
  const boxedFindings = selectBoxFindings(findings, scan.scan_type);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const onDownloadPdf = async () => {
    // A previous version of this opened a blank tab synchronously and later
    // set its location to the blob URL, to dodge a Safari user-gesture
    // timing issue. Verified live (Android Chrome, the client's actual
    // device) that approach is itself broken: the tab opens, the fetch
    // succeeds, but the cross-window blob: URL navigation silently does
    // nothing — the tab just sits at about:blank. A blob URL created in one
    // document isn't reliably navigable from another window/tab. Fetching
    // the blob and clicking a same-document anchor (verified working) is the
    // simpler, actually-reliable approach.
    setExporting("pdf");
    try {
      const blob = await scansApi.downloadPdf(scanId);
      downloadBlob(blob, `xrayvision-report-${scanId}.pdf`);
    } catch (err: unknown) {
      alert(format("res.pdfFailed", { err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setExporting(null);
    }
  };

  const onExportJson = async () => {
    setExporting("json");
    try {
      const data = await scansApi.exportJson(scanId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `xrayvision-report-${scanId}.json`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <AppShell title="Diagnostic Results" titleKey="res.title">
      <div className="grid gap-6 lg:grid-cols-[45fr_55fr]">
        {/* Image viewer */}
        <section className="rounded-2xl border border-border bg-card p-4" style={{ background: "var(--gradient-card)" }}>
          <header className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">{t("res.image")}</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{term(scan.scan_type)}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{scan.created_at}</span>
          </header>

          <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-black">
            {/* Wrapper shrink-wraps the image so box percentages (relative to the
                original image) line up with it — a fixed square would offset them. */}
            <div className="relative inline-block max-w-full" style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 200ms" }}>
              {scan.image_url ? (
                <img src={scan.image_url} alt={`X-ray scan ${scanId}`} className="block h-auto max-h-[70vh] w-auto max-w-full opacity-95" />
              ) : (
                <div className="flex aspect-square w-64 items-center justify-center text-muted-foreground">
                  <span className="font-mono text-xs">{t("res.noImage")}</span>
                </div>
              )}
              {showHeatmap && boxedFindings.map((finding, index) => (
                <div
                  key={`highlight-${index}`}
                  className="pointer-events-none absolute bg-warning/25 mix-blend-screen"
                  style={{
                    left: `${finding.bbox!.x}%`, top: `${finding.bbox!.y}%`,
                    width: `${finding.bbox!.w}%`, height: `${finding.bbox!.h}%`,
                  }}
                />
              ))}
              {showBoxes && boxedFindings.map((primaryBox, index) => (
                  <div
                    key={`${primaryBox.name}-${index}`}
                    data-fracture-box={scan.scan_type === "fracture" ? "true" : undefined}
                    aria-label={`${term(primaryBox.name)}, ${primaryBox.confidence}%`}
                    className={`group absolute border-2 border-dashed animate-fade-up ${
                      primaryBox.color === "destructive" ? "border-destructive" : primaryBox.color === "warning" ? "border-warning" : "border-info"
                    }`}
                    style={{
                      left: `${primaryBox.bbox!.x}%`, top: `${primaryBox.bbox!.y}%`,
                      width: `${primaryBox.bbox!.w}%`, height: `${primaryBox.bbox!.h}%`,
                    }}
                  >
                    {showLabels && (
                      <span
                        className={`absolute -top-6 start-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-background ${
                          primaryBox.color === "destructive" ? "bg-destructive" : primaryBox.color === "warning" ? "bg-warning" : "bg-info"
                        }`}
                      >
                        {term(primaryBox.name)} · {primaryBox.confidence.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="scan-line" /></div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ToolbarBtn active={showBoxes} onClick={() => setShowBoxes((v) => !v)} icon={<Eye size={14} />} label={t("res.tool.findings")} />
            <ToolbarBtn active={showHeatmap} onClick={() => setShowHeatmap((v) => !v)} icon={<Layers size={14} />} label={t("res.tool.heatmap")} />
            <ToolbarBtn active={showLabels} onClick={() => setShowLabels((v) => !v)} icon={<Tag size={14} />} label={t("res.tool.labels")} />
            <div className="ms-auto flex items-center gap-1">
              <button aria-label={t("res.zoomIn")} onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><ZoomIn size={14} /></button>
              <button aria-label={t("res.zoomOut")} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><ZoomOut size={14} /></button>
              <button aria-label={t("res.zoomReset")} onClick={() => setZoom(1)} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><RotateCcw size={14} /></button>
            </div>
          </div>
        </section>

        {/* Report */}
        <section className="rounded-2xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
          <div className="flex items-center justify-between rounded-lg border-l-4 border-warning bg-warning/10 px-4 py-3" role="alert">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-warning" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-warning">{t("res.urgency")}</p>
                <p className="font-display text-lg font-bold text-warning">{agent.urgency === "review" ? "INCONCLUSIVE — REVIEW REQUIRED" : isUrdu ? term(agent.urgency) : agent.urgency.toUpperCase()}</p>
              </div>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">{scanId}</p>
          </div>

          {scan.scan_type === "fracture" && <p className="mt-3 text-xs text-muted-foreground">
            Model scores are not diagnostic accuracy or injury severity. A missing box does not rule out a fracture.
          </p>}

          {routing?.note && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>{term(routing.note)}</span>
            </div>
          )}

          {lowConf && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-info">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{t("res.lowConf")}</span>
            </div>
          )}

          {/* Primary findings ≥ 65% */}
          <h3 className="mt-6 text-sm font-semibold text-muted-foreground">{scan.scan_type === "fracture" ? "Localized fracture candidates" : t("res.primary")}</h3>
          <div className="mt-3 space-y-3">
            {primaryFindings.map((f, i) => (
              <FindingCard key={f.name + i} f={f} delay={i * 80} />
            ))}
            {primaryFindings.length === 0 && (
              <p className="text-sm text-muted-foreground italic">{scan.scan_type === "fracture" ? "No fracture location detected. This does not rule out a fracture." : t("res.noPrimary")}</p>
            )}
          </div>

          {/* Secondary findings 50–65% */}
          {secondaryFindings.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-muted-foreground">
                {scan.scan_type === "fracture" ? "Unconfirmed image-level signals" : t("res.secondary")}
                {scan.scan_type !== "fracture" && <span className="ms-2 font-mono text-[10px] text-muted-foreground/60 normal-case">{t("res.secondaryRange")}</span>}
              </h3>
              <div className="mt-3 space-y-2">
                {secondaryFindings.map((f, i) => (
                  <FindingCard key={f.name + i} f={f} delay={i * 60} compact />
                ))}
              </div>
            </>
          )}

          {/* Borderline / low confidence < 50% */}
          {borderline.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {format("res.borderline", { n: borderline.length })}
              </summary>
              <div className="mt-2 space-y-2 opacity-70">
                {borderline.map((f, i) => (
                  <FindingCard key={f.name + i} f={f} delay={0} compact />
                ))}
              </div>
            </details>
          )}

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">{t("res.agent")}</span>
            </div>
            <Typewriter text={agent.synthesis_text} className="mt-2 text-sm leading-relaxed text-foreground" />
          </div>

          {agent.recommended_actions.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-muted-foreground">{t("res.actions")}</h3>
              <ol className="mt-3 space-y-2">
                {agent.recommended_actions.map((a, i) => (
                  <li key={a} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">{i + 1}</span>
                    <span className="text-foreground">{a}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {agent.specialist && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
              <MapPin size={14} />
              <span>{t("res.specialist")} <strong>{term(agent.specialist)}</strong></span>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(agent.specialist + " near me")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto text-xs underline"
              >
                {t("res.findNearby")} <span className="rtl-flip inline-block">→</span>
              </a>
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-muted-foreground">{t("res.confSummary")}</h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background/60 text-start font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("res.col.model")}</th>
                  <th className="px-3 py-2">{t("res.col.finding")}</th>
                  <th className="px-3 py-2">{t("res.col.confidence")}</th>
                  <th className="px-3 py-2">{t("res.col.severity")}</th>
                </tr>
              </thead>
              <tbody>
                {allFindings.map((f, i) => (
                  <tr key={f.name + i} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{f.model}</td>
                    <td className="px-3 py-2">{term(f.name)}</td>
                    <td className="px-3 py-2 font-mono">{f.confidence.toFixed(1)}%</td>
                    <td className={`px-3 py-2 font-medium ${f.color === "destructive" ? "text-destructive" : f.color === "warning" ? "text-warning" : f.color === "success" ? "text-success" : "text-info"}`}>{term(f.severity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onDownloadPdf}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)] disabled:opacity-60"
            >
              <Download size={14} /> {exporting === "pdf" ? t("res.preparing") : t("res.pdf")}
            </button>
            <button
              onClick={onExportJson}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm font-medium hover:border-primary/60 disabled:opacity-60"
            >
              <Share2 size={14} /> {exporting === "json" ? t("res.preparing") : t("res.json")}
            </button>
            <Link to="/history" className="ms-auto self-center text-xs text-muted-foreground hover:text-foreground">{t("res.backHistory")} <span className="rtl-flip inline-block">→</span></Link>
          </div>

          <p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{t("res.disclaimerLead")}</span> {t("res.disclaimerBody")}
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function ToolbarBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FindingCard({ f, delay, compact = false }: { f: FindingType; delay: number; compact?: boolean }) {
  const { term } = useLanguage();
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start - delay) / 800);
      if (p > 0) setVal(f.confidence * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [f.confidence, delay]);

  const sevDot = f.color === "destructive" ? "bg-destructive" : f.color === "warning" ? "bg-warning" : "bg-info";
  const sevText = f.color === "destructive" ? "text-destructive" : f.color === "warning" ? "text-warning" : "text-info";

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sevDot}`} />
        <span className="flex-1 text-xs text-foreground">{term(f.name)}</span>
        <div className="w-24 h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary/60" style={{ width: `${val}%` }} />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground w-10 text-end">{val.toFixed(1)}%</span>
        <span className={`font-mono text-[9px] uppercase ${sevText}`}>{term(f.severity)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${sevDot}`} />
          <span className="text-sm font-semibold">{term(f.name)}</span>
        </div>
        <span className={`rounded-full bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${sevText}`}>{term(f.severity)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${val}%`, boxShadow: "0 0 8px rgba(0,200,224,0.6)" }} />
        </div>
        <span className="font-mono text-xs text-foreground">{val.toFixed(1)}%</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{f.model}</span><span className="text-border">·</span>
        <span>{term(f.region) || "—"}</span><span className="text-border">·</span>
        <span>ICD-10 {f.icd_code || "—"}</span>
      </div>
    </div>
  );
}

function Typewriter({ text, className }: { text: string; className?: string }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [text]);
  return <p className={className}>{out}<span className="inline-block h-3.5 w-0.5 translate-y-0.5 bg-primary glow-pulse" /></p>;
}
