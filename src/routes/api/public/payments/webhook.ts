import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Payment confirmation endpoint. Payment status is ONLY changed here, after the
// provider's signature is verified — never from the browser.
// Inactive until a payment provider is configured (PAYMENT_PROVIDER + PAYMENT_WEBHOOK_SECRET).
// The signature check below is HMAC-SHA512 over the raw body (Paystack-style);
// adjust header/algorithm to the chosen provider when it is activated.

const eventSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  event: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    reference: z.string().min(1).max(200),
    status: z.string().optional(),
  }).passthrough(),
});

const statusFor = (event: string): "successful" | "failed" | "refunded" | null => {
  if (/(charge\.success|payment\.succeeded|successful)/i.test(event)) return "successful";
  if (/(charge\.failed|payment\.failed|failed)/i.test(event)) return "failed";
  if (/refund\.(processed|succeeded)/i.test(event)) return "refunded";
  return null;
};

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = process.env["PAYMENT_PROVIDER"];
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        if (!provider || !secret) return new Response("Payments are not configured", { status: 202 }); // inactive: acknowledged, nothing processed

        const raw = await request.text();
        const sig = request.headers.get("x-paystack-signature") ?? request.headers.get("x-webhook-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Invalid signature", { status: 401 });

        let parsed;
        try { parsed = eventSchema.parse(JSON.parse(raw)); } catch { return new Response("Bad payload", { status: 400 }); }
        const ref = parsed.data.reference;
        const eventId = String(parsed.id ?? parsed.data.id ?? `${parsed.event}:${ref}`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const log = await supabaseAdmin.from("payment_events").insert({
          payment_provider: provider, event_id: eventId, event_type: parsed.event, transaction_reference: ref, payload: JSON.parse(raw),
        });
        if (log.error) {
          if (log.error.code === "23505") return new Response("ok"); // duplicate delivery
          return new Response("Error", { status: 500 });
        }

        const status = statusFor(parsed.event);
        if (status) {
          const { error } = await supabaseAdmin.from("payments")
            .update({ status, ...(status === "successful" ? { paid_at: new Date().toISOString() } : {}), provider_transaction_id: parsed.data.id != null ? String(parsed.data.id) : null })
            .eq("transaction_reference", ref).eq("payment_provider", provider);
          if (error) return new Response("Error", { status: 500 });
        }
        await supabaseAdmin.from("payment_events").update({ processed_at: new Date().toISOString() })
          .eq("payment_provider", provider).eq("event_id", eventId);
        return new Response("ok");
      },
    },
  },
});
