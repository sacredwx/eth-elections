require("@nomicfoundation/hardhat-toolbox");

require('dotenv').config();

// The next line is part of the sample project, you don't need it in your
// project. It imports a Hardhat task definition, that can be used for
// testing the frontend.
require("./tasks/faucet");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      chainId: 1337 // We set 1337 to make interacting with MetaMask simpler
    },
    goerli: {
      url: "https://goerli.infura.io/v3/" + process.env.INFURA_PROJECT_ID,
      accounts: [process.env.PRIVATE_KEY],
    },
  }
};
