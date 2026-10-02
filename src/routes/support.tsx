import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Heart,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support - XRayVision AI" }] }),
  component: SupportPage,
});

const faqs = [
  {
    q: "Why is my X-ray image being rejected?",
    a: "The system requires images in JPEG, PNG, or DICOM (.dcm) format with a minimum resolution of 200×200 pixels and maximum file size of 20 MB. Make sure your image is not blurry, corrupted, or incorrectly formatted. DICOM files bypass the pixel dimension check.",
  },
  {
    q: "Which scan type should I choose?",
    a: "Choose 'Chest Pathology' for chest X-rays (lungs, heart, rib cage). Choose 'Fracture Detection' for bone X-rays (hands, wrists, arms, legs, spine). Choose 'External Wound' for surface wound photos taken with a camera. Using the wrong type will route your image to the wrong AI model and produce inaccurate results.",
  },
  {
    q: "Why is the Urdu diet plan in English?",
    a: "The Urdu mode sends an Urdu language instruction to the AI model. If the LLM API key is missing, misconfigured, or the model fails to respond in Urdu, the system returns a validated English fallback plan. Check that the OPENROUTER_API_KEY is correctly set in the backend environment and that the selected model supports Urdu output.",
  },
  {
    q: "How do I export my scan report?",
    a: "Navigate to History or open a specific scan result. You will find 'Download PDF' and 'Export JSON' buttons in the report toolbar. PDF exports include the full clinical synthesis. JSON exports contain the raw structured data for developer use.",
  },
  {
    q: "Is this tool safe for clinical use?",
    a: "No. XRayVision AI is strictly an educational tool built as a Final Year Project (FYP). It is not a certified medical device, has not undergone clinical validation, and must not be used for diagnosis, treatment decisions, or patient care. Always consult a licensed clinician.",
  },
  {
    q: "Why does analysis take a long time?",
    a: "The first analysis after the backend starts can take 30–90 seconds because AI models need to load into memory (cold start). Subsequent analyses are significantly faster (5–15 seconds). If the backend is hosted on a free-tier service, it may go to sleep after inactivity and need time to wake up.",
  },
  {
    q: "Can I use my own X-ray images?",
    a: "Yes. You can upload your own medical images. For best results, use high-quality, properly-oriented images (at least 512×512 px recommended). DICOM files from hospitals are supported directly. JPEG/PNG exports from imaging software also work well.",
  },
  {
    q: "How do I reset my password?",
    a: "Click 'Forgot password?' on the login screen. Enter your registered email address and you will receive a reset link. If you do not receive the email within a few minutes, check your spam folder.",
  },
];

const team = [
  {
    name: "Muhammad Ali Raza",
    role: "Full Stack Developer",
    initials: "AR",
    id: "2022F-MUL-BSSWE-017",
    color: "bg-primary text-primary-foreground",
    desc: "Frontend development (React 19, TanStack Router/Query), API integration, Cloudflare Workers deployment, and overall system architecture.",
  },
  {
    name: "Hamza Afzal",
    role: "Backend & ML Engineer",
    initials: "HA",
    id: "2022F-MUL-BSSWE-027",
    color: "bg-emerald-600 text-white",
    desc: "FastAPI backend, AI model integration (DenseNet-121, YOLO26, ViT), OpenRouter LLM synthesis pipeline, and Supabase database design.",
  },
];

function SupportPage() {
  return (
    <AppShell title="Support">
      <div className="mx-auto max-w-4xl space-y-10">

        {/* Hero */}
        <header className="clinical-panel-strong p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LifeBuoy size={20} />
            </span>
            <p className="clinical-kicker">Support Center</p>
          </div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            How can we <span className="text-gradient-medical">help you?</span>
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground max-w-2xl">
            Find answers to common questions, learn how to use XRayVision AI, or reach out to the FYP team.
            Remember: this tool is for educational purposes only — always consult a licensed clinician for medical decisions.
          </p>
        </header>

        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: "Documentation", desc: "Read the full project docs", to: "/docs" },
            { icon: MessageSquare, label: "Health Chat", desc: "Ask the AI health chatbot", to: "/chat" },
            { icon: ShieldCheck, label: "Educational Only", desc: "Not for clinical diagnosis", to: null },
          ].map((item) => (
            <div key={item.label} className="clinical-panel p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon size={18} />
              </span>
              <p className="mt-3 text-sm font-bold">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              {item.to && (
                <Link
                  to={item.to}
                  className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Open →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Important Notice */}
        <div className="rounded-xl border border-warning/30 bg-warning/8 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-bold text-foreground">Educational Tool — Not for Clinical Use</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                XRayVision AI is a student Final Year Project (FYP) built for research and demonstration purposes.
                It has not been clinically validated and is not approved for medical diagnosis or treatment.
                Always consult a qualified doctor, radiologist, or licensed clinician for any medical concerns.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HelpCircle size={18} />
            </span>
            <h2 className="font-display text-2xl font-extrabold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-border bg-surface/40 p-5 cursor-pointer"
              >
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold list-none">
                  {faq.q}
                  <span className="ml-auto shrink-0 text-primary transition-transform group-open:rotate-45">
                    <HelpCircle size={16} />
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FYP Team */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users size={18} />
            </span>
            <h2 className="font-display text-2xl font-extrabold">FYP Team</h2>
          </div>
          <div className="clinical-panel-strong p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap size={18} className="text-primary" />
              <p className="text-sm font-bold">BSSE 8th Semester — Final Year Project (May 2026)</p>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              XRayVision AI was built as a Final Year Project at{" "}
              <strong className="text-foreground">Minhaj University Lahore</strong>, BSSE 8th Semester.
              Supervised by <strong className="text-foreground">Maam Misbah</strong> — Lecturer, School of Software Engineering.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {team.map((member) => (
              <div key={member.name} className="clinical-panel p-5 flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${member.color}`}>
                  {member.initials}
                </div>
                <div>
                  <p className="text-sm font-bold">{member.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{member.role}</p>
                  {(member as any).id && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{(member as any).id}</p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{member.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="clinical-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail size={18} />
            </span>
            <h2 className="font-display text-2xl font-extrabold">Contact & Guidance</h2>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            For academic inquiries, technical questions, or feedback about the FYP project, please reach
            out through your institution's communication channels or open a GitHub issue on the project
            repository.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <p className="text-xs font-bold text-foreground mb-1">Technical Issues</p>
              <p className="text-xs text-muted-foreground">
                If the AI analysis fails, images are rejected, or the backend is unreachable, check that the
                backend server is running and the API URL is correctly configured in the environment variables.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <p className="text-xs font-bold text-foreground mb-1">Academic Use</p>
              <p className="text-xs text-muted-foreground">
                Professors, supervisors, and evaluators: the full source code, training notebooks, and
                documentation are available in the project repository. Refer to the README for setup instructions.
              </p>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Heart size={12} className="text-primary" />
          <span>Built with passion by FYP students — Educational use only</span>
        </div>

      </div>
    </AppShell>
  );
}