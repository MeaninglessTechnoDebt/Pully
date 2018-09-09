/* global artifacts */
/* eslint no-undef: "error" */

const Ledger = artifacts.require("Ledger");
const DutchAuction = artifacts.require("DutchAuction");

module.exports = function(deployer, network, accounts) {  
	const account = accounts[0]
	return deployer
		.then(() => {
			return deployer.deploy(Ledger);
		})
		.then((ledger) => {
			// zero fees
			return deployer.deploy(DutchAuction, ledger.address, 0);
		})
}

