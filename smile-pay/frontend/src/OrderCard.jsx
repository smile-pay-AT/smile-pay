import React from "react";

export default function OrderCard({ cart, products, totalFormatted, currency, status }) {
  if (cart.length === 0) return null;

  return (
    <div className="order-card" role="group" aria-label="Order summary">
      <div className="order-card__header">
        <span className="order-card__label">Order</span>
        <span className={`order-card__status order-card__status--${status}`}>
          {status === "verified" ? "Verified" : status === "paid" ? "Paid" : "Open"}
        </span>
      </div>

      <ul className="order-card__lines">
        {cart.map((item) => {
          const product = products[item.productId];
          if (!product) return null;
          return (
            <li key={item.productId} className="order-card__line">
              <span className="order-card__glyph" aria-hidden="true">{product.image}</span>
              <span className="order-card__line-text">
                <span className="order-card__line-name">{product.name}</span>
                <span className="order-card__line-variant">{product.variant}</span>
              </span>
              <span className="order-card__line-qty">×{item.quantity}</span>
            </li>
          );
        })}
      </ul>

      <div className="order-card__total">
        <span>Total · {currency}</span>
        <span className="order-card__total-amount">{totalFormatted}</span>
      </div>
    </div>
  );
}
