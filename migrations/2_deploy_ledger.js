/* global artifacts */
/* eslint no-undef: "error" */

const Ledger = artifacts.require("Ledger")

module.exports = function(deployer, network, accounts) {  
  const account = accounts[0]
  return deployer
    .then(() => {
      return deployer.deploy(Ledger, 0)
    })
}

