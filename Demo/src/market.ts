export type Aggressor = "buy" | "sell";
export type OrderKind = "limit" | "market" | "cancel" | "modify" | "ioc" | "fok";

export interface Level {
  price: number;
  quantity: number;
  orders: number;
}

export interface Trade {
  id: number;
  price: number;
  quantity: number;
  aggressor: Aggressor;
  timestamp: Date;
}

export interface MarketState {
  bids: Level[];
  asks: Level[];
  trades: Trade[];
  sequence: number;
}

export interface OrderRequest {
  kind: OrderKind;
  side: Aggressor;
  quantity: number;
  price: number;
}

export interface OrderResult {
  market: MarketState;
  message: string;
}

const DEPTH_LEVELS = 9;
const PRICE_STEP = 0.05;

function noise(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function levelQuantity(seed: number) {
  return 20 + Math.floor(noise(seed) * 78);
}

function levelOrders(seed: number) {
  return 1 + Math.floor(noise(seed * 2.3) * 7);
}

function roundPrice(price: number) {
  return Math.round(price * 100) / 100;
}

function createLevel(price: number, seed: number): Level {
  return {
    price: roundPrice(price),
    quantity: levelQuantity(seed),
    orders: levelOrders(seed),
  };
}

export function createInitialMarket(): MarketState {
  return {
    asks: Array.from({ length: DEPTH_LEVELS }, (_, index) =>
      createLevel(100.05 + index * PRICE_STEP, index + 11),
    ),
    bids: Array.from({ length: DEPTH_LEVELS }, (_, index) =>
      createLevel(99.95 - index * PRICE_STEP, index + 31),
    ),
    trades: [],
    sequence: 0,
  };
}

function sortLevels(levels: Level[], side: Aggressor) {
  return [...levels].sort((left, right) =>
    side === "buy" ? right.price - left.price : left.price - right.price,
  );
}

function fillDepth(levels: Level[], side: Aggressor, sequence: number) {
  const filled = sortLevels(levels, side);

  while (filled.length < DEPTH_LEVELS) {
    const edge =
      filled[filled.length - 1]?.price ?? (side === "buy" ? 99.95 : 100.05);
    const price = side === "buy" ? edge - PRICE_STEP : edge + PRICE_STEP;
    filled.push(createLevel(price, sequence + 89 + filled.length));
  }

  return filled.slice(0, DEPTH_LEVELS);
}

function addRestingLevel(
  levels: Level[],
  side: Aggressor,
  price: number,
  quantity: number,
) {
  const existing = levels.find((level) => level.price === price);

  if (existing) {
    existing.quantity += quantity;
    existing.orders += 1;
  } else {
    levels.push({ price, quantity, orders: 1 });
  }

  return sortLevels(levels, side);
}

function canTrade(side: Aggressor, price: number, contraPrice: number) {
  return side === "buy" ? contraPrice <= price : contraPrice >= price;
}

function executeOrder(
  previous: MarketState,
  request: OrderRequest,
): OrderResult {
  const sequence = previous.sequence + 1;
  let bids = previous.bids.map((level) => ({ ...level }));
  let asks = previous.asks.map((level) => ({ ...level }));
  const contraLevels = request.side === "buy" ? asks : bids;
  const eligibleLevels = contraLevels.filter(
    (level) =>
      request.kind === "market" || canTrade(request.side, request.price, level.price),
  );
  const available = eligibleLevels.reduce(
    (total, level) => total + level.quantity,
    0,
  );

  if (request.kind === "fok" && available < request.quantity) {
    return {
      market: previous,
      message: `FOK rejected: only ${available} shares are available at the limit price.`,
    };
  }

  let remaining = request.quantity;
  const executedTrades: Trade[] = [];

  for (const level of eligibleLevels) {
    if (remaining === 0) {
      break;
    }

    const quantity = Math.min(remaining, level.quantity);
    level.quantity -= quantity;
    remaining -= quantity;
    executedTrades.push({
      id: sequence * 100 + executedTrades.length,
      price: level.price,
      quantity,
      aggressor: request.side,
      timestamp: new Date(),
    });
  }

  const updatedContraLevels = contraLevels.filter((level) => level.quantity > 0);
  if (request.side === "buy") {
    asks = fillDepth(updatedContraLevels, "sell", sequence);
  } else {
    bids = fillDepth(updatedContraLevels, "buy", sequence);
  }

  if (request.kind === "limit" && remaining > 0) {
    if (request.side === "buy") {
      bids = fillDepth(
        addRestingLevel(bids, "buy", request.price, remaining),
        "buy",
        sequence,
      );
    } else {
      asks = fillDepth(
        addRestingLevel(asks, "sell", request.price, remaining),
        "sell",
        sequence,
      );
    }
  }

  const filled = request.quantity - remaining;
  const disposition =
    request.kind === "limit" && remaining > 0
      ? `${remaining} shares resting`
      : remaining > 0
        ? `${remaining} shares canceled`
        : "fully filled";

  return {
    market: {
      bids,
      asks,
      sequence,
      trades: [...executedTrades.reverse(), ...previous.trades].slice(0, 18),
    },
    message: `${request.kind.toUpperCase()} ${request.side}: ${filled} shares filled, ${disposition}.`,
  };
}

function cancelOrder(previous: MarketState, request: OrderRequest): OrderResult {
  const sequence = previous.sequence + 1;
  let bids = previous.bids.map((level) => ({ ...level }));
  let asks = previous.asks.map((level) => ({ ...level }));
  const levels = request.side === "buy" ? bids : asks;
  const target =
    levels.find((level) => level.price === request.price) ?? levels[0];
  const canceled = Math.min(request.quantity, target.quantity);

  target.quantity -= canceled;
  target.orders = Math.max(target.orders - 1, 0);

  if (request.side === "buy") {
    bids = fillDepth(levels.filter((level) => level.quantity > 0), "buy", sequence);
  } else {
    asks = fillDepth(levels.filter((level) => level.quantity > 0), "sell", sequence);
  }

  return {
    market: {
      bids,
      asks,
      trades: previous.trades,
      sequence,
    },
    message: `CANCEL ${request.side}: removed ${canceled} shares at ${formatPrice(target.price)}.`,
  };
}

function modifyOrder(previous: MarketState, request: OrderRequest): OrderResult {
  const sequence = previous.sequence + 1;
  let bids = previous.bids.map((level) => ({ ...level }));
  let asks = previous.asks.map((level) => ({ ...level }));
  const levels = request.side === "buy" ? bids : asks;
  const target =
    levels.find((level) => level.price === request.price) ?? levels[0];
  const previousQuantity = target.quantity;

  target.quantity = request.quantity;

  return {
    market: {
      bids: request.side === "buy" ? fillDepth(levels, "buy", sequence) : bids,
      asks: request.side === "sell" ? fillDepth(levels, "sell", sequence) : asks,
      trades: previous.trades,
      sequence,
    },
    message: `MODIFY ${request.side}: ${formatPrice(target.price)} changed from ${previousQuantity} to ${request.quantity} shares.`,
  };
}

function formatPrice(price: number) {
  return price.toFixed(2);
}

export function processOrder(
  previous: MarketState,
  request: OrderRequest,
): OrderResult {
  const normalizedRequest = {
    ...request,
    price: roundPrice(request.price),
    quantity: Math.max(1, Math.floor(request.quantity)),
  };

  if (normalizedRequest.kind === "cancel") {
    return cancelOrder(previous, normalizedRequest);
  }

  if (normalizedRequest.kind === "modify") {
    return modifyOrder(previous, normalizedRequest);
  }

  return executeOrder(previous, normalizedRequest);
}
