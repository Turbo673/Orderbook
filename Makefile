# Makefile for OrderBook
DEBUG = -g

VERSION = -std=c++20 -Wall

CXX = g++

CFLAGS = -pedantic -Wall -Wextra $(VERSION) $(DEBUG) -Iinclude

TARGET = orderBook.exe
TEST = test.exe

SRC = src/main.cpp src/Orderbook.cpp
UNITTEST_SRC = Testing/test.cpp src/Orderbook.cpp

all:
	$(CXX) $(CFLAGS) $(SRC) -o $(TARGET)

run:
	$(TARGET)

unit:
	$(CXX) $(CFLAGS) $(UNITTEST_SRC) -o $(TEST)

clean:
	del $(TARGET) $(TEST) *.o /Q
	@echo clean done