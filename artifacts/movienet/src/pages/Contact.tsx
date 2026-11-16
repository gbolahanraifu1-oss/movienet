import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";

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
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to send");
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
        <h1 className="text-2xl font-bold">Contact</h1>
        <p className="text-zinc-400 text-sm">Questions, DMCA, or feedback — we read every message.</p>

        {status === "ok" && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Message sent. Thanks!
          </div>
        )}
        {status === "err" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2.5 text-sm"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2.5 text-sm"
          />
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-3 text-sm font-semibold"
          >
            <Send className="w-4 h-4" /> {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}
