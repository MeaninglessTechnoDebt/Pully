pragma solidity ^0.4.24;

import "./ILedger.sol";

import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title Ledger 
 * @dev Main MeaninglessTechnoDebt/TechnoDebit contract. 
 * Check TechReqs here:
 * https://docs.google.com/document/d/1pQy_FLmfn-ToRTYN7v-xtg1LsAVGXrNsgbfozeCWV9A/edit?usp=sharing
 */
contract Ledger is ISideA, ISideB, ERC721Token("Pully","PULL") {
	using SafeMath for uint256;

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

		address sideA;
		address sideB; // transfering ERC721 will update THIS !!!
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

	/**
	* @dev Put some ETHer in
	*/
	function deposit() public payable{
		userState[msg.sender].currentBalance += msg.value;
	}

	/**
	* @dev Get your current ETH balance 
	* @return amount in WEIs
	*/
	function getDepositBalance() public view returns(uint) {
		return userState[msg.sender].currentBalance;
	}

	/**
	* @dev Return back your ETHs if you deposited before 
	* @param _amountWei Amount to get back 
	*/
	function withdraw(uint _amountWei) public {
		require(_amountWei <= getDepositBalance());
		userState[msg.sender].currentBalance-=_amountWei;
		msg.sender.transfer(_amountWei);
	}

	/**
	* @dev Add an allowance AND put deposit (can be zero!)
	*/
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
			_createNewAllowance(
				msg.sender, 
				_sideB,
				_amountWei, 
				_overdraftPpm, 
				_interestRatePpm, 
				_periodSeconds, 
				date,
				false);

			date += _periodSeconds;
		}
	}

	/**
	* @dev Returns number of my allowances (that i set before for SideB)
	*/
	function getMyAllowancesCount() public view returns(uint){
		return userState[msg.sender].allAllowances.length;
	}

	/**
	* @dev Return allowance data (enumerator)
	* @param _index Current alowance index (in terms of SideA). Use getMyAllowancesCount() to get total count
	*/
	function getMyAllowanceInfo(uint _index) public 
	view returns(address sideB, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate, bool isDebt)
	{
		uint256 erc721id = userState[msg.sender].allAllowances[_index];
		Allowance a = allowancesMetainfo[erc721id];

		sideB = a.sideB;
		amountWei = a.amountWei;
		overdraftPpm = a.overdraftPpm;
		interestRatePpm = a.interestRatePpm;
		periodSeconds = a.periodSeconds;
		startingDate = a.startingDate;
		// if allowance is transferrable -> it was generated because we have debt (see _charge method)
		isDebt = (a.transferrable==true);
	}

	/**
	* @dev Edit each allowance manually 
	* @param _index Current alowance index (in terms of SideA). Use getMyAllowancesCount() to get total count
	*/
	function editMyAllowance(
		uint _index, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm,
		uint _periodSeconds, 
		uint _startingDate) public 
	{
		uint256 erc721id = userState[msg.sender].allAllowances[_index];

		require(allowancesMetainfo[erc721id].sideA==msg.sender);

		allowancesMetainfo[erc721id].amountWei = _amountWei;
		allowancesMetainfo[erc721id].overdraftPpm = _overdraftPpm;
		allowancesMetainfo[erc721id].interestRatePpm = _interestRatePpm;
		allowancesMetainfo[erc721id].periodSeconds = _periodSeconds;
		allowancesMetainfo[erc721id].startingDate = _startingDate;
	}

	// 3 - overdrafted flag
	/**
	* @dev If you have asked for more than current AllowedAmount and less than AllowedAmount + overdraft
	* @param _sideA Who deposited money 
	* @param _sideB Who withdraws
	*/
	function isOverdrafted(address _sideA, address _sideB) public view returns(bool){
		return user2userState[_sideA][_sideB].isOverdrafted;
	}

	/**
	* @dev If SideB has overdrafted -> it can no longer withdraw without SideA calling 'clearOverdraftedFlag'.
	* Should be called by the SideA for the SideB
		*/
	function clearOverdraftedFlag(address _sideB) public {
		user2userState[msg.sender][_sideB].isOverdrafted = false;
	}

	// SideB
	/**
	* @dev Get the number of allowances that were set by other people for me
	*/
	function getAllowancesCount() public view returns(uint){
		return userState[msg.sender].allAllowancesFrom.length;
	}

	/**
	* @dev Return allowance data for SideB (enumerator)
	* @param _index Current alowance index (in terms of SideB). Use getAllowancesCount() to get total count
	*/
	function getAllowanceInfo(uint _index) public 
	view returns(address sideA, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate, bool isDebt)
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
		// if allowance is transferrable -> it was generated because we have debt (see _charge method)
		isDebt = (a.transferrable==true);
	}

	/**
	* @dev Transfer allowance to the other account.
	* Only for 'transferrable allowances' that were generated automatically in case of overdraft
	* @param _index Current alowance index (in terms of SideB). Use getAllowancesCount() to get total count
	* @param _to Who is gonna receive the ERC721 right + will be able to withdraw
	*/
	function transferAllowance(uint _index, address _to) public {
		require(_index < getAllowancesCount());

		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];
		require(a.transferrable);

		super.safeTransferFrom(msg.sender, _to, erc721id);
	}

	// Function to comply with dharma debt token
	function transferFrom(address _from, address _to, uint erc721id) public {
		//uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];
		require(a.transferrable);

		// 1 - move ERC721 token to _to address 
		super.transferFrom(_from, _to, erc721id);

		// 2 - change all internal structs 
		// 2.1 allowancesMetainfo 
		allowancesMetainfo[erc721id].sideB = _to;

		// 2.2 userState 
		// remove allowance from msg.sender 
		// TODO: very shitty loop!
		for(uint i=0; i<userState[msg.sender].allAllowancesFrom.length; ++i){
			if(userState[msg.sender].allAllowancesFrom[i]==erc721id){
				userState[msg.sender].allAllowancesFrom[i] = 0;
			}
		}

		// add allowance to _to
		userState[_to].allAllowancesFrom.push(erc721id);

		// 2.3 user2userState 
		// TODO: very shitty loop!
		for(i=0; i<user2userState[a.sideA][msg.sender].allowances.length; ++i){
			if(user2userState[a.sideA][msg.sender].allowances[i]==erc721id){
				// remove it from A -> B
				user2userState[a.sideA][msg.sender].allowances[i] = 0;
			}
		}

		// connect it A -> TO
		user2userState[a.sideA][_to].allowances.push(erc721id);
	}
	
	/**
	* @dev Will either return money OR will return money + generate new allowance (plus interested) to the SideB (me)
	* @param _index Current alowance index (in terms of SideB). Use getAllowancesCount() to get total count
	* @param _amountWei Should be less than AllowedAmount + OverDraft
	*/
	function charge(uint _index, uint _amountWei) public {
		require(_index < getAllowancesCount());

		// 1 - calc everything
		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];

		// overdraft is in PPM
		// 1% is 10000 PPMs
		uint AA_with_OD = calculateAllowedPlusOverdraft(_index);
		require(_amountWei <= AA_with_OD);

		// 2 - check that startingDate is OK
		require(block.timestamp >= a.startingDate);
		// require(block.timestamp < (a.startingDate + a.periodSeconds)); // TODO: not sure why would we want to prevent charging to late

		// 3 - go charge SideA!
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

	/**
	* @dev Calculate how much you can withdraw (as a SideB)
	* @param _index is a SideB's allowance index
	*/
	function calculateAllowedPlusOverdraft(uint _index) public view returns(uint){
		require(_index < getAllowancesCount());

		uint256 erc721id = userState[msg.sender].allAllowancesFrom[_index];
		Allowance a = allowancesMetainfo[erc721id];
		return a.amountWei + ((a.amountWei * a.overdraftPpm) / 10000000);
	}

	//////// Internal stuff
	function _createNewAllowance(
		address _from, 
		address _to,
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm, 
		uint _periodSeconds, 
		uint _startingDate,
		bool _transferable) internal 
	 {
		// 1 - issue new ERC721 token 
		uint256 newErc721Id = uint(keccak256(_from, _to, _startingDate, _periodSeconds ));
		ERC721Token._mint(_to, newErc721Id);

		// 2 - push Allowance struct to allowancesMetainfo
		Allowance memory a;
		a.underwriter = address(0); // Set address 0 for V0
		a.transferrable = _transferable;
		a.sideA = _from;
		a.sideB = _to;
		a.amountWei = _amountWei;
		a.overdraftPpm = _overdraftPpm;
		a.interestRatePpm = _interestRatePpm;
		a.periodSeconds = _periodSeconds;
		a.startingDate = _startingDate;
		allowancesMetainfo[newErc721Id] = a;

		userState[_from].allAllowances.push(newErc721Id);
		userState[_to].allAllowancesFrom.push(newErc721Id);

		user2userState[_from][_to].allowances.push(newErc721Id);
	 }

	 // send money from SideA -> SideB
	 function _charge(Allowance _a, uint _amountWanted) internal {
		// 1 - get current sideA balance 
		uint balance = userState[_a.sideA].currentBalance;

		if(_amountWanted <= balance){
			// 2 - just send money 
			_a.sideB.transfer(_amountWanted);
			userState[_a.sideA].currentBalance -= _amountWanted;
		 } else {
			 // special outcome: if SideA has LESS money than SideB wants (and was allowed)
			 // 3 - send all avail money
			_a.sideB.transfer(balance);
			uint remainder = _amountWanted.sub(balance);
			userState[_a.sideA].currentBalance = 0;

			// 4 - create new allowance (plus interest!!!) and transfer it to SideB 
			_createNewAllowance(
				_a.sideA,
				_a.sideB,
				remainder + remainder * _a.interestRatePpm/1000000, 
				_a.overdraftPpm, 
				_a.interestRatePpm, 
				_a.periodSeconds, 
				_a.startingDate.add(_a.periodSeconds),
				 true);
		 }
	 }
}
