import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { userTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

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
    });
  } catch (err) {
    req.log.error({ err }, "Get subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create-checkout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billing_cycle } = req.body;

    const stripeKey = process.env.STRIPE_API_KEY;
    if (!stripeKey) {
      res.status(503).json({ error: "Billing not configured", message: "Stripe integration is not set up yet." });
      return;
    }

    const priceIds: Record<string, string> = {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
      annual: process.env.STRIPE_ANNUAL_PRICE_ID || "price_annual",
    };

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    const baseUrl = `https://${domains}`;

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price]": priceIds[billing_cycle] || priceIds.monthly,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${baseUrl}/billing/success`,
        cancel_url: `${baseUrl}/billing/cancel`,
        client_reference_id: req.user!.userId,
      }),
    });

    const session = await response.json() as any;
    res.json({ checkout_url: session.url });
  } catch (err) {
    req.log.error({ err }, "Create checkout error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
