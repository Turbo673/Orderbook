#pragma once
#include <vector>
#include "LevelInfo.h"


// Order book can have 2 sides
class OrderbookLevelInfos {
    public:
    OrderbookLevelInfos(const LevelInfos& bids, const LevelInfos& asks)
        : bids_ { bids }
        , asks_{ asks }
    { }
        const LevelInfos& GetBids() const {return bids_; }
        const LevelInfos& GetAsks() const {return asks_;}
    private:
    LevelInfos bids_;
    LevelInfos asks_;
};

