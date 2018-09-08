pragma solidity ^0.4.24;

contract IUnderwriterSubsystem {
// 1 - to become a moderator
	function wantToBecomeUnderwriter()public;

// 2 - enumerate
	function getUnderwritersCount()public view returns(uint count);
	function getUnderwriters(uint _index)public returns(address underwriter);
	
// 3 - if SideA wants to select an underwriter
	function wantToSelectUnderwriter(uint _underwriterIndex, uint256 _infoIpfsHash) public;

// 4 - Underwriter should accept the request
	function getUnderwriterRequest(uint _index) public view returns(address sideB);
	function acceptUnderwriterRequest(uint _index) public;
}

