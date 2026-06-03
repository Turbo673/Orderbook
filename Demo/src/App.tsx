import { useMemo, useState } from "react";
import {
  createInitialMarket,
  processOrder,
  type Aggressor,
  type Level,
  type MarketState,
  type OrderKind,
  type Trade,
} from "./market";

const ORDER_TYPES: { label: string; value: OrderKind }[] = [
  { label: "Limit", value: "limit" },
  { label: "Market", value: "market" },
  { label: "Cancel", value: "cancel" },
  { label: "Modify", value: "modify" },
  { label: "IOC", value: "ioc" },
  { label: "FOK", value: "fok" },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-US");

function formatPrice(price: number) {
  return priceFormatter.format(price);
}

function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString("en-US", {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  });
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "bid" | "ask";
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={accent ? `text-${accent}` : undefined}>{value}</strong>
    </div>
  );
}

function DepthRow({
  level,
  maxQuantity,
  side,
}: {
  level: Level;
  maxQuantity: number;
  side: Aggressor;
}) {
  const width = `${Math.max((level.quantity / maxQuantity) * 100, 4)}%`;

  return (
    <div className={`depth-row depth-${side}`}>
      <div className="depth-fill" style={{ width }} />
      <span className="depth-price">{formatPrice(level.price)}</span>
      <span>{quantityFormatter.format(level.quantity)}</span>
      <span className="depth-orders">{level.orders}</span>
    </div>
  );
}

function SpreadRow({ bids, asks }: { bids: Level[]; asks: Level[] }) {
  const spread = asks[0].price - bids[0].price;
  const midpoint = (asks[0].price + bids[0].price) / 2;

  return (
    <div className="spread-row">
      <span>Spread</span>
      <strong>{formatPrice(spread)}</strong>
      <span>Mid {formatPrice(midpoint)}</span>
    </div>
  );
}

function BookPanel({ market }: { market: MarketState }) {
  const maxQuantity = useMemo(
    () =>
      Math.max(
        ...market.bids.map((level) => level.quantity),
        ...market.asks.map((level) => level.quantity),
      ),
    [market.asks, market.bids],
  );

  return (
    <section className="panel book-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NASDAQ</p>
          <h2>NVDA Market Depth</h2>
        </div>
        <span className="live-dot">NVDA</span>
      </div>

      <div className="depth-header">
        <span>Price</span>
        <span>Size</span>
        <span>Orders</span>
      </div>

      <div className="depth-levels" aria-label="Ask levels">
        {[...market.asks].reverse().map((level) => (
          <DepthRow
            key={`ask-${level.price}`}
            level={level}
            maxQuantity={maxQuantity}
            side="sell"
          />
        ))}
      </div>

      <SpreadRow bids={market.bids} asks={market.asks} />

      <div className="depth-levels" aria-label="Bid levels">
        {market.bids.map((level) => (
          <DepthRow
            key={`bid-${level.price}`}
            level={level}
            maxQuantity={maxQuantity}
            side="buy"
          />
        ))}
      </div>
    </section>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="trade-row">
      <span className={`trade-side trade-${trade.aggressor}`}>
        {trade.aggressor}
      </span>
      <strong className={`text-${trade.aggressor === "buy" ? "bid" : "ask"}`}>
        {formatPrice(trade.price)}
      </strong>
      <span>{quantityFormatter.format(trade.quantity)}</span>
      <time dateTime={trade.timestamp.toISOString()}>
        {formatTime(trade.timestamp)}
      </time>
    </div>
  );
}

function TapePanel({ trades }: { trades: Trade[] }) {
  return (
    <section className="panel tape-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NASDAQ</p>
          <h2>NVDA Trades</h2>
        </div>
        <span className="counter">{trades.length} trades</span>
      </div>

      <div className="trade-header">
        <span>Side</span>
        <span>Price</span>
        <span>Size</span>
        <span>Time</span>
      </div>

      <div className="trade-list" aria-live="polite">
        {trades.length > 0 ? (
          trades.map((trade) => <TradeRow key={trade.id} trade={trade} />)
        ) : (
          <div className="empty-state">
            NVDA trades appear when marketable orders consume available liquidity.
          </div>
        )}
      </div>
    </section>
  );
}

function App() {
  const [market, setMarket] = useState(createInitialMarket);
  const [orderType, setOrderType] = useState<OrderKind>("limit");
  const [side, setSide] = useState<Aggressor>("buy");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("100.00");
  const [status, setStatus] = useState("Ready to process an NVDA order.");

  const bestBid = market.bids[0].price;
  const bestAsk = market.asks[0].price;
  const lastTrade = market.trades[0];

  function resetMarket() {
    setMarket(createInitialMarket());
    setStatus("NVDA order book reset.");
  }

  function submitOrder() {
    const parsedQuantity = Number.parseInt(quantity, 10);
    const parsedPrice = Number.parseFloat(price);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setStatus("Enter a quantity greater than zero.");
      return;
    }

    if (orderType !== "market" && !Number.isFinite(parsedPrice)) {
      setStatus("Enter a valid limit price.");
      return;
    }

    const result = processOrder(market, {
      kind: orderType,
      side,
      quantity: parsedQuantity,
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    });

    setMarket(result.market);
    setStatus(result.message);
  }

  return (
    <main className="app-shell">
      <section className="summary-grid" aria-label="Market summary">
        <Metric label="Best bid" value={formatPrice(bestBid)} accent="bid" />
        <Metric
          label="Spread"
          value={formatPrice(bestAsk - bestBid)}
        />
        <Metric label="Best ask" value={formatPrice(bestAsk)} accent="ask" />
        <Metric
          label="Last trade"
          value={lastTrade ? `${formatPrice(lastTrade.price)} / ${lastTrade.quantity}` : "--"}
        />
      </section>

      <section className="workspace-grid">
        <BookPanel market={market} />
        <TapePanel trades={market.trades} />
      </section>

      <section className="panel order-panel" aria-label="NVDA order entry">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NVDA</p>
            <h2>NASDAQ Order Entry</h2>
          </div>
          <button className="quiet-button" onClick={resetMarket}>
            Reset book
          </button>
        </div>

        <div className="order-form">
          <div className="order-type-group">
            <span className="control-label">Order type</span>
            <div className="segmented-control order-types">
              {ORDER_TYPES.map((option) => (
                <button
                  aria-pressed={orderType === option.value}
                  className={orderType === option.value ? "selected" : undefined}
                  key={option.value}
                  onClick={() => setOrderType(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="order-fields">
            <div className="field-group">
              <span className="control-label">Side</span>
              <div className="segmented-control">
                <button
                  aria-pressed={side === "buy"}
                  className={side === "buy" ? "selected buy-button" : "buy-button"}
                  onClick={() => setSide("buy")}
                >
                  Buy
                </button>
                <button
                  aria-pressed={side === "sell"}
                  className={side === "sell" ? "selected sell-button" : "sell-button"}
                  onClick={() => setSide("sell")}
                >
                  Sell
                </button>
              </div>
            </div>

            <label className="field-group">
              <span className="control-label">Quantity</span>
              <input
                inputMode="numeric"
                min="1"
                onChange={(event) => setQuantity(event.target.value)}
                type="number"
                value={quantity}
              />
            </label>

            <label className="field-group">
              <span className="control-label">Price</span>
              <input
                disabled={orderType === "market"}
                inputMode="decimal"
                onChange={(event) => setPrice(event.target.value)}
                step="0.05"
                type="number"
                value={price}
              />
            </label>
          </div>

          <button className="primary-button process-button" onClick={submitOrder}>
            Process order
          </button>
        </div>

        <p className="order-status" aria-live="polite">
          {status}
        </p>
      </section>
    </main>
  );
}

export default App;
