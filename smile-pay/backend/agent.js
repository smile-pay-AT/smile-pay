// A small, transparent intent parser. It is NOT an LLM call — it's explicit
// pattern matching, so the "agent" behavior is fully inspectable and has zero
// hidden cost or latency. This mirrors how a real agentic-commerce layer
// would work above an LLM: the LLM (if added) would handle ambiguity, and
// this layer would still validate + execute the structured order safely.
import { findProducts, CATALOG } from "./catalog.js";

const QUANTITY_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  a: 1, an: 1, couple: 2
};

function extractQuantity(text) {
  const numMatch = text.match(/\b(\d+)\s*(x|of|pairs?|units?)?\b/i);
  if (numMatch) return parseInt(numMatch[1], 10);
  for (const [word, n] of Object.entries(QUANTITY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return n;
  }
  return 1;
}

export function parseMessage(message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  const isCheckoutIntent = /(checkout|pay now|complete (the )?order|confirm (the )?order|place the order)/i.test(lower);
  const isBuyIntent = !isCheckoutIntent && /(buy|purchase|order|get me|i want|add|pay for)/i.test(lower);
  const isCatalogIntent = /(show|what.*sell|browse|catalog|list|options|available)/i.test(lower) && !isBuyIntent && !isCheckoutIntent;

  if (isCheckoutIntent) {
    return { intent: "checkout" };
  }

  if (isCatalogIntent) {
    return { intent: "browse", items: CATALOG };
  }

  const matches = findProducts(lower);

  if (matches.length === 0) {
    return { intent: "unknown", raw: text };
  }

  const quantity = extractQuantity(lower);

  return {
    intent: "add_to_cart",
    items: matches.map((p) => ({ product: p, quantity }))
  };
}
