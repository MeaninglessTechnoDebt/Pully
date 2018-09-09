<p align="center">
  <img alt="TechnoDebit logo" src="https://cdn.dribbble.com/users/344048/screenshots/3163716/old_robot.gif" height="250"/>

  <h3 align="center">Pully</h3>
  <p align="center">"Direct debit made easy!"</p>
</p>

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
We are issuing the direct debit rights as ERC721s a.k.a. non fungible tokens.
Meaning if the payer hasn't put in enough money the payee now has a few things he can do about it.
1. Sell the withdrawl right to someone else. Maybe via the dutch auction contract we built.
2. Use the token as collateral for a Dharma loan request.
3. Keep holding on to it while it accures value.
4. Anything else you may think of doing with an NFT!

## Team (in alph. order))

1. [Anton Akentiev](github.com/anthonyakentiev)
1. [Avichal](https://github.com/avichalp)
1. [Boaz Berman](https://github.com/boazberman)
1. [Yoni Svechinsky](https://github.com/svechinsky)

## Tech Reqs
https://docs.google.com/document/d/1pQy_FLmfn-ToRTYN7v-xtg1LsAVGXrNsgbfozeCWV9A/edit?usp=sharing

## Ledger Contract (NFT registry)
https://rinkeby.etherscan.io/address/0xe04436a2a02c68220d9e7b5164def4ac8a5ca04f

## How to run tests
```
npm install

# It will start ganache automatically in the background
npm run test 
```
