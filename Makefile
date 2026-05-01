# Makefile for Orderbook
DEBUG = -g

VERSION = -std=c++20 -Wall

CXX = g++

CFLAGS = -pedantic -Wall -Wextra $(VERSION) $(DEBUG)

TARGET = orderbook.exe
TEST = test.exe

SRC = main.cpp OrderBook.cpp
UNITTEST_SRC = Testing/test.cpp OrderBook.cpp

all:
	$(CXX) $(CFLAGS) $(SRC) -o $(TARGET)

run:
	$(TARGET)

unit:
	$(CXX) $(CFLAGS) $(UNITTEST_SRC) -o $(TEST)

clean:
	del $(TARGET) $(TEST) *.o  /Q
	@echo clean done