import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bone,
  CheckCircle2,
  FileImage,
  Info,
  Loader2,
  ScanLine,
  Sparkles,
  Stethoscope,
  UploadCloud,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field } from "@/components/ui-x/Field";
import { useAnalyze } from "@/hooks/use-analyze";
import { useLanguage, type StringKey } from "@/lib/i18n";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "New Analysis - XRayVision AI" }] }),
  component: AnalyzePage,
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MIN_DIMENSION = 200; // px per side
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".dcm"];

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read image dimensions."));
    };
    img.src = url;
  });
}

async function validateImageFile(
  file: File,
  format: (key: StringKey, vars: Record<string, string | number>) => string,
): Promise<string | null> {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  const isDicom = ext === ".dcm";

  if (!isDicom && !ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return format("an.err.format", {});
  }

  if (file.size > MAX_FILE_SIZE) {
    return format("an.err.size", { size: (file.size / 1024 / 1024).toFixed(1) });
  }

  if (!isDicom) {
    try {
      const { width, height } = await getImageDimensions(file);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        return format("an.err.resolution", { w: width, h: height, min: MIN_DIMENSION });
      }
    } catch {
      return format("an.err.dimensions", {});
    }
  }

  return null;
}

const types = [
  { id: "auto", labelKey: "an.type.auto", textKey: "an.type.autoText", modelKey: "an.type.autoModel", icon: Sparkles },
  { id: "chest", labelKey: "an.type.chest", textKey: "an.type.chestText", model: "DenseNet121", icon: Stethoscope },
  { id: "fracture", labelKey: "an.type.fracture", textKey: "an.type.fractureText", model: "YOLO11", icon: Bone },
  { id: "wound", labelKey: "an.type.wound", textKey: "an.type.woundText", model: "ViT", icon: Activity },
] as const satisfies readonly {
  id: string; labelKey: StringKey; textKey: StringKey; model?: string; modelKey?: StringKey; icon: typeof Bone;
}[];

function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [type, setType] = useState<(typeof types)[number]["id"]>("auto");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const { t, format } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyze();

  const acceptFile = useCallback(async (candidate: File) => {
    setFileError(null);
    const error = await validateImageFile(candidate, format);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFile(candidate);
  }, [format]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDrag(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  }, [acceptFile]);

  const onPick = (pickedFile: File | undefined | null) => {
    if (pickedFile) acceptFile(pickedFile);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    analyzeMutation.mutate(
      { file, scanType: type, sessionLabel: label || undefined, notes: notes || undefined },
      {
        onSuccess: (result) => {
          navigate({ to: "/results/$scanId", params: { scanId: result.id } });
        },
      },
    );
  };

  if (analyzeMutation.isPending) return <Processing />;

  const modelName = (item: (typeof types)[number]) => ("modelKey" in item ? t(item.modelKey) : item.model);

  if (analyzeMutation.isError) {
    return (
      <AppShell title="Analysis Error" titleKey="an.errorTitle">
        <div className="mx-auto max-w-2xl clinical-panel-strong p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle size={26} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold">{t("an.failed")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{analyzeMutation.error.message}</p>
          <button onClick={() => analyzeMutation.reset()} className="clinical-button mt-6 px-6">
            {t("an.tryAgain")}
          </button>
        </div>
      </AppShell>
    );
  }

  const activeType = types.find((item) => item.id === type)!;

  return (
    <AppShell title="New Analysis" titleKey="an.title">
      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <aside className="clinical-panel-strong h-fit p-6">
          <p className="clinical-kicker">{t("an.kicker")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">{t("an.heading")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("an.intro")}
          </p>

          <div className="mt-6 space-y-3">
            {types.map((item, index) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold">{t(item.labelKey)}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(item.textKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={onSubmit} className="clinical-panel p-5 sm:p-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.dcm"
            className="hidden"
            onChange={(event) => onPick(event.target.files?.[0])}
          />

          <div>
            <p className="clinical-kicker">{t("an.step1")}</p>
            <h3 className="mt-2 text-xl font-extrabold">{t("an.uploadImage")}</h3>
          </div>

          {!file ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-all ${
                  fileError
                    ? "border-destructive/60 bg-destructive/4"
                    : drag
                    ? "border-primary bg-primary/6 shadow-[var(--glow-cyan)]"
                    : "border-border bg-surface/55 hover:border-primary/45 hover:bg-card"
                }`}
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-lg ${fileError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <UploadCloud size={30} />
                </span>
                <span className="mt-5 text-lg font-extrabold">{drag ? t("an.dropActive") : t("an.dropIdle")}</span>
                <span className="mt-1 text-sm text-muted-foreground">{t("an.browse")}</span>
                <span className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t("an.limits")}
                </span>
              </button>

              {fileError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface/55 px-4 py-3 text-xs text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0 text-primary/70" />
                <span>
                  <strong className="text-foreground">{t("an.qualityTitle")}</strong> {t("an.qualityBody")}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/6 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                    <FileImage size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{file.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {t("an.ready")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <button type="button" onClick={() => { setFile(null); setFileError(null); }} aria-label={t("an.removeFile")} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-destructive">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7">
            <p className="clinical-kicker">{t("an.step2")}</p>
            <h3 className="mt-2 text-xl font-extrabold">{t("an.routeTitle")}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {types.map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setType(item.id)}
                    className={`min-h-[150px] rounded-lg border p-4 text-start transition-all ${
                      active ? "border-primary bg-primary text-primary-foreground shadow-[var(--glow-cyan)]" : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <Icon size={20} />
                    <p className="mt-4 text-sm font-extrabold">{t(item.labelKey)}</p>
                    <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.1em] ${active ? "text-primary-foreground/78" : "text-muted-foreground"}`}>
                      {modelName(item)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <p className="clinical-kicker">{t("an.step3")}</p>
            <h3 className="mt-2 text-xl font-extrabold">{t("an.contextTitle")}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={t("an.label")} name="label" placeholder="PT-4821" value={label} onChange={(event) => setLabel(event.target.value)} />
              <Field label={t("an.notes")} name="notes" placeholder={t("an.notesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 rounded-lg border border-border bg-surface/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-primary">
                <activeType.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">{t(activeType.labelKey)}</p>
                <p className="text-xs text-muted-foreground">{modelName(activeType)} {t("an.routeSelected")}</p>
              </div>
            </div>
            <button type="submit" disabled={!file} className="clinical-button px-6 disabled:cursor-not-allowed disabled:opacity-45">
              <ScanLine size={17} />
              {t("an.analyze")}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

const processingSteps = [
  "an.step.normalize",
  "an.step.route",
  "an.step.infer",
  "an.step.synth",
  "an.step.save",
] as const satisfies readonly StringKey[];

function Processing() {
  const { t } = useLanguage();
  return (
    <AppShell title="Processing" titleKey="an.processingTitle">
      <div className="mx-auto max-w-4xl">
        <header className="clinical-panel-strong p-6 text-center">
          <p className="clinical-kicker">{t("an.processing.kicker")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">{t("an.processing.heading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("an.processing.sub")}</p>
        </header>

        <div className="relative mt-5 overflow-hidden rounded-lg border border-border bg-slate-950 aspect-video">
          <div className="absolute inset-0 grid-bg opacity-25" />
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-cyan-100 backdrop-blur-md">
              <Loader2 size={28} className="animate-spin" />
            </div>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2" aria-live="polite">
          {processingSteps.map((step) => (
            <li key={step} className="clinical-panel flex items-center gap-3 p-4 text-sm">
              <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
              <span>{t(step)}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
