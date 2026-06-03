# Multi Order Book Matching Engine
A C++ matching engine that implements price time priority, multiple order types, and real time trades
---

### Demo (TypeScript + React)

- Nasdaq-style NVDA order-book demo
- Best bid/ask updates
- NVDA trade updates

Run the visualizer:

```powershell
cd Demo
npm install
npm run dev
```

The current UI uses a deterministic TypeScript simulation and is not connected to
the C++ engine yet. Its typed snapshot and trade-event boundary is intended to
be replaced by an HTTP or WebSocket adapter over the C++ engine.

---

## Features

- Price time matching
- Limit, Market, Cancel and Modify orders
- Partial fills
- Immediate or Cancel (IOC) and Fill or Kill (FOK)
- Execution report generation
- CSV order processing
- Benchmark testing

---

### System Design


### Data Structures
- unordered_map for looking up, cancel/modify, and for fast efficency O(1)
- FIFO queues provides priority at each price level
- Price levels groups orders by price for efficient mathing

### Algorithm/Logic for Matching

- Buy orders match against lowest sell prices
- Sell orders match agianst highes



