pragma solidity ^0.4.24;

contract ISideA {
// 1 - deposit + withdraw
	function deposit() public payable;
	function getDepositBalance() public view returns(uint totalBalanceWei);
	function withdraw(uint _amountWei) public;

// 2 - allowances that i set to some SideB
	// this will create _numberOfPeriods allowances
	// if you have created allowances before for sideB -> throw
	function allowAndDeposit(
		address _sideB, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm, 
		uint _numberOfPeriods, 
		uint _periodSeconds, 
		uint _startingDate) public payable;

	function getMyAllowancesCount() public view returns(uint allowancesCount);
	function getMyAllowanceInfo(uint _index) public 
		view returns(address sideB, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate);
	// edit each one 
	function editMyAllowance(
		uint _index, 
		uint _amountWei, 
		uint _overdraftPpm, 
		uint _interestRatePpm,
		uint _periodSeconds, 
		uint _startingDate) public;

// 3 - overdrafted flag
	// if you have asked for more than current AllowedAmount and less than AllowedAmount + overdraft
	function isOverdrafted(address _sideA, address _sideB) public view returns(bool overdrafted);
	// should be called by the SideA for the SideB
	function clearOverdraftedFlag(address _sideB) public;
}

contract ISideB {
	function getAllowancesCount() public view returns(uint allowancesCount);
	function getAllowanceInfo(uint _index) public 
		view returns(address sideA, uint amountWei, uint overdraftPpm, uint interestRatePpm, uint periodSeconds, uint startingDate);
	// only for 'transferrable allowances' that were generated automatically in case of overdraft
	function transferAllowance(uint _index, address _to) public;

	// will either return money OR 
	// will return money + generate new allowance (plus interested) to the SideB (me)
	function charge(uint _index, uint _amountWei) public;

	function calculateAllowedPlusOverdraft(uint _index) public view returns(uint);
}

contract IUnderwriterSubsystem {
	// SideA wants to add current underwriter. This will generate new underwriter request
	function addUnderwriterRequest(address _underwriter) public;
	function changeUnderwriter(address _newUnderwriter) public;

	// in order to become an underwriter SideB should accept that
	function getMyUnderwriterRequestsCount() public view returns(uint count);
	function getUnderwriterRequest(uint _index) public view returns(address sideB);
	function acceptUnderwriterRequest(address _sideA, address _sideB) public;
}

