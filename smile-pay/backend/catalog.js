// Tiny demo catalog. Prices are in the smallest currency unit Stripe expects
// for "zero-decimal-safe" math, but we store as decimal here and convert
// per-currency in pricing.js (USD/EUR/GBP/INR/JPY all behave differently).
export const CATALOG = [
  {
    id: "sneaker-blue-9",
    name: "Aero Runner Sneakers",
    variant: "Blue / US 9",
    price_usd: 89.0,
    category: "footwear",
    keywords: ["sneaker", "sneakers", "shoe", "shoes", "runner", "blue shoes"],
    image: "👟"
  },
  {
    id: "sneaker-black-9",
    name: "Aero Runner Sneakers",
    variant: "Black / US 9",
    price_usd: 89.0,
    category: "footwear",
    keywords: ["sneaker", "sneakers", "shoe", "shoes", "black shoes"],
    image: "👟"
  },
  {
    id: "headphones-noise",
    name: "Hearth ANC Headphones",
    variant: "Charcoal",
    price_usd: 149.0,
    category: "electronics",
    keywords: ["headphones", "headphone", "anc", "noise cancelling", "earphones"],
    image: "🎧"
  },
  {
    id: "watch-steel",
    name: "Meridian Steel Watch",
    variant: "40mm / Silver",
    price_usd: 220.0,
    category: "accessories",
    keywords: ["watch", "watches", "timepiece"],
    image: "⌚"
  },
  {
    id: "backpack-travel",
    name: "Transit Travel Backpack",
    variant: "30L / Slate",
    price_usd: 95.0,
    category: "bags",
    keywords: ["backpack", "bag", "rucksack", "travel bag"],
    image: "🎒"
  },
  {
    id: "coffee-beans",
    name: "Origin Roast Coffee Beans",
    variant: "250g / Whole Bean",
    price_usd: 14.5,
    category: "grocery",
    keywords: ["coffee", "beans", "roast"],
    image: "☕"
  }
];

export function findProducts(query) {
  const q = query.toLowerCase();
  return CATALOG.filter((p) =>
    p.keywords.some((k) => q.includes(k)) ||
    q.includes(p.name.toLowerCase()) ||
    q.includes(p.id)
  );
}

export function getProduct(id) {
  return CATALOG.find((p) => p.id === id) || null;
}
