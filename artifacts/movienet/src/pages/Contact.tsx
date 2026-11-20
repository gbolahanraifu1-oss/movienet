import { useEffect, useState } from "react";
import { AdSlot } from "../components/AdSlot";
import {
  Mail, MessageSquare, Bug, Megaphone, Send, CheckCircle2,
  Lock, Plus, ArrowLeft, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Category = "general" | "dmca" | "bug" | "partnership";

const CATEGORIES: { id: Category; icon: typeof Mail; label: string; desc: string }[] = [
  { id: "general", icon: MessageSquare, label: "General", desc: "Questions & feedback" },
  { id: "dmca", icon: Megaphone, label: "DMCA", desc: "Copyright report" },
  { id: "bug", icon: Bug, label: "Bug", desc: "Something broken" },
  { id: "partnership", icon: Mail, label: "Business", desc: "Ads & collabs" },
];

const SUPPORT_EMAIL = "madaraeyeinc@gmail.com";
const LS_KEY = "mn_support_ticket";

type Msg = { id: number; sender: string; body: string; createdAt: string };

export function Contact() {
  const [view, setView] = useState<"home" | "new" | "chat">("home");
  const [category, setCategory] = useState<Category>("general");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketMeta, setTicketMeta] = useState<{
    subject: string;
    status: string;
    locked: boolean;
  } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");

  // Resume open ticket from localStorage
  useEffect(() => {
    try {
      const id = localStorage.getItem(LS_KEY);
      if (id) {
        setTicketId(id);
        loadTicket(id);
        setView("chat");
      }
    } catch {}
  }, []);

  async function loadTicket(id: string) {
    try {
      const r = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Not found");
      setTicketMeta({
        subject: d.ticket.subject,
        status: d.ticket.status,
        locked: !!d.ticket.locked,
      });
      setMessages(d.messages || []);
    } catch (e: any) {
      localStorage.removeItem(LS_KEY);
      setTicketId(null);
      setView("home");
    }
  }

  async function openTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || form.message.trim().length < 3) {
      setError("Fill all fields (message at least 3 characters).");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not open chat");
      const id = d.ticket.id;
      localStorage.setItem(LS_KEY, id);
      setTicketId(id);
      setForm({ name: "", email: "", subject: "", message: "" });
      await loadTicket(id);
      setView("chat");
    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketId || !reply.trim() || ticketMeta?.locked) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Send failed");
      setReply("");
      await loadTicket(ticketId);
    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    localStorage.removeItem(LS_KEY);
    setTicketId(null);
    setMessages([]);
    setTicketMeta(null);
    setView("new");
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Headphones className="w-8 h-8 text-primary" />
          Support
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">
          Chat with us — messages stay until we reply. Locked chats need a new ticket.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=MovieNet%20Support`}
          className="inline-flex items-center gap-2 mt-3 text-sm text-violet-400 hover:text-violet-300"
        >
          <Mail className="w-4 h-4" />
          Or email {SUPPORT_EMAIL}
        </a>
      </div>

      <AdSlot />

      {view === "home" && (
        <div className="space-y-4 mt-6">
          <Button onClick={() => setView("new")} className="w-full h-12 text-base gap-2">
            <Plus className="w-5 h-5" /> Open a support chat
          </Button>
          {ticketId && (
            <Button variant="outline" onClick={() => { setView("chat"); loadTicket(ticketId); }} className="w-full">
              Resume current chat
            </Button>
          )}
        </div>
      )}

      {view === "new" && (
        <form onSubmit={openTicket} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <button type="button" onClick={() => setView("home")} className="text-xs text-zinc-500 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                  category === c.id
                    ? "border-violet-500 bg-violet-500/15 text-white"
                    : "border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                <c.icon className="w-4 h-4 mb-1" />
                <div className="font-semibold">{c.label}</div>
                <div className="text-[10px] opacity-70">{c.desc}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-zinc-950" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-zinc-950" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input name="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="bg-zinc-950" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea name="message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-zinc-950" />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full gap-2">
            <Send className="w-4 h-4" /> {loading ? "Opening…" : "Start chat"}
          </Button>
        </form>
      )}

      {view === "chat" && ticketId && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{ticketMeta?.subject || "Support chat"}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                {ticketMeta?.locked ? (
                  <span className="text-amber-400 inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Locked — open a new chat for new issues</span>
                ) : (
                  <span className="text-emerald-400">Open</span>
                )}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={startNew}>
              New chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[360px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-100 border border-white/10"
                  }`}
                >
                  {m.sender === "admin" && (
                    <p className="text-[10px] text-violet-300 mb-0.5 font-semibold">Support</p>
                  )}
                  {m.body}
                </div>
              </div>
            ))}
            {!messages.length && (
              <p className="text-center text-zinc-500 text-sm py-8">No messages yet.</p>
            )}
          </div>

          {ticketMeta?.locked ? (
            <div className="p-4 border-t border-white/10 text-center text-sm text-zinc-400">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              Chat closed by support. Start a <button type="button" className="text-violet-400 underline" onClick={startNew}>new chat</button> if you need help again.
            </div>
          ) : (
            <form onSubmit={sendReply} className="p-3 border-t border-white/10 flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply…"
                className="bg-zinc-950 flex-1"
              />
              <Button type="submit" disabled={loading || !reply.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
          {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
