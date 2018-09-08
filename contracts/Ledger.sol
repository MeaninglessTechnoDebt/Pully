pragma solidity ^0.4.24;

import "./ILedger.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";

/*
contract NFT is ERC721Token {
	constructor NFT() public ERC721Token("MTDA", "MTD"){

	}
}
*/

contract Ledger is ISideA, ISideB {
	//NFT nft;

	struct UserState {
		uint currentBalance;

		// TODO: not used right now
		address currentUnderwriter;	

		// uint256 IDs
		uint256[] allAllowances;
		uint256[] allAllowancesFrom;
	}

	struct Allowance {
		// by default we set the userState.currentUnderwriter
		// can be ZERO!
		address underwriter;

		// if Allowance is generated because of overdraft -> i should be able to trasnfer it 
		// (sell it or put into collateral)
		bool transferrable;

		// TODO: transfering ERC721 should update THIS !!!
		address sideA;
		address sideB;
		uint amountWei;
		uint overdraftPpm;
		uint interestRatePpm;
		uint periodSeconds;
		uint startingDate;
	}

	struct UserToUserState {
		// TODO - write good comment here...
		bool isOverdrafted;

		// each allowance is connected with Allowance struct in the allowancesMetainfo
		uint256[] allowances;
	}

	// UserA -> UserState
	mapping (address=>UserState) userState;
	// UserA -> UserB -> UserToUserState
	mapping (address=>mapping(address=>UserToUserState)) user2userState;
	// ERC721 id -> Allowance (main storage of all allowances)
	mapping (uint256=>Allowance) allowancesMetainfo;

////////////////////////////////////////////////////////////////////////////////////
	constructor() public {
	}

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
		uint256 erc721id = userState[msg.sender].allAllowances[_index];
		Allowance a = allowancesMetainfo[erc721id];

		sideB = a.sideB;
		amountWei = a.amountWei;
		overdraftPpm = a.overdraftPpm;
		interestRatePpm = a.interestRatePpm;
		periodSeconds = a.periodSeconds;
		startingDate = a.startingDate;
	}

	// edit each allowance manually 
	function editMyAllowance(
		uint _index, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm,
		uint _periodSeconds, 
		uint _startingDate) public 
	{
		// TODO: left for the future version
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
	function getAllowancesCount() public view returns(uint){
		return userState[msg.sender].allAllowancesFrom.length;
	}

	function getAllowanceInfo(uint _index) public 
		view returns(address sideA, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate)
	{
		require(_index < getAllowancesCount());

		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];

		sideA = a.sideA;
		amountWei = a.amountWei;
		overdraftPpm = a.overdraftPpm;
		interestRatePpm = a.interestRatePpm;
		periodSeconds = a.periodSeconds;
		startingDate = a.startingDate;
	}

	// only for 'transferrable allowances' that were generated automatically in case of overdraft
	function transferAllowance(uint _index, address _to) public {
		require(_index < getAllowancesCount());

		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];
		require(a.transferrable);

		// TODO:
		// 1 - move ERC721 token to _to address 

		// 2 - change all internal structs 
	}

	// will either return money OR 
	// will return money + generate new allowance (plus interested) to the SideB (me)
	// _index is index in the SideB's allowances
	function charge(uint _index, uint _amountWei) public {
		require(_index < getAllowancesCount());

		// 1 - calc everything
		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];

		// overdraft is in PPM
		// 1% is 10000 PPMs
		uint AA_with_OD = calculateAllowedPlusOverdraft(_index);
		require(_amountWei <= AA_with_OD);

		if(_amountWei <= a.amountWei){
			// if we are asking less than AA
			_charge(a, _amountWei);
		} else {
			// if we are asking more than AA but less than AA + OD 
			// set special flag
			user2userState[a.sideA][a.sideB].isOverdrafted = true;	
			_charge(a, _amountWei);
		}
	}

	// _index is a SideB's allowance index
	function calculateAllowedPlusOverdraft(uint _index) public view returns(uint){
		require(_index < getAllowancesCount());

		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];
		return a.amountWei + ((a.amountWei * a.overdraftPpm) / 10000000);
	}

//////// Internal stuff
	function _createNewAllowance(address _to,
							uint _amountWei, 
							uint _overdraftPpm, 
							uint _interestRatePpm, 
							uint _periodSeconds, 
							uint _startingDate) internal 
	{
		// TODO:
		// 1 - issue new ERC721 token 
		uint256 newErc721Id = uint(keccak256(msg.sender, _to, _startingDate, _periodSeconds ));		// TODO: generate new ID
		//nft.mint(_to, newId);

		// 2 - push Allowance struct to allowancesMetainfo
		Allowance memory a;
		a.underwriter = address(0); // Set address 0 for V0
		a.transferrable = false;
		a.sideA = msg.sender;
		a.sideB = _to;
		a.amountWei = _amountWei;
		a.overdraftPpm = _overdraftPpm;
		a.interestRatePpm = _interestRatePpm;
		a.periodSeconds = _periodSeconds;
		a.startingDate = _startingDate;
		allowancesMetainfo[newErc721Id] = a;

		userState[msg.sender].allAllowances.push(newErc721Id);
		userState[_to].allAllowancesFrom.push(newErc721Id);
		
		user2userState[msg.sender][_to].allowances.push(newErc721Id);
	}

	function _charge(Allowance _a, uint _amountWanted) internal {
		// get current sideA balance 
		uint balance = userState[_a.sideA].currentBalance;

		if(_amountWanted <= balance){
			// just send money 
			_a.sideB.transfer(_amountWanted);
			// TODO: use SafeMath
			userState[_a.sideA].currentBalance -= _amountWanted;
		} else {
			// TODO: 
			// send money
			
			// issue debt token
		}
	}
}
