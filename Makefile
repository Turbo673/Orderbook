CXX = g++

CFLAGS = -std=c++20 -Wall -Wextra -pedantic -Iinclude
DEBUG_FLAGS = -std=c++20 -Wall -Wextra -pedantic -g -Iinclude

ifeq ($(debug),1)
	CURRENT_FLAGS := $(DEBUG_FLAGS)
else
	CURRENT_FLAGS := $(CFLAGS)
endif

TARGET = orderBook.exe
TEST = test.exe

SRC = src/main.cpp src/Orderbook.cpp
UNITTEST_SRC = tests/test.cpp src/Orderbook.cpp

all:
	$(CXX) $(CURRENT_FLAGS) $(SRC) -o $(TARGET)

unit:
	$(CXX) $(CURRENT_FLAGS) $(UNITTEST_SRC) -o $(TEST)

run:
	$(TARGET)

clean:
	del $(TARGET) $(TEST) *.o /Q

.PHONY: all run unit clean