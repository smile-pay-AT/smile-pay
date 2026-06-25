const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getCatalog: () => request("/api/catalog"),

  sendMessage: (message, cart, currency) =>
    request("/api/agent/message", {
      method: "POST",
      body: JSON.stringify({ message, cart, currency })
    }),

  verifyLiveness: () =>
    request("/api/liveness/verify", { method: "POST" }),

  createPaymentIntent: (cart, currency) =>
    request("/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ cart, currency })
    }),

  getPaymentStatus: (id) => request(`/api/payments/${id}`)
};
