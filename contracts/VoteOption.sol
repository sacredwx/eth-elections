//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// This is a type for a single vote option.
struct VoteOption {
    string name; // option's name
    uint votes; // number of accumulated votes
}
