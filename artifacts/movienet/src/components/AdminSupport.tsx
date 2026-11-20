import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Unlock, Send, RefreshCw } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  category: string;
  name: string;
  email: string;
  msgCount: number;
  updatedAt: string;
};

type Msg = { id: number; sender: string; body: string; createdAt: string };

/** Drop into Admin under a "Support" tab */
export function AdminSupport() {
  const { getToken } = useAuth();
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken().catch(() => null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { ...init, headers, credentials: "include" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || r.statusText);
    return d;
  }, [getToken]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadList() {
    try {
      const d = await api(`/api/admin/support/tickets?status=${statusFilter}`);
      setTickets(d.tickets || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function openTicket(id: string) {
    setActive(id);
    setErr(null);
    try {
      const d = await api(`/api/support/tickets/${encodeURIComponent(id)}`);
      setMessages(d.messages || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function send() {
    if (!active || !reply.trim()) return;
    setBusy(true);
    try {
      await api(`/api/support/tickets/${encodeURIComponent(active)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
      setReply("");
      await openTicket(active);
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    if (!active) return;
    setBusy(true);
    try {
      await api(`/api/admin/support/tickets/${encodeURIComponent(active)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadList();
      await openTicket(active);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
        >
          <option value="open">Open</option>
          <option value="locked">Locked</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={loadList}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 divide-y divide-white/5 max-h-[480px] overflow-y-auto">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTicket(t.id)}
              className={`w-full text-left px-3 py-3 hover:bg-white/5 ${
                active === t.id ? "bg-violet-500/10" : ""
              }`}
            >
              <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
              <p className="text-[11px] text-zinc-500">
                {t.name} · {t.email} · {t.msgCount} msgs · {t.status}
              </p>
            </button>
          ))}
          {!tickets.length && (
            <p className="p-4 text-sm text-zinc-500">No tickets.</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 flex flex-col min-h-[320px]">
          {!active ? (
            <p className="p-6 text-zinc-500 text-sm">Select a ticket</p>
          ) : (
            <>
              <div className="p-3 border-b border-white/10 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setStatus("locked")} disabled={busy}>
                  <Lock className="w-3 h-3 mr-1" /> Lock
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setStatus("open")} disabled={busy}>
                  <Unlock className="w-3 h-3 mr-1" /> Reopen
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setStatus("closed")} disabled={busy}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[320px]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      m.sender === "admin" ? "bg-violet-600/30 ml-6" : "bg-zinc-800 mr-6"
                    }`}
                  >
                    <span className="text-[10px] uppercase text-zinc-400">{m.sender}</span>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as support…"
                  className="bg-zinc-950"
                />
                <Button type="button" onClick={send} disabled={busy || !reply.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
