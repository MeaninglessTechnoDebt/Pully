var Ledger = artifacts.require('./Ledger');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('Ledger', (accounts) => {
	let ledger;
	const creator = accounts[0];

	before(async() => {

	});

	beforeEach(async() => {
		ledger = await Ledger.new();
	});

	describe('method1()', function () {
		it('should do smthng',async() => {
			console.log('Run...');
		});
	});

});
