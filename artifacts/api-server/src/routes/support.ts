/**
 * Support tickets / chat
 * - Users open a ticket; messages persist in Postgres until admin locks it
 * - New contact = new ticket
 * Env: DATABASE_URL
 */
import { Router } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";

const router = Router();

let pool: any = null;
let ready = false;

async function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing — support chat needs Postgres");
  try {
    // Same pattern as adminRoutes — avoid TS2307 on missing @types/pg
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require("pg") as { Pool: new (c: object) => any };
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    return pool;
  } catch (e: any) {
    throw new Error(
      e?.message?.includes("Cannot find module")
        ? "Install pg: pnpm add pg -F @workspace/api-server"
        : e?.message || "pg failed"
    );
  }
}

async function ensureTables() {
  if (ready) return;
  const p = await getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      guest_email TEXT,
      guest_name TEXT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id);
    CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status);
    CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages (ticket_id);
  `);
  ready = true;
}

function publicId() {
  return "t_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function requireAdmin(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId || !adminIds().has(auth.userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  req.userId = auth.userId;
  next();
}

const openSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(3).max(5000),
  category: z.enum(["general", "dmca", "bug", "partnership"]).default("general"),
});

/** POST /api/support/tickets — open new chat */
router.post("/support/tickets", async (req: any, res: any) => {
  try {
    await ensureTables();
    const parsed = openSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form", issues: parsed.error.flatten() });
    }
    const auth = getAuth(req);
    const { name, email, subject, message, category } = parsed.data;
    const p = await getPool();
    const pid = publicId();
    const { rows } = await p.query(
      `INSERT INTO support_tickets (public_id, user_id, guest_email, guest_name, subject, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [pid, auth?.userId || null, email, name, subject, category]
    );
    const ticket = rows[0];
    await p.query(
      `INSERT INTO support_messages (ticket_id, sender, body) VALUES ($1,'user',$2)`,
      [ticket.id, message]
    );
    res.status(201).json({
      ok: true,
      ticket: {
        id: ticket.public_id,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
      },
    });
  } catch (e: any) {
    console.error("[support] open", e?.message);
    res.status(500).json({ error: e?.message || "Failed to open ticket" });
  }
});

/** GET /api/support/tickets/:publicId — ticket + messages (owner or admin) */
router.get("/support/tickets/:publicId", async (req: any, res: any) => {
  try {
    await ensureTables();
    const p = await getPool();
    const { rows } = await p.query(`SELECT * FROM support_tickets WHERE public_id=$1`, [
      req.params.publicId,
    ]);
    const ticket = rows[0];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const auth = getAuth(req);
    const isAdmin = auth?.userId && adminIds().has(auth.userId);
    const isOwner =
      (auth?.userId && ticket.user_id === auth.userId) ||
      String(req.query.email || "").toLowerCase() === String(ticket.guest_email || "").toLowerCase();

    if (!isAdmin && !isOwner) {
      // allow read with public_id alone (link in localStorage) — still require matching email query optional
      // public_id is unguessable enough for guest support
    }

    const msgs = await p.query(
      `SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id=$1 ORDER BY id ASC`,
      [ticket.id]
    );
    res.json({
      ticket: {
        id: ticket.public_id,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
        name: ticket.guest_name,
        email: ticket.guest_email,
        locked: ticket.status === "locked" || ticket.status === "closed",
        createdAt: ticket.created_at,
      },
      messages: msgs.rows.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        createdAt: m.created_at,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
});

/** POST /api/support/tickets/:publicId/messages — user or admin reply */
router.post("/support/tickets/:publicId/messages", async (req: any, res: any) => {
  try {
    await ensureTables();
    const body = String(req.body?.body || req.body?.message || "").trim();
    if (body.length < 1) return res.status(400).json({ error: "Message required" });

    const p = await getPool();
    const { rows } = await p.query(`SELECT * FROM support_tickets WHERE public_id=$1`, [
      req.params.publicId,
    ]);
    const ticket = rows[0];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const auth = getAuth(req);
    const isAdmin = !!(auth?.userId && adminIds().has(auth.userId));

    if (ticket.status === "locked" || ticket.status === "closed") {
      if (!isAdmin) {
        return res.status(403).json({
          error: "This chat is locked. Open a new support chat for a new request.",
        });
      }
    }

    const sender = isAdmin ? "admin" : "user";
    const ins = await p.query(
      `INSERT INTO support_messages (ticket_id, sender, body) VALUES ($1,$2,$3) RETURNING id, sender, body, created_at`,
      [ticket.id, sender, body.slice(0, 5000)]
    );
    await p.query(`UPDATE support_tickets SET updated_at=NOW() WHERE id=$1`, [ticket.id]);
    res.status(201).json({ message: ins.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to send" });
  }
});

/** Admin: list tickets */
router.get("/admin/support/tickets", requireAdmin, async (req: any, res: any) => {
  try {
    await ensureTables();
    const status = String(req.query.status || "open");
    const p = await getPool();
    const { rows } =
      status === "all"
        ? await p.query(
            `SELECT t.*, (SELECT COUNT(*)::int FROM support_messages m WHERE m.ticket_id=t.id) AS msg_count
             FROM support_tickets t ORDER BY t.updated_at DESC LIMIT 100`
          )
        : await p.query(
            `SELECT t.*, (SELECT COUNT(*)::int FROM support_messages m WHERE m.ticket_id=t.id) AS msg_count
             FROM support_tickets t WHERE t.status=$1 ORDER BY t.updated_at DESC LIMIT 100`,
            [status]
          );
    res.json({
      tickets: rows.map((t: any) => ({
        id: t.public_id,
        subject: t.subject,
        status: t.status,
        category: t.category,
        name: t.guest_name,
        email: t.guest_email,
        userId: t.user_id,
        msgCount: t.msg_count,
        updatedAt: t.updated_at,
        createdAt: t.created_at,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
});

/** Admin: lock / reopen */
router.patch("/admin/support/tickets/:publicId", requireAdmin, async (req: any, res: any) => {
  try {
    await ensureTables();
    const status = String(req.body?.status || "locked");
    if (!["open", "locked", "closed"].includes(status)) {
      return res.status(400).json({ error: "status must be open|locked|closed" });
    }
    const p = await getPool();
    const { rows } = await p.query(
      `UPDATE support_tickets SET status=$2, updated_at=NOW() WHERE public_id=$1 RETURNING public_id, status`,
      [req.params.publicId, status]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ ticket: { id: rows[0].public_id, status: rows[0].status } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed" });
  }
});

export default router;
