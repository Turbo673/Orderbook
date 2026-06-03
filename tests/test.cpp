#include "test.h"
#include "../include/OrderBook.h"

namespace {

OrderPointer MakeOrder(
    OrderId orderId,
    Side side,
    Price price,
    Quantity quantity,
    OrderType orderType = OrderType::GoodTillCancel)
{
    return std::make_shared<Order>(orderType, orderId, side, price, quantity);
}

} // namespace

TEST_CASE("adding orders aggregates quantity at each price level")
{
    OrderBook orderBook;

    CHECK(orderBook.AddOrder(MakeOrder(1, Side::Buy, 100, 4)).empty());
    CHECK(orderBook.AddOrder(MakeOrder(2, Side::Buy, 100, 6)).empty());
    CHECK(orderBook.Size() == 2);

    const auto levels = orderBook.GetOrderInfos();
    REQUIRE(levels.GetBids().size() == 1);
    CHECK(levels.GetBids()[0].price_ == 100);
    CHECK(levels.GetBids()[0].quantity_ == 10);
    CHECK(levels.GetAsks().empty());
}

TEST_CASE("cancelling an order removes its remaining quantity")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Buy, 100, 4));
    orderBook.AddOrder(MakeOrder(2, Side::Buy, 100, 6));

    orderBook.CancelOrder(1);

    CHECK(orderBook.Size() == 1);
    const auto levels = orderBook.GetOrderInfos();
    REQUIRE(levels.GetBids().size() == 1);
    CHECK(levels.GetBids()[0].quantity_ == 6);
}

TEST_CASE("crossed limit orders execute and leave the partial remainder")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Buy, 101, 10));

    const auto trades = orderBook.AddOrder(MakeOrder(2, Side::Sell, 100, 4));

    REQUIRE(trades.size() == 1);
    CHECK(trades[0].GetBidTrade().orderId_ == 1);
    CHECK(trades[0].GetAskTrade().orderId_ == 2);
    CHECK(trades[0].GetBidTrade().quantity_ == 4);
    CHECK(trades[0].GetAskTrade().quantity_ == 4);
    CHECK(orderBook.Size() == 1);

    const auto levels = orderBook.GetOrderInfos();
    REQUIRE(levels.GetBids().size() == 1);
    CHECK(levels.GetBids()[0].price_ == 101);
    CHECK(levels.GetBids()[0].quantity_ == 6);
    CHECK(levels.GetAsks().empty());
}

TEST_CASE("modifying an order replaces its resting price and quantity")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Buy, 100, 4));

    CHECK(orderBook.ModifyOrder(OrderModify(1, Side::Buy, 102, 9)).empty());

    CHECK(orderBook.Size() == 1);
    const auto levels = orderBook.GetOrderInfos();
    REQUIRE(levels.GetBids().size() == 1);
    CHECK(levels.GetBids()[0].price_ == 102);
    CHECK(levels.GetBids()[0].quantity_ == 9);
}

TEST_CASE("fill or kill rejects an order when full quantity is unavailable")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Sell, 101, 3));

    const auto trades = orderBook.AddOrder(
        MakeOrder(2, Side::Buy, 101, 5, OrderType::FillOrKill));

    CHECK(trades.empty());
    CHECK(orderBook.Size() == 1);

    const auto levels = orderBook.GetOrderInfos();
    CHECK(levels.GetBids().empty());
    REQUIRE(levels.GetAsks().size() == 1);
    CHECK(levels.GetAsks()[0].quantity_ == 3);
}

TEST_CASE("fill and kill cancels quantity left after an immediate partial fill")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Sell, 101, 3));

    const auto trades = orderBook.AddOrder(
        MakeOrder(2, Side::Buy, 101, 5, OrderType::FillandKill));

    REQUIRE(trades.size() == 1);
    CHECK(trades[0].GetBidTrade().quantity_ == 3);
    CHECK(orderBook.Size() == 0);

    const auto levels = orderBook.GetOrderInfos();
    CHECK(levels.GetBids().empty());
    CHECK(levels.GetAsks().empty());
}

TEST_CASE("market order consumes available ask levels in price order")
{
    OrderBook orderBook;
    orderBook.AddOrder(MakeOrder(1, Side::Sell, 101, 3));
    orderBook.AddOrder(MakeOrder(2, Side::Sell, 102, 4));

    const auto trades = orderBook.AddOrder(
        std::make_shared<Order>(3, Side::Buy, 5));

    REQUIRE(trades.size() == 2);
    CHECK(trades[0].GetAskTrade().price_ == 101);
    CHECK(trades[0].GetAskTrade().quantity_ == 3);
    CHECK(trades[1].GetAskTrade().price_ == 102);
    CHECK(trades[1].GetAskTrade().quantity_ == 2);
    CHECK(orderBook.Size() == 1);

    const auto levels = orderBook.GetOrderInfos();
    REQUIRE(levels.GetAsks().size() == 1);
    CHECK(levels.GetAsks()[0].price_ == 102);
    CHECK(levels.GetAsks()[0].quantity_ == 2);
}
