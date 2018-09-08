pragma solidity ^0.4.24;

import "./ILedger.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721.sol";


contract Ledger is ERC721, ISideA, ISideB {
	constructor() public {
	}

	struct UserState {
		uint currentBalance;

		// TODO: not used right now
		address currentUnderwriter;	

		// See allowances array below
		address[] allAllowances;
	}

	struct Allowance {
		// by default we set the userState.currentUnderwriter
		// can be ZERO!
		address underwriter;

		// if Allowance is generated because of overdraft -> i should be able to trasnfer it 
		// (sell it or put into collateral)
		bool transferrable;

		// TODO: transfering ERC721 should update THIS !!!
		address sideB;
		uint amountWei;
		uint overdraftPpm;
		uint interestRatePpm;
		uint periodSeconds;
		uint startingDate;

		address erc721tokenAddress;
	}

	struct UserToUserState {
		// TODO - write good comment here...
		bool isOverdrafted;

		// each allowance is connected with Allowance struct in the allowancesMetainfo
		address[] allowances;
	}

	// UserA -> UserState
	mapping (address=>UserState) userState;
	// UserA -> UserB -> UserToUserState
	mapping (address=>mapping(address=>UserToUserState)) user2userState;
	// ERC721 address -> Allowance
	mapping (address=>Allowance) allowancesMetainfo;

////////////////////////////////////////////////////////////////////////////////////
	function deposit() public payable{
		userState[msg.sender].currentBalance += msg.value;
	}

	function getDepositBalance() public view returns(uint) {
		return userState[msg.sender].currentBalance;
	}

	function withdraw(uint _amountWei) public {
		require(_amountWei <= getDepositBalance());
		// TODO: use Safemath here
		userState[msg.sender].currentBalance-=_amountWei;
		msg.sender.transfer(_amountWei);
	}

	function allowAndDeposit(
		address _sideB, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm, 
		uint _numberOfPeriods, 
		uint _periodSeconds, 
		uint _startingDate) public payable 
	{
		// 1 - deposit (can be null!)
		userState[msg.sender].currentBalance += msg.value;

		// 2 - create N allowances ...
		uint date = _startingDate;
		for(uint i=0; i<_numberOfPeriods; ++i){
			_createNewAllowance(_sideB,
							_amountWei, 
							_overdraftPpm, 
							_interestRatePpm, 
							_periodSeconds, 
							date);

			date += _periodSeconds;
		}
	}

	function getMyAllowancesCount() public view returns(uint){
		return userState[msg.sender].allAllowances.length;
	}

	function getMyAllowanceInfo(uint _index) public 
		view returns(address sideB, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate)
	{
		address erc721address = userState[msg.sender].allAllowances[_index];
		Allowance a = allowancesMetainfo[erc721address];

		sideB = a.sideB;
		amountWei = a.amountWei;
		overdraftPpm = a.overdraftPpm;
		interestRatePpm = a.interestRatePpm;
		periodSeconds = a.periodSeconds;
		startingDate = a.startingDate;
	}

	// edit each one 
	function editMyAllowance(
		uint _index, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm,
		uint _periodSeconds, 
		uint _startingDate) public 
	{
		// TODO: left for future version
	}

// 3 - overdrafted flag
	// if you have asked for more than current AllowedAmount and less than AllowedAmount + overdraft
	function isOverdrafted(address _sideA, address _sideB) public view returns(bool){
		return user2userState[_sideA][_sideB].isOverdrafted;
	}

	// should be called by the SideA for the SideB
	function clearOverdraftedFlag(address _sideB) public {
		user2userState[msg.sender][_sideB].isOverdrafted = false;
	}

// SideB
	function getAllowancesCount() public view returns(uint allowancesCount){
		// TODO:
	}

	function getAllowanceInfo(uint _index) public 
		view returns(address sideA, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate){
		// TODO:
	}

	// only for 'transferrable allowances' that were generated automatically in case of overdraft
	function transferAllowance(uint _index, address _to) public {
		// TODO:
	}

	// will either return money OR 
	// will return money + generate new allowance (plus interested) to the SideB (me)
	function charge(uint _index, uint _amountWei) public {
		// TODO: 
	}

//////// Internal stuff
	function _createNewAllowance(address _sideB,
							uint _amountWei, 
							uint _overdraftPpm, 
							uint _interestRatePpm, 
							uint _periodSeconds, 
							uint _startingDate) internal 
	{
		// TODO:
	}
}
