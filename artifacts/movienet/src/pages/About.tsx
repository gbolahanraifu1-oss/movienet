import { AdSlot } from "../components/AdSlot";
import { Film, Zap, Shield, Globe, Users, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Titles Available", value: "50,000+" },
  { label: "Monthly Visitors", value: "2M+" },
  { label: "Countries Served", value: "190+" },
  { label: "Languages", value: "42" },
];

const VALUES = [
  {
    icon: Zap,
    title: "Free Forever",
    desc: "No subscriptions, no paywalls. MovieNet is ad-supported so you can discover, browse, and download without spending a dime.",
  },
  {
    icon: Globe,
    title: "Global Library",
    desc: "Movies, anime, and sports from every corner of the world — Hollywood blockbusters, J-drama, K-dramas, Nollywood, Bollywood, and beyond.",
  },
  {
    icon: Shield,
    title: "Safe & Transparent",
    desc: "We don't host files. Every download link points to a third-party torrent. We're a discovery layer, not a piracy engine.",
  },
  {
    icon: Users,
    title: "Built for Gen Z",
    desc: "Dark by default. Fast. Mobile-first. No bloat. We built the streaming discovery experience we actually wanted to use.",
  },
];

const TEAM = [
  { name: "𝙼𝙰𝙳𝙰𝚁𝙰𝐃𝐄𝐕", role: "Founder & Product", avatar: "♕𝙼" },
  { name: "Dev Team", role: "Engineering", avatar: "D" },
  { name: "Design Crew", role: "UI / UX", avatar: "✦" },
];

export function About() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 pb-24 pt-28">
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-0 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[100px]" />

        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">About MovieNet</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-display font-black text-white leading-[1.05] mb-6">
            The internet's <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
              free movie hub
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mb-10">
            MovieNet is a free, ad-supported discovery platform for movies, anime, and sports.
            We aggregate titles from across the web so you can find, explore, and grab what you
            actually want to watch — without a credit card.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild className="rounded-full px-8 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
              <Link href="/">Start Browsing</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-8 font-bold border-white/10 hover:bg-white/5 text-white">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center gap-1 p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
                <span className="text-3xl md:text-4xl font-display font-black text-white">{s.value}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad */}
      <div className="container mx-auto px-4 max-w-5xl">
        <AdSlot />
      </div>

      {/* Mission / Values */}
      <section className="py-20 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">What we stand for</h2>
            <p className="text-zinc-400 max-w-xl">
              We're not Netflix. We're not a streaming service. We're the curation layer that makes finding content feel fast and fun again.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-primary/20 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{v.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">The team</h2>
            <p className="text-zinc-400">Small team. Big ambitions. Built with a lot of caffeine and way too many late nights.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {TEAM.map((t) => (
              <div key={t.name} className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-lg shadow-primary/20">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-bold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Heart className="w-10 h-10 text-primary mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">Made for the love of film</h2>
          <p className="text-zinc-400 mb-8">
            Questions, feedback, or just want to say hi? We actually read every message.
          </p>
          <Button asChild className="rounded-full px-10 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
