var Ledger = artifacts.require("./Ledger");

const DAY_IN_SECONDS = 60 * 60 * 24;
require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(web3.BigNumber))
  .should();

/*
// Removed because wanted to use direct calls with await 
// (it caused problems on my local machine...)
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
*/

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

			await ledger.allowAndDeposit(
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

			await ledger.allowAndDeposit(
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

	describe("calculateAllowedPlusOverdraft",function(){
		it('should return 0 if no allowances',async()=> {
      let allowanceCount = await ledger.getMyAllowancesCount();
      assert.equal(allowanceCount.toNumber(), 0);
			await ledger.calculateAllowedPlusOverdraft(0).should.be.rejectedWith('revert');
		});

		it('should return 150 if 100 + 50% is set',async()=> {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			// 50 percents is 500000
			const overdraft = 50 * 10 ** 5;
			const numPeriods = 2;
			const startDate = new Date("09/09/2018").getTime() / 1000;

			const amount = 100;
			const depositAmount = 100;
			const initialBalance = await web3.eth.getBalance(to);

			await ledger.allowAndDeposit(
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
      let allowanceCount = await ledger.getAllowancesCount({from: to});
      assert.equal(allowanceCount.toNumber(), 2);

			// 0 is an index into the allowances...
			let aapo = await ledger.calculateAllowedPlusOverdraft(0, {from: to}).should.be.fulfilled;
			// 100 + 50% of 100
			assert.equal(aapo.toNumber(), 150);
		});
	});

  describe("Charge logic", function() {
    it("should not allow to charge if no allowances were set before", async () => {
			const to = accounts[1];
			const initialBalance = await web3.eth.getBalance(to);
			const numAllowances = await ledger.getAllowancesCount();
			assert.equal(numAllowances.toNumber(), 0);
			
			const chargeAmount = 100;
			await ledger.charge(0, chargeAmount, { from: to }).should.be.rejectedWith('revert');
		});

    it("should not allow to charge more than AA + OD", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			// 10%
			const overdraft = 10 * 10 ** 5;
			const numPeriods = 1;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const initialBalance = await web3.eth.getBalance(to);

			const amount = 100;
			const depositAmount = 100;
			const chargeAmount = 111;	// more than AA + OD

			await ledger.allowAndDeposit(
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

      let allowanceCount = await ledger.getAllowancesCount({from: to});
      assert.equal(allowanceCount.toNumber(), 1);

			// 0 is index into SideB's allowances
			await ledger.charge(0, chargeAmount, { from: to }).should.be.rejectedWith('revert');
		});
		
    it("should set isOverdrafted flag", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const initialBalance = await web3.eth.getBalance(to);

			const amount = 1 * 10 ** 18;
			const overdraft = 10 * 10 ** 5;	// 10% 
			const depositAmount = 1.1 * 10 ** 18;

			await ledger.allowAndDeposit(
				to,
				amount,
				overdraft,
				interestRate,
				numPeriods,
				DAY_IN_SECONDS,
				startDate,
				{
					from: creator,
					value: depositAmount,
					gasPrice: 0
				}
			);

      let allowanceCount = await ledger.getAllowancesCount({from: to});
      assert.equal(allowanceCount.toNumber(), 1);
			
			const od1 = await ledger.isOverdrafted(creator, to);
			assert.equal(od1, false);

			// more than AA but less than AA + OD
			const chargeAmount = 1.01 * 10 ** 18;
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 });
			const od2 = await ledger.isOverdrafted(creator, to);
			assert.equal(od2, true);

			const postBalance = await web3.eth.getBalance(to);
			assert.equal(
				initialBalance.toNumber() + chargeAmount,
				postBalance.toNumber()
			);
		});

    it("should return wanted amount if enough money", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const initialBalance = await web3.eth.getBalance(to);

			const amount = 1000;
			const overdraft = 10 * 10 ** 5;	// 10% 
			const depositAmount = 1100;

			await ledger.allowAndDeposit(
				to,
				amount,
				overdraft,
				interestRate,
				numPeriods,
				DAY_IN_SECONDS,
				startDate,
				{
					from: creator,
					value: depositAmount,
					gasPrice: 0
				}
			);

      let allowanceCount = await ledger.getAllowancesCount({from: to});
      assert.equal(allowanceCount.toNumber(), 1);
			
			const od1 = await ledger.isOverdrafted(creator, to);
			assert.equal(od1, false);

			// exactly AA
			const chargeAmount = 1000;
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 });
			const od2 = await ledger.isOverdrafted(creator, to);
			assert.equal(od2, false);

			const postBalance = await web3.eth.getBalance(to);
			assert.equal(
				initialBalance.toNumber() + chargeAmount,
				postBalance.toNumber()
			);
		});

    it("should return FRACTION of amount if not enough money (no overdraft)", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const initialBalance = await web3.eth.getBalance(to);

			const overdraft = 0;	// 0% 
			const amount = 1 * 10 ** 18;		// allow 1.000
			const depositAmount = 0.8 * 10 ** 18;		  // but put 0.800

			await ledger.allowAndDeposit(
				to,
				amount,
				overdraft,
				interestRate,
				numPeriods,
				DAY_IN_SECONDS,
				startDate,
				{
					from: creator,
					value: depositAmount,
					gasPrice: 0
				}
			);
			
      let userBalance = await ledger.getDepositBalance.call();
      assert.equal(userBalance, depositAmount);

			// exactly AA, but has only 800
			const chargeAmount = 1 * 10 ** 18;
			const shouldReturn = 0.8 * 10 ** 18;
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 });
			const od2 = await ledger.isOverdrafted(creator, to);
			assert.equal(od2, false);

			const postBalance = await web3.eth.getBalance(to);
			assert.equal(
				initialBalance.toNumber() + shouldReturn,
				postBalance.toNumber()
			);

			// TODO: check that debit token is issued!
		});

    it("should return FRACTION of amount if not enough money (with overdraft)", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const initialBalance = await web3.eth.getBalance(to);

			const overdraft = 10 * 10 ** 5;	// 10%
			const amount = 1 * 10 ** 18;		// allow 1.000
			const depositAmount = 0.8 * 10 ** 18;		  // but put 0.800

			await ledger.allowAndDeposit(
				to,
				amount,
				overdraft,
				interestRate,
				numPeriods,
				DAY_IN_SECONDS,
				startDate,
				{
					from: creator,
					value: depositAmount,
					gasPrice: 0
				}
			);
			
      let userBalance = await ledger.getDepositBalance.call();
      assert.equal(userBalance, depositAmount);

			// more than AA, but less than AA + OD; but has only 800
			const chargeAmount = 1.05 * 10 ** 18;
			const shouldReturn = 0.8 * 10 ** 18;
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 });
			const od2 = await ledger.isOverdrafted(creator, to);
			assert.equal(od2, true);

			const postBalance = await web3.eth.getBalance(to);
			assert.equal(
				initialBalance.toNumber() + shouldReturn,
				postBalance.toNumber()
			);

			// TODO: check that debit token is issued!
		});

  });
});