pragma solidity ^0.4.24;

import "./IUnderwriterSubsystem.sol";

import "@thetta/core/contracts/DaoClient.sol";
import "@thetta/core/contracts/DaoBase.sol";

contract UnderwriterSubsystem is IUnderwriterSubsystem, DaoClient {
	address[] underwriters;

	struct RequestForUnderwriter {
		uint indexInArray;
		uint256 infoIpfsHash;
		bool acceptedByUnderwriter;
	}
	RequestForUnderwriter[] rfus;

	event BecomeAnUnderwriter(address _underwriter);
	event RequestedUnderwriter(uint _indexInArray, address _underwriterAddress, uint256 _infoIpfsHash, uint _requestIndex);

	bytes32 public constant BECOME_UNDERWRITER = keccak256("BECOME_UNDERWRITER");

	constructor(DaoBase _dao) DaoClient(_dao) {

	}

// 1 - to become a moderator
	function becomeAnUnderwriter(address _a)public isCanDo(BECOME_UNDERWRITER){
		// TODO: check if already in the list)

		underwriters.push(_a);

		emit BecomeAnUnderwriter(_a);
	}

// 2 - enumerate requests
	function getUnderwritersCount()public view returns(uint count){
		return underwriters.length;
	}
	function getUnderwriters(uint _index)public returns(address underwriter){
		return underwriters[_index];
	}
	
// 3 - if SideA wants to select an underwriter
	function wantToSelectUnderwriter(uint _underwriterIndex, uint256 _infoIpfsHash) public {
		// TODO: check if already added 

		RequestForUnderwriter rfu;
		rfu.indexInArray = _underwriterIndex;
		rfu.infoIpfsHash = _infoIpfsHash;
		rfu.acceptedByUnderwriter = false;

		rfus.push(rfu);

		emit RequestedUnderwriter(_underwriterIndex, underwriters[_underwriterIndex], _infoIpfsHash, rfus.length - 1);
	}

// 4 - Underwriter should accept the request
	function getUnderwriterRequestInfo(uint _index) public view returns(uint256 infoIpfsHash, bool isAccepted){
		require(_index < rfus.length);

		infoIpfsHash = 	rfus[_index].infoIpfsHash;
		isAccepted = rfus[_index].acceptedByUnderwriter;
	}

	function acceptUnderwriterRequest(uint _index) public {
		require(_index < rfus.length);
		address a = underwriters[rfus[_index].indexInArray];
		require(a==msg.sender);

		// i have accepted it
		rfus[_index].acceptedByUnderwriter = true;
	}
}

