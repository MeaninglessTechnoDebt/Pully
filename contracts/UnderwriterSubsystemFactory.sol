pragma solidity ^0.4.24;

import "./UnderwriterSubsystem.sol";

import "@thetta/core/contracts/DaoStorage.sol";
import "@thetta/core/contracts/DaoBase.sol";
import "@thetta/core/contracts/tokens/StdDaoToken.sol";

contract UnderwriterSubsystemFactory {
	UnderwriterSubsystem public us;
	
	function deployDao() public {
		// 1 - deploy basic Dao contracts
		StdDaoToken moderatorsToken = new StdDaoToken("UndModTokens","UMT", 18, true, true, 0);
		address[] tokens;
		tokens.push(moderatorsToken);

		DaoStorage daoStorage = new DaoStorage(tokens);
		DaoBase daoBase = new DaoBase(daoStorage);
		moderatorsToken.transferOwnership(daoBase);

		// 2 - Create our org contract (a client of DaoBase contract)
		// just a DaoClient
		us = new UnderwriterSubsystem(daoBase);

		// 3 - Set all permissions
		// allow msg.sender to issue 'UndModTokens'
		daoBase.allowActionByAddress(daoBase.ISSUE_TOKENS(), msg.sender);
		// UnderwriterSubsystem will automatically add proposal if voting is started
		daoBase.allowActionByAddress(daoBase.ADD_NEW_PROPOSAL(), us);
		// this means that moderators should vote to accept underwriter 
		daoBase.allowActionByVoting(us.BECOME_UNDERWRITER(), moderatorsToken);
		
		// 4 - no one should own the DAO!!!
		daoBase.renounceOwnership();

		// issue tokens
		daoBase.issueTokens(moderatorsToken, msg.sender, 100);
	}

}
