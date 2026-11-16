import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Contact — posts to /api/contact.
 * If your deployed API expects different keys, we send several aliases.
 */
export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErr("");
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        // aliases for older zod schemas
        fullName: name.trim(),
        body: message.trim(),
        content: message.trim(),
      };
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || data?.message || "Invalid form data");
      setStatus("ok");
      setName("");
      setEmail("");
      setMessage("");
    } catch (e: any) {
      setErr(e.message || "Failed");
      setStatus("err");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Contact</h1>
          <p className="text-zinc-500 text-sm mt-1">DMCA, support, or feedback.</p>
        </div>

        {status === "ok" && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Message sent. Thanks!
          </div>
        )}
        {status === "err" && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {err}
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-3 rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <input
            required
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-2xl bg-zinc-950/80 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl bg-zinc-950/80 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <textarea
            required
            name="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="w-full rounded-2xl bg-zinc-950/80 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y min-h-[120px]"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-3.5 text-sm font-semibold shadow-lg shadow-violet-900/30"
          >
            <Send className="w-4 h-4" />
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}
