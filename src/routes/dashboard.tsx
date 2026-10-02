import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bone,
  Clock,
  FileText,
  ScanLine,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useStats } from "@/hooks/use-scans";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - XRayVision AI" }] }),
  component: Dashboard,
});

const urgencyStyle: Record<string, string> = {
  review: "bg-warning/14 text-warning border-warning/30",
  critical: "bg-destructive/12 text-destructive border-destructive/25",
  high: "bg-destructive/12 text-destructive border-destructive/25",
  medium: "bg-warning/14 text-warning border-warning/30",
  low: "bg-info/12 text-info border-info/25",
  clear: "bg-success/12 text-success border-success/25",
};

function Dashboard() {
  const { user } = useAuth();
  const { t, term, formatDate } = useLanguage();
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <AppShell title="Dashboard" titleKey="nav.dashboard">
        <div className="space-y-5">
          <div className="clinical-panel-strong p-6">
            <div className="premium-skeleton h-3 w-36" />
            <div className="premium-skeleton mt-4 h-10 w-full max-w-xl" />
            <div className="premium-skeleton mt-4 h-4 w-full max-w-2xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="clinical-panel p-5">
                <div className="premium-skeleton h-3 w-28" />
                <div className="premium-skeleton mt-4 h-9 w-24" />
                <div className="premium-skeleton mt-4 h-3 w-36" />
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="clinical-panel p-5">
              <div className="premium-skeleton h-6 w-48" />
              <div className="mt-5 space-y-3">
                {[0, 1, 2, 3, 4].map((item) => <div key={item} className="premium-skeleton h-10 w-full" />)}
              </div>
            </div>
            <div className="clinical-panel p-5">
              <div className="premium-skeleton h-6 w-44" />
              <div className="mt-5 space-y-4">
                {[0, 1, 2, 3].map((item) => <div key={item} className="premium-skeleton h-8 w-full" />)}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const displayName = user?.full_name || t("dash.doctor");
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? "dash.morning" : hour < 17 ? "dash.afternoon" : "dash.evening");
  const totalScans = stats?.total_scans ?? 0;
  const criticalFindings = stats?.critical_findings ?? 0;
  const avgConfidence = stats?.avg_confidence ?? 0;
  const avgTime = stats?.avg_report_time ?? 0;
  const recentScans = stats?.recent_scans ?? [];
  const distEntries = Object.entries(stats?.finding_distribution ?? {}).slice(0, 5);
  const models = stats?.model_performance ?? [];

  const statCards = [
    { label: t("dash.stat.total"), value: totalScans.toLocaleString(), icon: ScanLine, color: "text-primary", helper: t("dash.stat.totalHelp") },
    { label: t("dash.stat.urgent"), value: String(criticalFindings), icon: AlertTriangle, color: "text-destructive", helper: t("dash.stat.urgentHelp") },
    { label: t("dash.stat.conf"), value: `${avgConfidence}%`, icon: Target, color: "text-success", helper: t("dash.stat.confHelp") },
    { label: t("dash.stat.time"), value: `${avgTime}s`, icon: Clock, color: "text-info", helper: t("dash.stat.timeHelp") },
  ];

  return (
    <AppShell title="Dashboard" titleKey="nav.dashboard">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="clinical-panel-strong premium-card p-6">
          <p className="clinical-kicker">{t("dash.kicker")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            {greeting}{t("common.comma")} {displayName}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("dash.intro")}
          </p>
        </div>
        <Link to="/analyze" className="clinical-button min-w-52 px-5 self-stretch lg:self-center">
          <ScanLine size={17} />
          {t("nav.analyze")}
          <ArrowRight size={16} className="rtl-flip" />
        </Link>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div key={card.label} className="clinical-panel premium-card p-5 animate-fade-up" style={{ animationDelay: `${index * 45}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{card.label}</p>
                <p className="mt-2 font-display text-3xl font-extrabold">{card.value}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg bg-surface ${card.color}`}>
                <card.icon size={19} />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{card.helper}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="clinical-panel premium-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold">{t("dash.recent.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("dash.recent.sub")}</p>
            </div>
            <Link to="/history" className="clinical-button-secondary px-3">
              {t("dash.viewAll")}
              <ArrowRight size={14} className="rtl-flip" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {recentScans.length > 0 ? (
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="py-3 pe-4">{t("dash.col.scan")}</th>
                    <th className="py-3 pe-4">{t("dash.col.type")}</th>
                    <th className="py-3 pe-4">{t("dash.col.findings")}</th>
                    <th className="py-3 pe-4">{t("dash.col.urgency")}</th>
                    <th className="py-3 pe-4">{t("dash.col.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="border-b border-border/70 transition-colors hover:bg-surface/70 last:border-0">
                      <td className="py-3 pe-4">
                        <Link to="/results/$scanId" params={{ scanId: scan.id }} className="font-mono text-xs font-semibold text-primary hover:underline">
                          {scan.id.slice(0, 10)}
                        </Link>
                      </td>
                      <td className="py-3 pe-4 capitalize">{term(scan.scan_type)}</td>
                      <td className="py-3 pe-4">{scan.findings_count}</td>
                      <td className="py-3 pe-4">
                        <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${urgencyStyle[scan.urgency] || urgencyStyle.clear}`}>
                          {scan.scan_type === "fracture" && scan.urgency === "clear" ? "No fracture detected by AI" : scan.scan_type === "fracture" && scan.urgency === "review" ? "Review recommended" : term(scan.urgency)}
                        </span>
                      </td>
                      <td className="py-3 pe-4 text-xs text-muted-foreground">{formatDate(scan.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
                <FileText size={28} className="mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">{t("dash.empty.title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("dash.empty.body")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="clinical-panel premium-card p-5">
          <h3 className="text-lg font-extrabold">{t("dash.dist.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("dash.dist.sub")}</p>
          {distEntries.length > 0 ? (
            <div className="mt-5 space-y-3">
              {distEntries.map(([label, count], index) => {
                const max = Math.max(...distEntries.map(([, value]) => value), 1);
                return (
                  <div key={label}>
                    <div className="mb-1.5 flex justify-between gap-3 text-xs">
                      <span className="font-semibold">{term(label)}</span>
                      <span className="font-mono text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(8, (count / max) * 100)}%`, opacity: 1 - index * 0.08 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border bg-surface/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {t("dash.dist.empty")}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 clinical-panel premium-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold">{t("dash.models.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("dash.models.sub")}</p>
          </div>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 text-xs font-bold text-success">
            <TrendingUp size={14} />
            {t("dash.operational")}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(models.length > 0 ? models : [
            { name: "DenseNet121", task: "Chest pathology", auc: 0.847, color: "bg-primary" },
            { name: "Fracture YOLO", task: "Fracture detection", auc: 0, color: "bg-secondary" },
            { name: "ViT", task: "Wound classification", auc: 0.823, color: "bg-info" },
          ]).map((model) => {
            const Icon = model.name === "DenseNet121" ? Stethoscope : model.name === "Fracture YOLO" ? Bone : Activity;
            return (
              <div key={model.name} className="rounded-lg border border-border bg-card p-4 interaction-lift">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-primary" />
                    <span className="text-sm font-extrabold">{model.name}</span>
                  </div>
                  <span className="font-mono text-xs">{model.name === "Fracture YOLO" && model.auc === 0 ? "—" : `${(model.auc * 100).toFixed(1)}%`}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{term(model.task)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                  <div className={`h-full ${model.color}`} style={{ width: `${model.auc * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
