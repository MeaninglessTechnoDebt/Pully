var Ledger = artifacts.require("./Ledger");

const DAY_IN_SECONDS = 60 * 60 * 24;
require("chai")
	.use(require("chai-as-promised"))
	.use(require("chai-bignumber")(web3.BigNumber))
	.should();

contract("Ledger", accounts => {
	let ledger;
	const creator = accounts[0];

	before(async () => {});

	beforeEach(async () => {
		ledger = await Ledger.new();
	});

	describe("ledger", function() {
		it("should allow to deposit eth to contract and alter user state", async () => {
			ledger.deposit({ from: creator, value: 1 * 10 ** 18 });
			let userBalance = await ledger.getDepositBalance.call();
			assert.equal(userBalance, 1 * 10 ** 18);
		});

		it("should allow to withdraw eth and alter state", async () => {
			ledger.deposit({ from: creator, value: 1 * 10 ** 18 });
			ledger.withdraw(1 * 10 ** 18, { from: creator });
			let userBalance = await ledger.getDepositBalance.call();
			assert.equal(userBalance, 0);
		});

		it("should allow to create an allowance with no deposit", async () => {
			const to = accounts[1];
			const amount = 1 * 10 ** 18;
			const interestRate = 1 * 10 ** 5;
			const overdraft = 12 * 10 ** 5;
			const numPeriods = 2;
			const startDate = new Date("09/09/2018").getTime() / 1000;
			const depositAmount = 0;

			await ledger.tokenOfOwnerByIndex(to, 0).should.be.rejectedWith('revert');

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
			createdAllowance[6] = createdAllowance[6];
			assert.deepEqual(createdAllowance, [
				to,
				amount,
				overdraft,
				interestRate,
				DAY_IN_SECONDS,
				startDate,
				false
			]);

			// check that ERC721 is minted
			// WARNING: there are no means to get ERC721 info other than that...
			const tokenId = await ledger.tokenOfOwnerByIndex(to, 0).should.be.fulfilled;
			assert.notEqual(tokenId.toNumber(),0);
		});

		it("should allow to create an allowance with a deposit", async () => {
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
			createdAllowance[6] = createdAllowance[6];
			assert.deepEqual(createdAllowance, [
				to,
				amount,
				overdraft,
				interestRate,
				DAY_IN_SECONDS,
				startDate,
				false
			]);
			let userBalance = await ledger.getDepositBalance.call();
			assert.equal(userBalance.toNumber(), depositAmount);

			// check that ERC721 is minted
			const tokenId = await ledger.tokenOfOwnerByIndex(to, 0).should.be.fulfilled;
			assert.notEqual(tokenId.toNumber(),0);
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

	describe("charge", function() {
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

		it("should not charge if startingDate is after now", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = (Date.now() / 1000) + DAY_IN_SECONDS;
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
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 }).should.be.rejectedWith('revert');
		});

		it("should not charge if startingDate is before the end", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = (Date.now() / 1000) - 2 * DAY_IN_SECONDS;
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
			await ledger.charge(0, chargeAmount, { from: to, gasPrice: 0 }).should.be.rejectedWith('revert');
		});

		it("should set isOverdrafted flag", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = Date.now() / 1000;
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
			const startDate = Date.now() / 1000;
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
			const startDate = Date.now() / 1000;
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

			const tokenId = await ledger.tokenOfOwnerByIndex(to, 0).should.be.fulfilled;
			assert.notEqual(tokenId.toNumber(),0);

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

			// check that additional allowance (plus interest) token is issued!
			const tokenId2 = await ledger.tokenOfOwnerByIndex(to, 1).should.be.fulfilled;
			assert.notEqual(tokenId2.toNumber(),0);
		});

		it("should return FRACTION of amount if not enough money (with overdraft)", async () => {
			const to = accounts[1];
			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = Date.now() / 1000;
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

			let allowanceCount1 = await ledger.getAllowancesCount({from: to});
			assert.equal(allowanceCount1.toNumber(), 1);

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

			// check that debit token is issued!
			const tokenId2 = await ledger.tokenOfOwnerByIndex(to, 1).should.be.fulfilled;
			assert.notEqual(tokenId2.toNumber(),0);

			// check that allowance is issued as well
			let allowanceCount = await ledger.getAllowancesCount({from: to});
			assert.equal(allowanceCount.toNumber(), 2);
		});
	});

	describe("transferAllowance", function() {
		it("should not transer if no allowances", async () => {
			const to = accounts[1];
			const extraGuy = accounts[2];
			ledger.transferAllowance(0, extraGuy, {from: to}).should.be.rejectedWith('revert');
		});

		it("should not allow to transer if not transferrable", async () => {
			const to = accounts[1];
			const extraGuy = accounts[2];

			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = Date.now() / 1000;
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

			// try to transfer it
			ledger.transferAllowance(0, extraGuy, {from: to}).should.be.rejectedWith('revert');
		});

		it("should transfer additional allowance", async () => {
			const to = accounts[1];
			const extraGuy = accounts[2];

			const interestRate = 1 * 10 ** 5;
			const numPeriods = 1;
			const startDate = Date.now() / 1000;
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

			const tokenId = await ledger.tokenOfOwnerByIndex(to, 0).should.be.fulfilled;
			assert.notEqual(tokenId.toNumber(),0);

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

			// check that additional allowance (plus interest) token is issued!
			const tokenId2 = await ledger.tokenOfOwnerByIndex(to, 1).should.be.fulfilled;
			assert.notEqual(tokenId2.toNumber(),0);

			const allowanceCount2before = await ledger.getAllowancesCount({from: extraGuy});
			assert.equal(allowanceCount2before.toNumber(), 0);

			// transfer 
			ledger.transferAllowance(1, extraGuy, {from: to}).should.be.fulfilled;

			// do additional checks
			const tokenIdExtra = await ledger.tokenOfOwnerByIndex(extraGuy, 0).should.be.fulfilled;
			assert.notEqual(tokenIdExtra.toNumber(),0);

			const allowanceCount1 = await ledger.getAllowancesCount({from: to});
			assert.equal(allowanceCount1.toNumber(), 2);

			const allowanceCount2 = await ledger.getAllowancesCount({from: extraGuy});
			assert.equal(allowanceCount2.toNumber(), 1);
		});
	});
});
