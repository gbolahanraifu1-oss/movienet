import { useState } from "react";
import { AdSlot } from "../components/AdSlot";
import { Mail, MessageSquare, Bug, Megaphone, Send, CheckCircle2, MapPin, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";

type Category = "general" | "dmca" | "bug" | "partnership";

const CATEGORIES: { id: Category; icon: typeof Mail; label: string; desc: string }[] = [
  { id: "general",     icon: MessageSquare, label: "General Inquiry",   desc: "Questions, feedback, anything else" },
  { id: "dmca",        icon: Megaphone,     label: "DMCA / Copyright",  desc: "Report infringing content" },
  { id: "bug",         icon: Bug,           label: "Bug Report",        desc: "Something broken? Tell us" },
  { id: "partnership", icon: Mail,          label: "Partnership",       desc: "Ads, collabs, business enquiries" },
];

export function Contact() {
  const [category, setCategory] = useState<Category>("general");
  const [form, setForm]         = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = (await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category }),
      })) as unknown as {
        ok: boolean;
        status: number;
        json: () => Promise<any>;
      };

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 pt-28 pb-16">
        <div className="pointer-events-none absolute -top-40 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Contact</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">Get in touch</h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            We're a small team and we actually read everything. Drop us a message — we usually reply within 24 hours.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-5xl py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5">
              <Clock className="w-5 h-5 text-primary mb-3" />
              <p className="font-semibold text-white mb-1">Response time</p>
              <p className="text-sm text-zinc-400">Usually within 24 hours. DMCA requests handled within 48 hours.</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5">
              <MapPin className="w-5 h-5 text-primary mb-3" />
              <p className="font-semibold text-white mb-1">Based online</p>
              <p className="text-sm text-zinc-400">We're fully remote, spread across multiple time zones.</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5">
              <Mail className="w-5 h-5 text-primary mb-3" />
              <p className="font-semibold text-white mb-1">Direct email</p>
              <a href="mailto:hello@movienet.app" className="text-sm text-primary hover:underline underline-offset-4">
                hello@movienet.app
              </a>
            </div>
            <div className="mt-2">
              <AdSlot />
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-20 bg-zinc-900/30 rounded-2xl border border-white/5">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-white mb-2">Message sent!</h2>
                  <p className="text-zinc-400 max-w-sm">
                    Thanks for reaching out. We'll get back to you at{" "}
                    <span className="text-white">{form.email}</span> soon.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-white/10 hover:bg-white/5 text-white"
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>

                {/* Category selector — accessible fieldset */}
                <fieldset>
                  <legend className="text-sm font-semibold text-zinc-300 mb-3">What's this about?</legend>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup">
                    {CATEGORIES.map(c => {
                      const Icon = c.icon;
                      const active = category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setCategory(c.id)}
                          className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                            active
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-0.5" aria-hidden="true" />
                          <span className="font-semibold text-sm">{c.label}</span>
                          <span className={`text-xs ${active ? "text-primary/70" : "text-zinc-600"}`}>{c.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-zinc-300">Your name</Label>
                    <Input
                      id="name" name="name"
                      placeholder="e.g. Alex Kim"
                      required autoComplete="name"
                      value={form.name} onChange={handleChange}
                      className="bg-zinc-900/60 border-white/8 focus-visible:ring-primary/50 placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-zinc-300">Email address</Label>
                    <Input
                      id="email" name="email" type="email"
                      placeholder="you@example.com"
                      required autoComplete="email"
                      value={form.email} onChange={handleChange}
                      className="bg-zinc-900/60 border-white/8 focus-visible:ring-primary/50 placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subject" className="text-sm font-semibold text-zinc-300">Subject</Label>
                  <Input
                    id="subject" name="subject"
                    placeholder="Brief description of your message"
                    required
                    value={form.subject} onChange={handleChange}
                    className="bg-zinc-900/60 border-white/8 focus-visible:ring-primary/50 placeholder:text-zinc-600"
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="message" className="text-sm font-semibold text-zinc-300">Message</Label>
                  <Textarea
                    id="message" name="message"
                    placeholder={
                      category === "dmca"        ? "Include the title name, URL, and your rights information…"
                      : category === "bug"       ? "Describe what happened, what you expected, and your device/browser…"
                      : category === "partnership" ? "Tell us about your company or project…"
                      : "What's on your mind?"
                    }
                    required rows={6}
                    value={form.message} onChange={handleChange}
                    className="bg-zinc-900/60 border-white/8 focus-visible:ring-primary/50 placeholder:text-zinc-600 resize-none"
                  />
                </div>

                {/* Error banner */}
                {error && (
                  <div role="alert" className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full font-bold py-6 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                      Sending…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" aria-hidden="true" /> Send Message
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-zinc-600">
                  By submitting you agree to our{" "}
                  <Link href="/about" className="text-zinc-400 hover:text-white underline underline-offset-4 transition-colors">
                    Privacy Policy
                  </Link>
                  . We never share your data.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
