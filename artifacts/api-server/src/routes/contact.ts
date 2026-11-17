import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger.js";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z
    .string()
    .min(3, "Message must be at least 3 characters")
    .max(5000, "Message is too long"),
  category: z.enum(["general", "dmca", "bug", "partnership"]).default("general"),
});

type FlatErrors = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
};

function flattenIssues(issues: FlatErrors | undefined): string {
  if (!issues) return "Invalid form data";
  const parts: string[] = [];
  for (const [field, msgs] of Object.entries(issues.fieldErrors || {})) {
    if (Array.isArray(msgs) && msgs.length) {
      parts.push(`${field}: ${msgs.join(", ")}`);
    }
  }
  for (const m of issues.formErrors || []) parts.push(String(m));
  return parts.length ? parts.join(" · ") : "Invalid form data";
}

router.post("/contact", async (req: any, res: any) => {
  const body = req.body || {};
  const normalized = {
    name: body.name ?? body.fullName ?? "",
    email: body.email ?? body.mail ?? "",
    subject: body.subject ?? body.title ?? "Contact",
    message: body.message ?? body.body ?? body.content ?? body.text ?? "",
    category: body.category ?? "general",
  };

  const parsed = contactSchema.safeParse(normalized);
  if (!parsed.success) {
    const flat = parsed.error.flatten() as FlatErrors;
    return res.status(400).json({
      error: flattenIssues(flat),
      issues: flat,
      fieldErrors: flat.fieldErrors,
    });
  }

  const { name, email, subject, message, category } = parsed.data;

  logger.info(
    { name, email, subject, category, messageLength: message.length },
    "contact form submission"
  );

  const webhook = process.env.CONTACT_WEBHOOK || process.env.DISCORD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: null,
          embeds: [
            {
              title: `[${category}] ${subject}`,
              description: message.slice(0, 2000),
              color: 0x7c3aed,
              fields: [
                { name: "From", value: name, inline: true },
                { name: "Email", value: email, inline: true },
              ],
            },
          ],
        }),
      });
    } catch (e: any) {
      logger.error({ err: e?.message }, "contact webhook failed");
    }
  }

  return res.status(200).json({ ok: true });
});

export default router;
