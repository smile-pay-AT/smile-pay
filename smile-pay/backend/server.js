import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { parseMessage } from "./agent.js";
import { getProduct, CATALOG } from "./catalog.js";
import { toStripeAmount, formatAmount, FX_RATES_PER_USD } from "./pricing.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY || !STRIPE_KEY.startsWith("sk_test_")) {
  console.warn(
    "\n⚠️  STRIPE_SECRET_KEY is missing or is not a TEST key (must start with sk_test_).\n" +
    "   Payment endpoints will return a 503 until you set a real test key in backend/.env\n" +
    "   Get one free at https://dashboard.stripe.com/test/apikeys\n"
  );
}
const stripe = STRIPE_KEY?.startsWith("sk_test_") ? new Stripe(STRIPE_KEY) : null;

function requireStripe(res) {
  if (!stripe) {
    res.status(503).json({
      error: "Stripe test key not configured on the server. See backend/.env.example."
    });
    return false;
  }
  return true;
}

// --- Catalog -----------------------------------------------------------
app.get("/api/catalog", (req, res) => {
  res.json({ items: CATALOG, currencies: Object.keys(FX_RATES_PER_USD) });
});

// --- Conversational agent ----------------------------------------------
// Takes a free-text chat message + current cart, returns the agent's
// structured decision plus an updated cart. The frontend renders the
// agent's reply as a chat bubble.
app.post("/api/agent/message", (req, res) => {
  const { message, cart = [], currency = "USD" } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message (string) is required" });
  }
  if (!FX_RATES_PER_USD[currency]) {
    return res.status(400).json({ error: `Unsupported currency: ${currency}` });
  }

  const parsed = parseMessage(message);
  let updatedCart = [...cart];
  let reply = "";

  switch (parsed.intent) {
    case "browse": {
      const lines = CATALOG.map(
        (p) => `${p.image} ${p.name} (${p.variant}) — ${formatAmount(p.price_usd, currency)}`
      );
      reply = `Here's what I can help you buy:\n${lines.join("\n")}`;
      break;
    }
    case "add_to_cart": {
      const added = [];
      for (const { product, quantity } of parsed.items) {
        const existing = updatedCart.find((c) => c.productId === product.id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          updatedCart.push({ productId: product.id, quantity });
        }
        added.push(`${quantity} × ${product.name} (${product.variant})`);
      }
      reply = `Added to your order: ${added.join(", ")}. Say "checkout" when you're ready to pay.`;
      break;
    }
    case "checkout": {
      if (updatedCart.length === 0) {
        reply = "Your cart is empty — tell me what you'd like to buy first.";
      } else {
        reply = "Ready when you are — confirm with face verification to pay.";
      }
      break;
    }
    case "unknown":
    default: {
      reply = `I couldn't match "${parsed.raw ?? message}" to anything in the catalog. Try "show me what you sell" or name an item directly.`;
      break;
    }
  }

  const total = updatedCart.reduce((sum, item) => {
    const p = getProduct(item.productId);
    return p ? sum + p.price_usd * item.quantity : sum;
  }, 0);

  res.json({
    reply,
    intent: parsed.intent,
    cart: updatedCart,
    totalFormatted: formatAmount(total, currency),
    totalUsd: total
  });
});

// --- Simulated liveness check -------------------------------------------
// NOTE: This is a SIMULATION for demo purposes. It does not perform real
// computer-vision face matching or anti-spoof depth analysis — that
// requires a licensed biometric SDK (e.g. FaceTec, AWS Rekognition Liveness)
// and a real enrolled face template per user, which is out of scope for a
// demo. This endpoint exists so the frontend flow is complete end-to-end;
// it always succeeds after a short delay to mimic real latency.
app.post("/api/liveness/verify", (req, res) => {
  setTimeout(() => {
    res.json({
      verified: true,
      method: "simulated-blink-smile",
      note: "Simulated for demo purposes — not a real biometric check."
    });
  }, 900);
});

// --- Stripe: create PaymentIntent ---------------------------------------
app.post("/api/payments/create-intent", async (req, res) => {
  if (!requireStripe(res)) return;

  const { cart = [], currency = "USD" } = req.body;
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "cart must be a non-empty array" });
  }
  if (!FX_RATES_PER_USD[currency]) {
    return res.status(400).json({ error: `Unsupported currency: ${currency}` });
  }

  let totalUsd = 0;
  const lineItems = [];
  for (const { productId, quantity } of cart) {
    const product = getProduct(productId);
    if (!product) return res.status(400).json({ error: `Unknown product: ${productId}` });
    if (!quantity || quantity < 1) return res.status(400).json({ error: `Invalid quantity for ${productId}` });
    totalUsd += product.price_usd * quantity;
    lineItems.push({ id: product.id, name: product.name, quantity });
  }

  const amount = toStripeAmount(totalUsd, currency);

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        line_items: JSON.stringify(lineItems),
        channel: "smile-pay-chat-demo"
      }
    });
    res.json({
      clientSecret: intent.client_secret,
      amount,
      currency,
      totalFormatted: formatAmount(totalUsd, currency)
    });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Stripe: confirm / fetch status of a PaymentIntent -------------------
app.get("/api/payments/:id", async (req, res) => {
  if (!requireStripe(res)) return;
  try {
    const intent = await stripe.paymentIntents.retrieve(req.params.id);
    res.json({ status: intent.status, amount: intent.amount, currency: intent.currency });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Smile-Pay backend (TEST MODE) running on http://localhost:${PORT}`);
});
