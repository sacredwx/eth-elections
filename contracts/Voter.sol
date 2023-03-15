//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// This is a type for a voter
struct Voter {
    bool registered; // can vote
    bool voted; // already voted
    uint vote; // vote option index
}
