//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./VotingParameters.sol";
import "./VoteOption.sol";
import "./Voter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// TODO: Docs!

contract Elections is Ownable {
    string public constant EIP712Domain = "ETH-Elections";
    string public constant EIP712DomainVersion = "1.0.0";

    mapping(address => Voter) public voters;
    address[] public registeredVoters;
    VoteOption[] public votingOptions;
    VotingParameters public votingParameters;

    event NewVoting(string[] options);
    event Vote(address indexed voter, uint indexed option);
    event RegisterVoter(address indexed voter);
    event VotingPeriodChange(uint start, uint end);

    /**
     * Modifiers
     */

    modifier beforeVoting() {
        require(
            block.timestamp < votingParameters.start,
            "Voting already started."
        );
        _;
    }

    modifier duringVoting() {
        require(
            block.timestamp >= votingParameters.start && block.timestamp < votingParameters.end,
            "Voting is not in process."
        );
        _;
    }

    modifier eip712Deadline(uint256 deadline) {
        require(block.timestamp < deadline, "Signed transaction expired");
        _;
    }

    /**
     * Contract initialization
     */

    constructor(uint votingStart, uint votingEnd, string[] memory options) {
        for (uint i = 0; i < options.length; i++) {
            votingOptions.push(VoteOption({name: options[i], votes: 0}));
        }
        
        require(block.timestamp < votingStart, "Start date is in the past");
        require(votingStart < votingEnd, "Invalid dates passed");
        votingParameters.start = votingStart;
        votingParameters.end = votingEnd;

        emit NewVoting(options);
        emit VotingPeriodChange(votingStart, votingEnd);
    }

    /**
     * External functions
     */
    
    function eip712Vote(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address sender,
        uint deadline,
        uint voteOption
    )
    eip712Deadline(deadline)
    external
    {
        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256("vote(address sender,uint deadline,uint voteOption)"),
                sender,
                deadline,
                voteOption
            )
        );

        _validate(v, r, s, sender, hashStruct);

        _vote(sender, voteOption);
    }

    function vote(uint voteOption) external {
        _vote(msg.sender, voteOption);
    }

    /**
     * Queries
     */

    /// @dev Computes the winning option taking all
    /// previous votes into account.
    function winningOptionIndex() public view returns (uint _winningOptionIndex)
    {
        uint winningVoteCount = 0;
        for (uint i = 0; i < votingOptions.length; i++) {
            if (votingOptions[i].votes > winningVoteCount) {
                winningVoteCount = votingOptions[i].votes;
                _winningOptionIndex = i;
            }
        }
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winningOption() external view returns (VoteOption memory)
    {
        return votingOptions[winningOptionIndex()];
    }

    /// Returns all voting options and its' data
    function getVotingOptions() public view returns (VoteOption[] memory)
    {
        return votingOptions;
    }

    /// Returns the registered voters
    /// @dev Pagination is used to prevent failure on large address sets
    function getRegisteredVoters(uint start, uint limit) public view returns(address[] memory)
    {
        uint size = (limit > registeredVoters.length - start) ? registeredVoters.length - start : limit;
        address[] memory addresses = new address[](size);
        uint j=0;
        for (uint i = start; i < start + size && i < registeredVoters.length; i++) {
            addresses[j++] = registeredVoters[i];
        }
        return addresses;
    }

    /**
     * Owner only
     */

    function registerVoters(address[] memory addresses) external onlyOwner beforeVoting {
        for (uint i = 0; i < addresses.length; i++) {
            Voter memory voter = Voter({
                registered: true,
                voted: false,
                vote: 0
            });
            voters[addresses[i]] = voter;
            registeredVoters.push(payable(addresses[i]));

            emit RegisterVoter(addresses[i]);
        }
    }

    function setVotingPeriod(uint votingStart, uint votingEnd) public onlyOwner beforeVoting {
        require(block.timestamp < votingStart, "Start date is in the past");
        require(votingStart < votingEnd, "Invalid dates passed");
        votingParameters.start = votingStart;
        votingParameters.end = votingEnd;

        emit VotingPeriodChange(votingStart, votingEnd);
    }

    /**
     * Internal functions
     */

    function _validate(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address sender,
        bytes32 hashStruct
    ) internal view {
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", _computeEIP712DomainHash(), hashStruct));
        address signer = ecrecover(hash, v, r, s);
        require(signer == sender, "Invalid signature");
        require(signer != address(0), "ECDSA: invalid signature");
    }

    function _computeEIP712DomainHash() internal view returns (bytes32 eip712DomainHash) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        eip712DomainHash = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(EIP712Domain)),
                keccak256(bytes(EIP712DomainVersion)),
                chainId,
                address(this)
            )
        );  
    }

    function _vote(address sender, uint voteOption) internal duringVoting {
        Voter storage voter = voters[sender];
        require(voter.registered, "Has no right to vote");
        require(!voter.voted, "Already voted.");
        voter.voted = true;
        voter.vote = voteOption;

        // If `voteOption` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        votingOptions[voteOption].votes++;

        emit Vote(sender, voteOption);
    }
}
