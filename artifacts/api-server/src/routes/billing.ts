import { Router, IRouter } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { userTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-04-30.basil" });
}

router.get("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [tier] = await db
      .select()
      .from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier) {
      res.json({
        tier: "free",
        status: "active",
        billing_cycle: null,
        trial_end_date: null,
        premium_end_date: null,
      });
      return;
    }

    res.json({
      tier: tier.tier,
      status: tier.status,
      billing_cycle: tier.billing_cycle,
      trial_end_date: tier.trial_end_date,
      premium_end_date: tier.premium_end_date,
      stripe_subscription_id: tier.stripe_subscription_id,
    });
  } catch (err) {
    req.log.error({ err }, "Get subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billing_cycle } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (billing_cycle !== undefined) updates.billing_cycle = billing_cycle;

    const [updated] = await db.update(userTiersTable)
      .set(updates as any)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true, tier: updated.tier, billing_cycle: updated.billing_cycle });
  } catch (err) {
    req.log.error({ err }, "Update subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [tier] = await db.select()
      .from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const stripe = getStripe();
    if (stripe && tier.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(tier.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        req.log.info({ subscriptionId: tier.stripe_subscription_id }, "Stripe subscription set to cancel at period end");
      } catch (stripeErr) {
        req.log.error({ stripeErr, subscriptionId: tier.stripe_subscription_id }, "Stripe cancellation failed");
      }
    }

    const [updated] = await db.update(userTiersTable)
      .set({
        status: "cancelling",
        updated_at: new Date(),
      } as any)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .returning();

    res.json({
      success: true,
      message: "Subscription cancelled. You will retain access until the end of your billing period.",
      cancel_at_period_end: true,
    });
  } catch (err) {
    req.log.error({ err }, "Cancel subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/trial-status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [tier] = await db.select().from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier || !tier.trial_end_date) {
      res.json({ trial_active: false, trial_days_remaining: 0 });
      return;
    }

    const trialEnd = new Date(tier.trial_end_date);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      trial_active: daysRemaining > 0,
      trial_days_remaining: daysRemaining,
      trial_end_date: tier.trial_end_date,
    });
  } catch (err) {
    req.log.error({ err }, "Trial status error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoices", requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.json({ invoices: [], message: "Billing not configured" });
      return;
    }

    const [tier] = await db.select()
      .from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier?.stripe_subscription_id) {
      res.json({ invoices: [] });
      return;
    }

    const stripeInvoices = await stripe.invoices.list({
      subscription: tier.stripe_subscription_id,
      limit: 20,
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      pdf_url: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
    }));

    res.json({ invoices });
  } catch (err) {
    req.log.error({ err }, "Get invoices error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create-checkout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billing_cycle } = req.body;

    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: "Billing not configured", message: "Stripe integration is not set up yet." });
      return;
    }

    const priceIds: Record<string, string> = {
      monthly: process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
      annual: process.env.STRIPE_PRICE_ID_ANNUAL || process.env.STRIPE_ANNUAL_PRICE_ID || "price_annual",
    };

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    const baseUrl = `https://${domains}`;

    const priceId = priceIds[billing_cycle] || priceIds.monthly;
    req.log.info({ billing_cycle, priceId }, "Creating checkout session");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${baseUrl}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/api/billing/cancel`,
      client_reference_id: req.user!.userId,
      metadata: {
        user_id: req.user!.userId,
        billing_cycle: billing_cycle || "monthly",
      },
    });

    res.json({ checkout_url: session.url });
  } catch (err) {
    req.log.error({ err }, "Create checkout error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/webhook", async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && sig && stripe) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      req.log.error({ err: err.message }, "Webhook signature verification failed");
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }
  } else {
    if (webhookSecret && !sig) {
      req.log.warn("Missing stripe-signature header");
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    req.log.warn("No STRIPE_WEBHOOK_SECRET set — skipping signature verification (dev mode)");
    const raw = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    event = typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  req.log.info({ type: event.type, id: event.id }, "Stripe webhook received");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;

        if (!userId) {
          req.log.warn("checkout.session.completed: no user_id found");
          break;
        }

        const billingCycle = session.metadata?.billing_cycle || "monthly";
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

        const now = new Date();
        const premiumEnd = new Date(now);
        premiumEnd.setFullYear(premiumEnd.getFullYear() + (billingCycle === "annual" ? 1 : 0));
        premiumEnd.setMonth(premiumEnd.getMonth() + (billingCycle === "monthly" ? 1 : 0));

        const [existing] = await db.select()
          .from(userTiersTable)
          .where(eq(userTiersTable.user_id, userId))
          .limit(1);

        if (existing) {
          await db.update(userTiersTable)
            .set({
              tier: "premium",
              status: "active",
              billing_cycle: billingCycle,
              stripe_subscription_id: subscriptionId || null,
              premium_start_date: now.toISOString().split("T")[0],
              premium_end_date: premiumEnd.toISOString().split("T")[0],
              updated_at: now,
            } as any)
            .where(eq(userTiersTable.user_id, userId));
        } else {
          await db.insert(userTiersTable).values({
            user_id: userId,
            tier: "premium",
            status: "active",
            billing_cycle: billingCycle,
            stripe_subscription_id: subscriptionId || null,
            premium_start_date: now.toISOString().split("T")[0],
            premium_end_date: premiumEnd.toISOString().split("T")[0],
          } as any);
        }

        req.log.info({ userId, subscriptionId, billingCycle }, "User upgraded to premium");
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        const [tier] = await db.select()
          .from(userTiersTable)
          .where(eq(userTiersTable.stripe_subscription_id, subId))
          .limit(1);

        if (tier) {
          const status = subscription.cancel_at_period_end ? "cancelling" : "active";
          const periodEnd = new Date(subscription.current_period_end * 1000);

          await db.update(userTiersTable)
            .set({
              status,
              premium_end_date: periodEnd.toISOString().split("T")[0],
              updated_at: new Date(),
            } as any)
            .where(eq(userTiersTable.stripe_subscription_id, subId));

          req.log.info({ subId, status }, "Subscription updated");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        const [tier] = await db.select()
          .from(userTiersTable)
          .where(eq(userTiersTable.stripe_subscription_id, subId))
          .limit(1);

        if (tier) {
          await db.update(userTiersTable)
            .set({
              tier: "free",
              status: "cancelled",
              stripe_subscription_id: null,
              billing_cycle: null,
              premium_end_date: null,
              updated_at: new Date(),
            } as any)
            .where(eq(userTiersTable.stripe_subscription_id, subId));

          req.log.info({ subId, userId: tier.user_id }, "Subscription cancelled — downgraded to free");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subId) {
          const [tier] = await db.select()
            .from(userTiersTable)
            .where(eq(userTiersTable.stripe_subscription_id, subId))
            .limit(1);

          if (tier) {
            await db.update(userTiersTable)
              .set({ status: "past_due", updated_at: new Date() } as any)
              .where(eq(userTiersTable.stripe_subscription_id, subId));

            req.log.warn({ subId, userId: tier.user_id }, "Payment failed — subscription past due");
          }
        }
        break;
      }

      default:
        req.log.info({ type: event.type }, "Unhandled webhook event type");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, eventType: event.type }, "Webhook processing error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

function billingPage(title: string, message: string, icon: string, autoClose: boolean) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - SeniorShield</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0A1628 0%,#0E2D6B 50%,#1A3F7A 100%);color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:48px;text-align:center;max-width:420px;backdrop-filter:blur(20px)}
.icon{font-size:64px;margin-bottom:16px}
h1{font-size:24px;margin-bottom:12px}
p{color:rgba(255,255,255,0.7);font-size:16px;line-height:1.5;margin-bottom:24px}
.hint{font-size:13px;color:rgba(255,255,255,0.4)}
</style></head><body>
<div class="card">
<div class="icon">${icon}</div>
<h1>${title}</h1>
<p>${message}</p>
<p class="hint">${autoClose ? 'This tab will close automatically...' : 'You can close this tab and return to the app.'}</p>
</div>
${autoClose ? '<script>setTimeout(function(){window.close()},3000);</script>' : ''}
</body></html>`;
}

router.get("/success", (req, res) => {
  res.send(billingPage(
    "Payment Successful!",
    "Your SeniorShield subscription is now active. Thank you for subscribing!",
    "✅",
    true
  ));
});

router.get("/cancel", (req, res) => {
  res.send(billingPage(
    "Payment Cancelled",
    "No charges were made. You can return to the app and try again anytime.",
    "↩️",
    true
  ));
});

export default router;
