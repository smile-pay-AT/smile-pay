import React, { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { api } from "./api.js";
import OrderCard from "./OrderCard.jsx";
import LivenessScan from "./LivenessScan.jsx";
import PaymentSheet from "./PaymentSheet.jsx";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY?.startsWith("pk_test_") ? loadStripe(STRIPE_KEY) : null;

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AED", "SGD"];

const SUGGESTIONS = [
  "Show me what you sell",
  "Add the blue sneakers",
  "I want headphones and a watch",
  "Checkout"
];

let nextId = 1;
function makeMessage(role, content, extra = {}) {
  return { id: nextId++, role, content, ...extra };
}

export default function App() {
  const [messages, setMessages] = useState([
    makeMessage(
      "agent",
      "Tell me what you'd like to buy — try \"show me what you sell\" or name an item directly."
    )
  ]);
  const [input, setInput] = useState("");
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState({});
  const [currency, setCurrency] = useState("USD");
  const [totalFormatted, setTotalFormatted] = useState("");
  const [stage, setStage] = useState("chat"); // chat -> liveness -> payment -> done
  const [clientSecret, setClientSecret] = useState(null);
  const [sending, setSending] = useState(false);
  const [orderStatus, setOrderStatus] = useState("open");
  const threadRef = useRef(null);

  useEffect(() => {
    api.getCatalog().then(({ items }) => {
      const map = {};
      items.forEach((p) => (map[p.id] = p));
      setProducts(map);
    }).catch(() => {
      setMessages((m) => [
        ...m,
        makeMessage("agent", "Couldn't reach the store backend. Is it running on localhost:4242?")
      ]);
    });
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stage]);

  async function handleSend(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setMessages((m) => [...m, makeMessage("user", message)]);
    setInput("");
    setSending(true);

    try {
      const res = await api.sendMessage(message, cart, currency);
      setCart(res.cart);
      setTotalFormatted(res.totalFormatted);

      setMessages((m) => [
        ...m,
        makeMessage("agent", res.reply, {
          showOrder: res.cart.length > 0,
          orderSnapshot: res.cart,
          orderTotal: res.totalFormatted,
          orderStatusSnapshot: "open"
        })
      ]);

      if (res.intent === "checkout" && res.cart.length > 0) {
        setStage("liveness");
      }
    } catch (err) {
      setMessages((m) => [...m, makeMessage("agent", `Something went wrong: ${err.message}`)]);
    } finally {
      setSending(false);
    }
  }

  async function handleVerified() {
    setOrderStatus("verified");
    setMessages((m) =>
      m.map((msg) => (msg.showOrder ? { ...msg, orderStatusSnapshot: "verified" } : msg))
    );
    try {
      const intent = await api.createPaymentIntent(cart, currency);
      setClientSecret(intent.clientSecret);
      setTotalFormatted(intent.totalFormatted);
      setStage("payment");
    } catch (err) {
      setMessages((m) => [
        ...m,
        makeMessage(
          "agent",
          `Couldn't start payment: ${err.message}. Make sure a Stripe TEST secret key is set in backend/.env.`
        )
      ]);
      setStage("chat");
    }
  }

  function handlePaid(paymentIntent) {
    setOrderStatus("paid");
    setMessages((m) => [
      ...m.map((msg) => (msg.showOrder ? { ...msg, orderStatusSnapshot: "paid" } : msg)),
      makeMessage("agent", `Payment confirmed. Transaction ${paymentIntent.id} settled in ${currency}.`, {
        receipt: true,
        paymentId: paymentIntent.id
      })
    ]);
    setCart([]);
    setClientSecret(null);
    setStage("chat");
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-mark" aria-hidden="true">◆</span>
          <span className="app__brand-name">Pay, by talking</span>
        </div>
        <label className="app__currency">
          <span>Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </header>

      <main className="thread" ref={threadRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`bubble bubble--${msg.role}`}>
            <p className="bubble__text">{msg.content}</p>
            {msg.showOrder && (
              <OrderCard
                cart={msg.orderSnapshot}
                products={products}
                totalFormatted={msg.orderTotal}
                currency={currency}
                status={msg.orderStatusSnapshot}
              />
            )}
            {msg.receipt && (
              <div className="receipt-id">
                <span>Ref</span>
                <span className="mono">{msg.paymentId}</span>
              </div>
            )}
          </div>
        ))}

        {stage === "liveness" && (
          <div className="bubble bubble--agent">
            <LivenessScan totalFormatted={totalFormatted} onVerified={handleVerified} />
          </div>
        )}

        {stage === "payment" && clientSecret && stripePromise && (
          <div className="bubble bubble--agent">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentSheet totalFormatted={totalFormatted} onPaid={handlePaid} />
            </Elements>
          </div>
        )}

        {stage === "payment" && !stripePromise && (
          <div className="bubble bubble--agent">
            <p className="bubble__text">
              No Stripe publishable key configured. Add <span className="mono">VITE_STRIPE_PUBLISHABLE_KEY</span> (starts with <span className="mono">pk_test_</span>) to frontend/.env to enable real test-mode card entry.
            </p>
          </div>
        )}
      </main>

      {stage === "chat" && (
        <footer className="composer">
          <div className="composer__suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="composer__chip" onClick={() => handleSend(s)} disabled={sending}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="composer__form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me what to buy…"
              aria-label="Message"
              disabled={sending}
            />
            <button type="submit" className="composer__send" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </footer>
      )}
    </div>
  );
}
