<p align="center">
  <img alt="TechnoDebit logo" src="https://i.imgsafe.org/4e/4e0fda4886.png" height="250"/>

  <h3 align="center">Pully</h3>
  <p align="center">"Direct debit made easy!"</p>
</p>

## Tech Reqs
https://docs.google.com/document/d/1pQy_FLmfn-ToRTYN7v-xtg1LsAVGXrNsgbfozeCWV9A/edit?usp=sharing

## Ledger Contract (NFT registry)
https://rinkeby.etherscan.io/address/0x7cf652e0d20ba4f590f6951347f6ce673c156520

## Description
Direct Debit is a simple concept that has widespread usage in todays economy.
Allowing the payer to provide a "pull" permission to the payee to withdraw money from their account. 

It's the 3rd most popular payment method in the UK, the source of 25% of *all* transactions in Germany and accounts for 45% of all banking transactions in the Netherlands.
It's also extremely regulated, often limited to domestic transfers only or requiring jumps through regulatory hops (like the UK direct debit gurantee).

mmmmmm sounds to us like a prime target for some blockchain magic.
So with the help of the mentors of ETHBerlin (special thanks to the dharma team both for hands on support as well as inspiration) we've built *Pully*.
An easy to use direct debit system running on ethereum.

It's as simple as:
1. Going to our website (TODO: add link) (or running a locally hosted version)
2. Adding a benefactor 
3. Funding your expense account

And voila, you have just issued a direct debit order on-chain.

Now here is where things get interesting, (and better than the existing system).
We are issuing the **direct debit rights as ERC721s (a.k.a. non fungible tokens)**!!!
Meaning if the payer hasn't put in enough money the payee now has a few things he can do about it.

1. Sell the withdrawl right to someone else. Maybe via the **[Dutch Auction contract](https://github.com/MeaninglessTechnoDebt/TechnoDebit/blob/master/contracts/auction/DutchAuction.sol) we built**.
2. Use the token as collateral for a Dharma loan request.
3. Keep holding on to it while it accures value.
4. Anything else you may think of doing with an NFT!

<p align="center">
  <img alt="TechnoDebit logo" src="https://i.imgsafe.org/4e/4e5234492b.png" height="400"/>
</p>


## Underwriters

We even utilized the [Thetta DAO framework](https://github.com/thetta) for an Underwriter subsystem. 
The step-by-step scenario is as follows:
1. User wants to become an Underwrite
1. He calls a [becomeAnUnderwriter method](https://github.com/MeaninglessTechnoDebt/TechnoDebit/blob/master/contracts/UnderwriterSubsystem.sol) 
1. Moderators vote and either accept or reject it
1. If accepted -> user is added to the 'Accepted underwriters' list.
1. Then SideA can choose the Underwriter from this list.
1. Underwriter should accept the request from the payer and provide additional gurantees in terms of later collateralizing allowance token from the payer.

## TODOs (what is left)

1. Status integration. We tried that, but unfortunately there were some problems with the current Status release. Folks from the Status tried to help us and even deployed some built-just-for-us version, but it didn't help.
Imagine how cool would it be to issue a direct debit for someone during a chat on status!!!
2. Add ERC721 compatiblity to the DutchX and use their solution instead. Unfortunately, currently [DutchX](https://github.com/gnosis/dx-contracts) doesn't support ERC721 at all...
3. Finish integration with Dharma, failing over some weird signing issues, a forked repo of the dharma smart contracts to support our NFT can be found in our repo. As well as the required overrides have been made on our contracts. The issue now seems to be with dharma.js .
4. Refactor, everything.

## Team (from left to right)

1. [Anton Akentiev](github.com/anthonyakentiev)
1. [Boaz Berman](https://github.com/boazberman)
1. [Yoni Svechinsky](https://github.com/svechinsky)
1. [Avichal](https://github.com/avichalp)

![Teamn photo](https://i.imgsafe.org/4d/4dd6bac3f5.jpeg)

## How to run tests
```
npm install

# It will start ganache automatically in the background
npm run test 
```
