// using C++20
#include "OrderBook.h"
#include <iostream>


int main() {
    OrderBook orderbook;
    const OrderId orderId = 1;
    orderbook.AddOrder(std::make_shared<Order>(OrderType::GoodTillCancel, orderId, Side::Buy, 100, 10));
    std::cout << orderbook.Size() << std::endl; // true
    orderbook.CancelOrder(orderId);
    std::cout << orderbook.Size() << std::endl; // false
    return 0;
}
