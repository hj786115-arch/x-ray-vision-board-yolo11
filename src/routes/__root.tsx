import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LanguageProvider, type Lang } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "XRayVision AI — See Beyond the Surface" },
      { name: "description", content: "AI-powered radiology assistant with multi-model ensemble for chest pathology, fracture detection, and wound classification." },
      { name: "author", content: "XRayVision AI" },
      { property: "og:title", content: "XRayVision AI — See Beyond the Surface" },
      { property: "og:description", content: "AI-powered radiology assistant. Diagnose with precision using a multi-model ensemble." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@XRayVisionAI" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalizedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Sits inside AuthProvider so the language provider can pick up the language
 * saved on the signed-in profile.
 */
function LocalizedApp() {
  const { user, updateSettings } = useAuth();

  // Persist every language switch to the profile, not just the one made from
  // the Settings page's "Save" button — otherwise the choice only lives in
  // localStorage and the next login restores whatever was last explicitly
  // saved, which is why the app kept coming back up in Urdu.
  const handleLanguageChange = useCallback(
    (next: Lang) => {
      if (!user) return;
      updateSettings({ ...user.settings, language: next }).catch(() => {});
    },
    [user, updateSettings],
  );

  return (
    <LanguageProvider profileLanguage={user?.settings?.language} onChange={handleLanguageChange}>
      <Outlet />
    </LanguageProvider>
  );
}
