import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AdSlot } from "../components/AdSlot";
import { Film, Zap, Globe2, Shield, Clapperboard, Tv, Download } from "lucide-react";

const STATS = [
  { value: "50K+", label: "Titles indexed" },
  { value: "24/7", label: "Uptime focus" },
  { value: "0 ₦", label: "Subscription" },
  { value: "HD", label: "Stream & DL" },
];

const PILLARS = [
  {
    icon: Clapperboard,
    title: "Movies",
    desc: "Theatrical hits, classics, and new releases — discover and grab files when available.",
  },
  {
    icon: Tv,
    title: "Series",
    desc: "K-Drama, C-Drama, Western TV and more, with episode-level watch and download.",
  },
  {
    icon: Film,
    title: "Anime",
    desc: "Japanese animation only — seasons and episodes without cartoon clutter.",
  },
  {
    icon: Download,
    title: "Direct downloads",
    desc: "When sources allow, we resolve a real file link so you are not stuck in loops.",
  },
];

export function About() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero + 3D-style stage */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-background to-background" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-5xl relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Film className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                About MovieNet
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white leading-[1.05] mb-6">
              Built for people who{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-300">
                actually watch
              </span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              MovieNet is a free, ad-supported hub for movies, series, and anime.
              Fast browse, clear watch servers, and direct downloads when sources
              are online — no subscription wall.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-8 font-bold">
                <Link href="/">Start browsing</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8 font-bold border-white/10 text-white">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </div>

          {/* CSS 3D orbit */}
          <div className="relative h-72 md:h-80 flex items-center justify-center perspective-[800px]">
            <div
              className="relative w-48 h-48 md:w-56 md:h-56"
              style={{ transformStyle: "preserve-3d", animation: "mn-spin 18s linear infinite" }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `rotateY(${i * 60}deg) translateZ(110px)`,
                  }}
                >
                  <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-violet-500/80 to-zinc-900 border border-white/20 shadow-xl shadow-violet-900/40" />
                </div>
              ))}
              <div className="absolute inset-0 m-auto w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 border border-white/20">
                <span className="font-display font-black text-white text-2xl">M</span>
              </div>
            </div>
            <style>{`
              @keyframes mn-spin {
                from { transform: rotateY(0deg); }
                to { transform: rotateY(360deg); }
              }
            `}</style>
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <p className="text-3xl font-display font-black text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-5xl py-6">
        <AdSlot />
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-display font-bold text-white mb-8">What you get</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-primary/30 transition-colors"
              >
                <p.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-white font-bold mb-1">{p.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-4">
          <div className="flex justify-center gap-6 text-zinc-500">
            <Zap className="w-5 h-5" />
            <Globe2 className="w-5 h-5" />
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">Free by design</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            MovieNet is supported by ads, not subscriptions. We are not affiliated
            with studios or official distributors. Use content responsibly and
            respect local laws.
          </p>
        </div>
      </section>
    </div>
  );
}
