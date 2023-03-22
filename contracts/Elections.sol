//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./VotingParameters.sol";
import "./VoteOption.sol";
import "./Voter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Elections Contract
/// @author sacredwx
/// @notice Simple elections, voting once during the period - no changes
/// @dev This contract is intended for usage either directly or via EIP712 relayed to the backend server
contract Elections is Ownable {
    string public constant EIP712Domain = "ETH-Elections";
    string public constant EIP712DomainVersion = "1.0.0";

    mapping(address => Voter) public voters;    // Voter addresses to voter object mapping
    address[] public registeredVoters;          // A set of registered addresses
    VoteOption[] public votingOptions;          // A set of voting options objects
    VotingParameters public votingParameters;   // Voting parameters object

    event NewVoting(string[] options);
    event Vote(address indexed voter, uint indexed option);
    event RegisterVoter(address indexed voter);
    event VotingPeriodChange(uint start, uint end);

    /**
     * Modifiers
     */

    /// @dev Requires function's execution only before the settled voting start time
    modifier beforeVoting() {
        require(
            block.timestamp < votingParameters.start,
            "Voting already started."
        );
        _;
    }

    /// @dev Requires function's execution just between the
    /// voting start time and the voting end time
    modifier duringVoting() {
        require(
            block.timestamp >= votingParameters.start && block.timestamp < votingParameters.end,
            "Voting is not in process."
        );
        _;
    }

    /// @dev Requires function's execution just before the specified deadline
    modifier eip712Deadline(uint256 deadline) {
        require(block.timestamp < deadline, "Signed transaction expired");
        _;
    }

    /**
     * Contract initialization
     */

    /// @notice Contract's constructor
    /// @param votingStart Voting period start time in seconds since the Epoch
    /// @param votingEnd Voting period end time in seconds since the Epoch
    /// @param options Voting options' names
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
    
    /// @notice Voting through EIP-712
    /// @param v Component of the signature
    /// @param r Component of the signature
    /// @param s Component of the signature
    /// @param sender Declared signature signer
    /// @param deadline Declared deadline, after which the tx should expire
    /// @param voteOption Declared vote option index
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

    /// @notice Voting directly
    /// @param voteOption Vote option index
    function vote(uint voteOption) external {
        _vote(msg.sender, voteOption);
    }

    /**
     * Queries
     */

    /// @notice Finds the index of the currently winning option
    /// @dev Computes the winning option taking all previous votes into account.
    /// @return _winningOptionIndex Winning option index
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

    /// @notice Finds the winning option
    /// @dev Calls winningProposal() function to get the index
    /// of the winner contained in the proposals array and then
    /// returns the winning option object
    /// @return voteOption Object
    function winningOption() external view returns (VoteOption memory)
    {
        return votingOptions[winningOptionIndex()];
    }

    /// @notice All declared voting options
    /// @dev Returns all voting options and its' data
    /// @return Array of voting option objects
    function getVotingOptions() public view returns (VoteOption[] memory)
    {
        return votingOptions;
    }

    /// @notice Returns the registered voters
    /// @dev Pagination is used to prevent failure on large address sets
    /// @param start An offset from where to start paginating
    /// @param limit An amount of addresses to return
    /// @return A set of addresses of the registered voters
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
    
    /// @notice Registering a new voter through EIP-712
    /// @param v Component of the signature
    /// @param r Component of the signature
    /// @param s Component of the signature
    /// @param sender Declared signature signer
    /// @param deadline Declared deadline, after which the tx should expire
    /// @param addr Declared address to be registsered as a voter
    function eip712RegisterVoter(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address sender,
        uint deadline,
        address addr
    )
    eip712Deadline(deadline)
    external
    {
        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256("registerVoter(address sender,uint deadline,address address)"),
                sender,
                deadline,
                addr
            )
        );

        _validate(v, r, s, sender, hashStruct);

        require (sender == owner(), "Unauthorized action!"); // Owner authentication

        address[] memory addresses = new address[](1);
        addresses[0] = addr;
        _registerVoters(addresses);
    }

    /// @notice Registering new voters directly
    /// @param addresses A set of addresses to be registsered as voters
    function registerVoters(address[] memory addresses) onlyOwner external {
        _registerVoters(addresses);
    }

    /// @notice Changing voting period through EIP-712
    /// @param v Component of the signature
    /// @param r Component of the signature
    /// @param s Component of the signature
    /// @param sender Declared signature signer
    /// @param deadline Declared deadline, after which the tx should expire
    /// @param votingStart Declared voting period start time in seconds since the Epoch
    /// @param votingEnd Declared voting period end time in seconds since the Epoch
    function eip712SetVotingPeriod(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address sender,
        uint deadline,
        uint votingStart,
        uint votingEnd
    )
    eip712Deadline(deadline)
    external
    {
        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256("setVotingPeriod(address sender,uint deadline,uint votingStart,uint votingEnd)"),
                sender,
                deadline,
                votingStart,
                votingEnd
            )
        );

        _validate(v, r, s, sender, hashStruct);

        require (sender == owner(), "Unauthorized action!"); // Owner authentication

        _setVotingPeriod(votingStart, votingEnd);
    }

    /// @notice Changing voting period directly
    /// @param votingStart Voting period start time in seconds since the Epoch
    /// @param votingEnd Voting period end time in seconds since the Epoch
    function setVotingPeriod(uint votingStart, uint votingEnd) onlyOwner external {
        _setVotingPeriod(votingStart, votingEnd);
    }

    /**
     * Internal functions
     */

    /// @notice Validating the built-up hash against the v, r, s components
    /// @dev Recovering the signer of the signature and comparing it to the declared signer
    /// @param v Component of the signature
    /// @param r Component of the signature
    /// @param s Component of the signature
    /// @param sender Declared signature signer
    /// @param hashStruct A built-up hash on-chain
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

    /// @notice EIP-712 Domain on-chain creation function
    /// @dev Builds up a static domain for this contract
    /// in order to use it with the parametric hash
    /// @return eip712DomainHash A part of the signature hash
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

    /// @notice Vote logic
    /// @dev Internal function that implements the voting logic
    /// @param sender Voter address
    /// @param voteOption Vote option index
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

    /// @notice Register voters logic
    /// @dev Internal function that implements the register voters
    /// @param addresses A set of addresses to be registsered as voters
    function _registerVoters(address[] memory addresses) internal beforeVoting {
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

    /// @notice Change voting period logic
    /// @dev Internal function that implements the change voting period logic
    /// @param votingStart Voting period start time in seconds since the Epoch
    /// @param votingEnd Voting period end time in seconds since the Epoch
    function _setVotingPeriod(uint votingStart, uint votingEnd) internal beforeVoting {
        require(block.timestamp < votingStart, "Start date is in the past");
        require(votingStart < votingEnd, "Invalid dates passed");
        votingParameters.start = votingStart;
        votingParameters.end = votingEnd;

        emit VotingPeriodChange(votingStart, votingEnd);
    }
}
