import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Layout from "./components/Layout";
import { Home } from "./pages/Home";
import { Movies } from "./pages/Movies";
import { Anime } from "./pages/Anime";
import { Sports } from "./pages/Sports";
import { Trending } from "./pages/Trending";
import { Browse } from "./pages/Browse";
import { TitleDetail } from "./pages/TitleDetail";
import { Calendar } from "./pages/Calendar";
import { Subscription } from "./pages/Subscription";
import { DownloadPage } from "./pages/Download";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Fall back to same-origin proxy path so VITE_CLERK_PROXY_URL is optional
// on Vercel (the proxy endpoint is always at /api/__clerk on the same domain).
const clerkProxyUrl =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  `${window.location.origin}/api/__clerk`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(262, 83%, 58%)",
    colorForeground: "hsl(210, 40%, 96%)",
    colorMutedForeground: "hsl(215, 20%, 55%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(220, 40%, 7%)",
    colorInput: "hsl(220, 30%, 12%)",
    colorInputForeground: "hsl(210, 40%, 96%)",
    colorNeutral: "hsl(220, 30%, 15%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-xl w-[440px] max-w-full overflow-hidden border border-border/50 shadow-2xl shadow-primary/10",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-display font-bold text-2xl tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/80 font-medium transition-colors",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-card px-2",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-500",
    alertText: "text-foreground",
    logoBox: "mb-6",
    logoImage: "w-12 h-12 object-contain",
    socialButtonsBlockButton: "border-border/50 hover:bg-white/5 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20",
    formFieldInput: "bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50",
    footerAction: "mt-4",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive/20",
    otpCodeFieldInput: "bg-input border-border focus:border-primary text-foreground",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to MovieNet",
            subtitle: "Sign in to access your watchlists and track sports.",
          },
        },
        signUp: {
          start: {
            title: "Join MovieNet",
            subtitle: "Create an account to start tracking what you watch.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route>
            <Layout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/movies" component={Movies} />
                <Route path="/anime" component={Anime} />
                <Route path="/sports" component={Sports} />
                <Route path="/trending" component={Trending} />
                <Route path="/browse" component={Browse} />
                <Route path="/title/:type/:id">
                  {(params) => <TitleDetail type={params.type as any} id={params.id} />}
                </Route>
                <Route path="/calendar" component={Calendar} />
                <Route path="/subscription" component={Subscription} />
                <Route path="/download" component={DownloadPage} />
                <Route>
                  <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
                    <h1 className="text-4xl font-display font-bold text-foreground mb-4">404 - Not Found</h1>
                    <p className="text-muted-foreground max-w-md">The page you're looking for doesn't exist or has been moved.</p>
                  </div>
                </Route>
              </Switch>
            </Layout>
          </Route>
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
