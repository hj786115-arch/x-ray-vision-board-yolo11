import {
  Activity,
  ArrowRight,
  Bone,
  Brain,
  Check,
  Cpu,
  FileText,
  MapPin,
  MessageSquare,
  Play,
  Salad,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Upload,
} from "lucide-react";
import { Logo } from "./Logo";
import { Hero3D } from "./Hero3D";
import { Reveal } from "./Reveal";

export function Landing() {
  return (
    <div className="clinical-page relative min-h-dvh overflow-hidden text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-45" />
      <Nav />
      <Hero />
      <Capabilities />
      <Workflow />
      <ReportPreview />
      <TrustBand />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/84 backdrop-blur-xl dark:bg-background/84">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex min-h-11 items-center gap-3">
          <Logo size={30} />
          <span className="font-display text-lg font-extrabold">
            XRayVision <span className="text-gradient-medical">AI</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
          <a href="#capabilities" className="hover:text-foreground">Capabilities</a>
          <a href="#workflow" className="hover:text-foreground">Workflow</a>
          <a href="#report" className="hover:text-foreground">Report</a>
          <a href="#trust" className="hover:text-foreground">Stack</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/auth/login" className="clinical-button-secondary hidden px-4 sm:inline-flex">
            Sign in
          </a>
          <a href="/auth/register" className="clinical-button px-4">
            Get started
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[0.98fr_1.02fr] lg:pb-24 lg:pt-16">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-white/85 px-3 py-2 shadow-[var(--shadow-sm)] dark:bg-card/85">
          <span className="h-2 w-2 rounded-full bg-success glow-pulse" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            AI radiology assistant
          </span>
        </div>

        <h1 className="mt-6 max-w-4xl font-display text-5xl font-extrabold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
          XRayVision AI for faster, clearer diagnostic review.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload medical images, route them through specialized AI models, and receive a
          confidence-tiered report with findings, urgency, specialist guidance, and exportable records.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="/auth/register" className="clinical-button px-6">
            <ScanLine size={18} />
            Start analysis
            <ArrowRight size={16} />
          </a>
          <a href="#workflow" className="clinical-button-secondary px-6">
            <Play size={16} />
            See workflow
          </a>
        </div>

        <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            ["Chest", "DenseNet121"],
            ["Fracture", "YOLO11"],
            ["Wound", "ViT classifier"],
          ].map(([label, value]) => (
            <div key={label} className="clinical-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="clinical-panel-strong overflow-hidden p-3">
          <div className="relative aspect-[1.03] overflow-hidden rounded-lg bg-slate-950">
            <Hero3D />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,11,20,0.35))]" />
            <div className="absolute left-4 top-4 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">Active scan</p>
              <p className="mt-1 text-sm font-bold">Fracture localization</p>
            </div>
            <div className="absolute bottom-4 right-4 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">Confidence</p>
              <p className="mt-1 text-2xl font-extrabold">94.2%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const capabilities = [
  { icon: Bone, title: "Fracture detection", text: "Detect and localize suspected bone fractures with bounding boxes and severity tiers." },
  { icon: Stethoscope, title: "Chest pathology", text: "Screen chest X-rays for high-signal findings across common pathology classes." },
  { icon: MessageSquare, title: "Health chat", text: "Ask symptom questions in a guided assistant with home-care and specialist suggestions." },
  { icon: Salad, title: "Diet planner", text: "Generate condition-aware meal plans using goals, preferences, and restrictions." },
  { icon: MapPin, title: "Clinic locator", text: "Find hospitals, doctors, clinics, and pharmacies near the user's current location." },
  { icon: ShieldCheck, title: "Safety framing", text: "Every flow reinforces educational use and radiologist confirmation." },
];

function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-7xl px-4 py-18 sm:px-6">
      <Reveal className="max-w-2xl">
        <p className="clinical-kicker">Capabilities</p>
        <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
          Designed around the full diagnostic support journey.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map(({ icon: Icon, title, text }, index) => (
          <Reveal key={title} delay={index * 55}>
            <article className="clinical-panel h-full p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={21} />
              </span>
              <h3 className="mt-5 text-base font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { icon: Upload, title: "Upload", text: "DICOM, PNG, or JPG." },
  { icon: ScanLine, title: "Route", text: "Choose chest, fracture, or wound." },
  { icon: Cpu, title: "Infer", text: "Run the matching model." },
  { icon: Brain, title: "Synthesize", text: "Generate clinical summary." },
  { icon: FileText, title: "Export", text: "Download PDF or JSON." },
];

function Workflow() {
  return (
    <section id="workflow" className="border-y border-border bg-white/72 dark:bg-background/46">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="clinical-kicker">Workflow</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            A transparent path from image to report.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 65}>
              <div className="clinical-panel relative h-full p-5">
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">0{index + 1}</span>
                <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-primary">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-sm font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportPreview() {
  return (
    <section id="report" className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-18 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Reveal>
        <p className="clinical-kicker">Report experience</p>
        <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
          Findings stay inspectable, not hidden behind a black box.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          The results page separates primary, secondary, and borderline findings,
          keeps confidence visible, and links urgency to practical next steps.
        </p>
        <ul className="mt-7 space-y-3">
          {[
            "Model, confidence, region, and ICD-10 metadata",
            "Optional heatmap and bounding-box overlays",
            "Specialist recommendation and nearby-care path",
            "Watermarked PDF export for review",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-medium text-foreground">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-success/12 text-success">
                <Check size={13} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={110}>
        <div className="clinical-panel-strong p-4">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning">Urgency</p>
                <p className="mt-1 text-2xl font-extrabold text-warning">HIGH</p>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">scan_8F23A9</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <FindingRow name="Distal radius fracture" confidence={94.2} severity="high" />
            <FindingRow name="Soft tissue swelling" confidence={67.8} severity="moderate" />
            <FindingRow name="Cortical irregularity" confidence={54.1} severity="low" />
          </div>
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Brain size={15} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">Agent synthesis</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Findings suggest a high-confidence fracture pattern. Orthopedic review,
              immobilization, and correlation with clinical history are recommended.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function FindingRow({ name, confidence, severity }: { name: string; confidence: number; severity: string }) {
  const color = severity === "high" ? "bg-destructive" : severity === "moderate" ? "bg-warning" : "bg-info";
  return (
    <div className="rounded-lg border border-border bg-white/85 p-3 dark:bg-card/85">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{name}</span>
        <span className="font-mono text-xs">{confidence.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${confidence}%` }} />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{severity}</p>
    </div>
  );
}

function TrustBand() {
  return (
    <section id="trust" className="border-y border-border bg-white/72 dark:bg-background/46">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
        {[
          ["700K+", "clinical images behind chest model"],
          ["3", "specialized image routes"],
          ["4", "report fields for action"],
          ["v2.1", "current platform version"],
        ].map(([value, label]) => (
          <div key={label} className="border-l-2 border-primary pl-4">
            <p className="font-display text-4xl font-extrabold text-gradient-medical">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6">
      <Reveal>
        <div className="clinical-panel-strong grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="clinical-kicker">Ready when you are</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              Start with an image, finish with a structured report.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Built for educational diagnostic assistance and guided review workflows.
            </p>
          </div>
          <a href="/auth/register" className="clinical-button px-6">
            Create account
            <ArrowRight size={16} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-white/80 dark:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-7 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="font-display text-sm font-extrabold">XRayVision AI</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">v2.1</span>
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity size={14} className="text-primary" />
          2026 XRayVision AI. Educational use only.
        </span>
      </div>
    </footer>
  );
}
