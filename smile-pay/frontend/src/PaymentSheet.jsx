import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

export default function PaymentSheet({ totalFormatted, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required"
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Check the card details and try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid(paymentIntent);
    } else {
      setError("Payment did not complete. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="payment-sheet" onSubmit={handleSubmit}>
      <div className="payment-sheet__header">
        <span>Pay</span>
        <span className="payment-sheet__amount">{totalFormatted}</span>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      <p className="payment-sheet__test-hint">
        Test mode — use card <span className="mono">4242 4242 4242 4242</span>, any future expiry, any CVC.
      </p>

      {error && <p className="payment-sheet__error" role="alert">{error}</p>}

      <button
        type="submit"
        className="payment-sheet__submit"
        disabled={!stripe || submitting}
      >
        {submitting ? "Processing…" : `Pay ${totalFormatted}`}
      </button>
    </form>
  );
}
