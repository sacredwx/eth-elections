//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "./VotingParameters.sol";
import "./VoteOption.sol";
import "./Voter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Elections is Ownable {
    mapping(address => Voter) public voters;
    address[] public registeredVoters;
    VoteOption[] public votingOptions;
    VotingParameters public votingParameters;

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
    }

    /**
     * External functions
     */

    function vote(uint voteOption) external duringVoting {
        Voter storage voter = voters[msg.sender];
        require(voter.registered, "Has no right to vote");
        require(!voter.voted, "Already voted.");
        voter.voted = true;
        voter.vote = voteOption;

        // If `voteOption` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        votingOptions[voteOption].votes++;
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
    function getRegisteredVoters(uint start, uint end) public view returns(address[] memory)
    {
        address[] memory addresses = new address[](end-start);
        uint j=0;
        for (uint i = start; i < end; i++) {
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
        }
    }

    function setVotingPeriod(uint votingStart, uint votingEnd) public onlyOwner beforeVoting {
        require(block.timestamp < votingStart, "Start date is in the past");
        require(votingStart < votingEnd, "Invalid dates passed");
        votingParameters.start = votingStart;
        votingParameters.end = votingEnd;
    }
}
