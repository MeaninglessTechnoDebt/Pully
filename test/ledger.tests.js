var Ledger = artifacts.require("./Ledger");

const DAY_IN_SECONDS = 60 * 60 * 24;
require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(web3.BigNumber))
  .should();

function createAllowance(
  ledger,
  creator,
  to,
  amount,
  interestRate,
  overdraft,
  numPeriods,
  startDate,
  depositAmount
) {
  ledger.allowAndDeposit(
    to,
    amount,
    overdraft,
    interestRate,
    numPeriods,
    DAY_IN_SECONDS,
    startDate,
    {
      from: creator,
      value: depositAmount
    }
  );
}

contract("Ledger", accounts => {
  let ledger;
  const creator = accounts[0];

  before(async () => {});

  beforeEach(async () => {
    ledger = await Ledger.new();
  });

  describe("Basic getters and setters", function() {
    it("should deposit eth to contract and alter user state", async () => {
      ledger.deposit({ from: creator, value: 1 * 10 ** 18 });
      let userBalance = await ledger.getDepositBalance.call();
      assert.equal(userBalance, 1 * 10 ** 18);
    });

    it("should withdraw eth and alter state", async () => {
      ledger.deposit({ from: creator, value: 1 * 10 ** 18 });
      ledger.withdraw(1 * 10 ** 18, { from: creator });
      let userBalance = await ledger.getDepositBalance.call();
      assert.equal(userBalance, 0);
    });
  });

  describe("Creating allowances", function() {
    it("should create an allowance with no deposit", async () => {
      const to = accounts[1];
      const amount = 1 * 10 ** 18;
      const interestRate = 1 * 10 ** 5;
      const overdraft = 12 * 10 ** 5;
      const numPeriods = 2;
      const startDate = new Date("09/09/2018").getTime() / 1000;
      const depositAmount = 0;
      createAllowance(
        ledger,
        creator,
        to,
        amount,
        interestRate,
        overdraft,
        numPeriods,
        startDate,
        depositAmount
      );
      let allowanceCount = await ledger.getMyAllowancesCount.call();
      assert.equal(allowanceCount.toNumber(), numPeriods);
      let createdAllowance = await ledger.getMyAllowanceInfo(0);
      createdAllowance[1] = createdAllowance[1].toNumber();
      createdAllowance[2] = createdAllowance[2].toNumber();
      createdAllowance[3] = createdAllowance[3].toNumber();
      createdAllowance[4] = createdAllowance[4].toNumber();
      createdAllowance[5] = createdAllowance[5].toNumber();
      assert.deepEqual(createdAllowance, [
        to,
        amount,
        overdraft,
        interestRate,
        DAY_IN_SECONDS,
        startDate
      ]);
    });

    it("should create an allowance with a deposit", async () => {
      const to = accounts[1];
      const amount = 1 * 10 ** 18;
      const interestRate = 1 * 10 ** 5;
      const overdraft = 12 * 10 ** 5;
      const numPeriods = 2;
      const startDate = new Date("09/09/2018").getTime() / 1000;
      const depositAmount = 1 * 10 ** 18;
      createAllowance(
        ledger,
        creator,
        to,
        amount,
        interestRate,
        overdraft,
        numPeriods,
        startDate,
        depositAmount
      );
      let allowanceCount = await ledger.getMyAllowancesCount.call();
      assert.equal(allowanceCount.toNumber(), numPeriods);
      let createdAllowance = await ledger.getMyAllowanceInfo(0);
      createdAllowance[1] = createdAllowance[1].toNumber();
      createdAllowance[2] = createdAllowance[2].toNumber();
      createdAllowance[3] = createdAllowance[3].toNumber();
      createdAllowance[4] = createdAllowance[4].toNumber();
      createdAllowance[5] = createdAllowance[5].toNumber();
      assert.deepEqual(createdAllowance, [
        to,
        amount,
        overdraft,
        interestRate,
        DAY_IN_SECONDS,
        startDate
      ]);
      let userBalance = await ledger.getDepositBalance.call();
      assert.equal(userBalance.toNumber(), depositAmount);
    });
  });

  describe("Charge logic", function() {
    it("should allow regular charge", async () => {
      const to = accounts[1];
      const amount = 2 * 10 ** 18;
      const interestRate = 1 * 10 ** 5;
      const overdraft = 12 * 10 ** 5;
      const numPeriods = 2;
      const startDate = new Date("09/09/2018").getTime() / 1000;
      const depositAmount = 1 * 10 ** 18;
      const initialBalance = await web3.eth.getBalance(to);
      const chargeAmount = 0.5 * 10 ** 18;
      createAllowance(
        ledger,
        creator,
        to,
        amount,
        interestRate,
        overdraft,
        numPeriods,
        startDate,
        depositAmount
      );
      ledger.charge(chargeAmount, { from: to });
      const postBalance = await web3.eth.getBalance(to);
      assert.equal(
        initialBalance.toNumber() + chargeAmount,
        postBalance.toNumber()
      );
    });
  });
});
