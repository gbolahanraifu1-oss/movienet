import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
  category: z.enum(["general", "dmca", "bug", "partnership"]),
});

router.post("/contact", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid form data", issues: parsed.error.flatten() });
  }

  const { name, email, subject, message, category } = parsed.data;

  // Log for now — swap in Resend/SendGrid later by reading CONTACT_EMAIL env var
  logger.info({ name, email, subject, category, messageLength: message.length }, "contact form submission");

  // If RESEND_API_KEY or SENDGRID_API_KEY is configured in future, send email here.
  // For now: acknowledge receipt successfully.

  return res.status(200).json({ ok: true });
});

export default router;
