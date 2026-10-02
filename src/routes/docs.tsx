import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Brain,
  ChevronRight,
  Database,
  FileImage,
  GitBranch,
  Info,
  Layers,
  ScanLine,
  Server,
  Stethoscope,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Documentation - XRayVision AI" }] }),
  component: DocsPage,
});

const sections = [
  { id: "overview", label: "Project Overview" },
  { id: "architecture", label: "System Architecture" },
  { id: "models", label: "AI Models" },
  { id: "workflow", label: "How It Works" },
  { id: "features", label: "Features" },
  { id: "tech-stack", label: "Technology Stack" },
  { id: "limitations", label: "Limitations" },
];

function DocsPage() {
  return (
    <AppShell title="Documentation">
      <div className="grid gap-8 xl:grid-cols-[220px_1fr]">
        {/* Sidebar TOC */}
        <aside className="hidden xl:block">
          <div className="clinical-panel-strong sticky top-28 p-4">
            <p className="clinical-kicker mb-3">On this page</p>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                  >
                    <ChevronRight size={12} />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="space-y-10 min-w-0">

          {/* Hero */}
          <header className="clinical-panel-strong p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen size={20} />
              </span>
              <p className="clinical-kicker">Documentation</p>
            </div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
              XRayVision <span className="text-gradient-medical">AI</span>
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground max-w-2xl">
              An AI-powered multi-model radiology assistant developed as a Final Year Project (FYP) for
              educational and research purposes. This system enables medical image analysis through a
              specialized ensemble of deep learning models.
            </p>
          </header>

          {/* Overview */}
          <section id="overview" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">Project Overview</h2>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                <strong className="text-foreground">XRayVision AI</strong> is a full-stack web application
                that uses multiple deep learning models to analyze medical images (X-rays, wound photos) and
                provide AI-generated clinical insights. It was built as a Final Year Project (FYP) to
                demonstrate practical applications of computer vision and NLP in the medical domain.
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The project solves a critical gap: medical students, researchers, and healthcare workers
                often lack quick access to analytical tools for preliminary insights on medical images.
                XRayVision AI bridges this gap with a structured multi-model pipeline that routes each
                image to the most appropriate AI model and generates a comprehensive, readable report.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Brain, label: "4 AI Models", desc: "Specialized models for each scan type" },
                  { icon: Zap, label: "Real-time", desc: "Fast inference with live progress feedback" },
                  { icon: Database, label: "Full History", desc: "All scans saved and exportable as PDF/JSON" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-surface/55 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <item.icon size={16} />
                    </span>
                    <p className="mt-3 text-sm font-bold">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">System Architecture</h2>
              </div>
              <p className="text-sm leading-7 text-muted-foreground mb-6">
                XRayVision AI follows a clean 3-tier architecture: a React frontend, a FastAPI Python backend,
                and a Supabase PostgreSQL database. All tiers communicate over HTTPS via a RESTful JSON API.
              </p>
              <div className="space-y-4">
                {[
                  {
                    layer: "Frontend — React + Vite",
                    icon: GitBranch,
                    color: "bg-blue-500/10 text-blue-400",
                    points: [
                      "React 18 + TypeScript + TanStack Router for client-side routing",
                      "TanStack Query for server state, caching and background sync",
                      "Vite build tool with fast hot module replacement (HMR)",
                      "Deployed on Vercel CDN for global low latency",
                    ],
                  },
                  {
                    layer: "Backend — FastAPI + Python",
                    icon: Server,
                    color: "bg-green-500/10 text-green-400",
                    points: [
                      "FastAPI for high-performance async REST API endpoints",
                      "PyTorch, Ultralytics YOLO, HuggingFace transformers for inference",
                      "OpenRouter API as LLM gateway for clinical synthesis reports",
                      "JWT authentication, bcrypt hashing, slowapi rate limiting",
                      "Deployed via Docker on Hugging Face Spaces / Render",
                    ],
                  },
                  {
                    layer: "Database — Supabase / PostgreSQL",
                    icon: Database,
                    color: "bg-purple-500/10 text-purple-400",
                    points: [
                      "PostgreSQL with Row Level Security (RLS) for user data isolation",
                      "Stores users, scan results, chat sessions, and analysis history",
                      "Images stored in Supabase Storage bucket",
                      "Schema managed via SQL migration scripts in the repository",
                    ],
                  },
                ].map((item) => (
                  <div key={item.layer} className="rounded-lg border border-border bg-surface/40 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-md ${item.color}`}>
                        <item.icon size={15} />
                      </span>
                      <p className="text-sm font-bold">{item.layer}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {item.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ChevronRight size={11} className="mt-0.5 shrink-0 text-primary/60" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI Models */}
          <section id="models" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Brain size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">AI Models</h2>
              </div>
              <p className="text-sm leading-7 text-muted-foreground mb-6">
                Each analysis type is handled by a specialized model trained for that domain, ensuring the
                highest accuracy per task.
              </p>
              <div className="space-y-4">
                {[
                  {
                    name: "DenseNet-121",
                    route: "Chest Pathology",
                    icon: Stethoscope,
                    badge: "Classification",
                    desc: "Pre-trained on NIH ChestX-ray14 dataset. Detects 14 chest conditions including Atelectasis, Cardiomegaly, Effusion, Infiltration, Pneumonia, and Pneumothorax. Outputs confidence probabilities per condition.",
                  },
                  {
                    name: "YOLO fracture profiles",
                    route: "Fracture Detection",
                    icon: Activity,
                    badge: "Object Detection",
                    desc: "Research profiles: YOLO26 for pediatric wrists and YOLOv8 for multi-region fracture candidates. Select the bone area explicitly. Both can miss fractures and mark normal structures. Scores are not diagnostic accuracy.",
                  },
                  {
                    name: "ViT (Vision Transformer)",
                    route: "External Wound",
                    icon: ScanLine,
                    badge: "Classification",
                    desc: "ViT-Base/16 fine-tuned on wound classification datasets. Categorizes wounds into: abrasion, burn, bruise, cut, or normal. Uses self-attention across image patches for high accuracy on photos.",
                  },
                  {
                    name: "OpenRouter LLM",
                    route: "Clinical Synthesis",
                    icon: Brain,
                    badge: "Language Model",
                    desc: "An LLM (Claude/Gemini/GPT-4o via OpenRouter) synthesizes raw model outputs into a structured clinical report with findings, severity assessment, recommendations, and educational disclaimer.",
                  },
                ].map((m) => (
                  <div key={m.name} className="rounded-lg border border-border bg-surface/40 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <m.icon size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-bold">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.route}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                        {m.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="workflow" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileImage size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">How It Works</h2>
              </div>
              <ol className="space-y-5">
                {[
                  {
                    step: "1",
                    title: "Upload a Medical Image",
                    desc: "Navigate to New Analysis and upload a JPEG, PNG, or DICOM (.dcm) file. The system accepts images up to 20 MB with a minimum resolution of 200×200 px for reliable inference.",
                  },
                  {
                    step: "2",
                    title: "Select Analysis Route",
                    desc: "Choose the scan type: Chest Pathology (DenseNet-121), Fracture Detection (YOLO), or External Wound (ViT). Selecting the correct route ensures the right specialized model runs on your image.",
                  },
                  {
                    step: "3",
                    title: "Add Context (Optional)",
                    desc: "Enter a patient/session label and clinical notes (e.g. 'pain after fall, swelling near wrist'). These notes are passed to the LLM for a more context-aware clinical synthesis.",
                  },
                  {
                    step: "4",
                    title: "AI Processing Pipeline",
                    desc: "The image is preprocessed (resize, normalize), passed through the selected AI model for inference, then raw predictions are forwarded to the LLM to generate a structured clinical report.",
                  },
                  {
                    step: "5",
                    title: "View & Export Results",
                    desc: "Results display detected findings with confidence scores, bounding box overlays (fracture mode), clinical synthesis, severity level, and recommended next steps. Export as PDF or JSON.",
                  },
                  {
                    step: "6",
                    title: "Manage History",
                    desc: "All scans are saved to your account and accessible via the History tab. Filter by scan type, view past reports, and delete scans you no longer need.",
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">Features</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Multi-model AI ensemble (DenseNet, YOLO, ViT, LLM)",
                  "Chest pathology classification — 14 conditions",
                  "Fracture localization with bounding boxes",
                  "External wound photo classification",
                  "AI-generated clinical synthesis reports",
                  "AI Health Chatbot — English & Urdu support",
                  "Personalized AI Diet Plan generator",
                  "Nearby Clinic finder via geolocation",
                  "Full scan history — PDF & JSON export",
                  "JWT authentication with role-based access",
                  "Dark mode interface optimized for clinical use",
                  "Educational disclaimers and safety guardrails",
                ].map((feat) => (
                  <div key={feat} className="flex items-start gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-xs text-muted-foreground">{feat}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section id="tech-stack" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">Technology Stack</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { cat: "Frontend", items: ["React 18", "TypeScript", "TanStack Router", "TanStack Query", "Vite", "Vanilla CSS"] },
                  { cat: "Backend", items: ["Python 3.11+", "FastAPI", "PyTorch", "Ultralytics YOLO", "HuggingFace transformers", "httpx"] },
                  { cat: "AI / LLM", items: ["DenseNet-121", "YOLO fracture profiles (fracture fine-tuned)", "ViT-Base/16", "OpenRouter API", "Claude / Gemini / GPT-4o"] },
                  { cat: "Database", items: ["Supabase", "PostgreSQL", "Row Level Security", "Supabase Storage"] },
                  { cat: "Auth & Security", items: ["JWT Bearer Tokens", "bcrypt hashing", "HTTPS / TLS", "Rate limiting (slowapi)"] },
                  { cat: "Deployment", items: ["Vercel (frontend)", "Hugging Face Spaces", "Render (backend)", "Docker", "GitHub Actions"] },
                ].map((group) => (
                  <div key={group.cat} className="rounded-lg border border-border bg-surface/40 p-4">
                    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">{group.cat}</p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-primary/50" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Limitations */}
          <section id="limitations" className="scroll-mt-24">
            <div className="clinical-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Info size={18} />
                </span>
                <h2 className="font-display text-2xl font-extrabold">Limitations & Disclaimer</h2>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/8 px-5 py-4 text-sm text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">Educational Use Only.</strong> XRayVision AI is a Final Year
                  Project for educational and research purposes. It is not a certified medical device and must not
                  be used for clinical diagnosis, treatment decisions, or patient care.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "AI outputs may contain errors — always verify with a licensed clinician.",
                    "Model accuracy depends on image quality. Blurry or low-res images reduce reliability.",
                    "The system may exhibit bias toward training dataset demographics.",
                    "Diet plans are educational guidance, not a substitute for a registered dietitian.",
                    "The chatbot provides general health info only, not a substitute for medical consultation.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}