# Multi Order Book Matching Engine
A C++ matching engine that implements price time priority, multiple order types, and real time trades
---

### Demo 
[*Working on the Demo]

- Real-time order matching 
- Best bid/ask updates
- Trade execution output

---

## Features

- Price time matching
- Limit, Market, Cancel and Modify orders
- Partial fills
- Immediate or Cancel (IOC) and Fill or Kill (FOK)
- Execution report generation
- CSV order replay
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



