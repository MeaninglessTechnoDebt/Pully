#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganachecli instance that we started (if we started one).
  if [ -n "$ganachecli_pid" ]; then
    kill -9 $ganachecli_pid
  fi
}

ganachecli_running() {
  nc -z localhost 8545
}

if ganachecli_running; then
  echo "Using existing ganache-cli instance"
else
  echo "Starting ganache-cli"
  npx ganache-cli --gasLimit 0xfffffffffff --port 8545 --defaultBalanceEther 200\
  > /dev/null &
  ganachecli_pid=$!
fi

truffle migrate
truffle test $1

