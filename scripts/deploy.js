// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.

const path = require("path");

// const OFFSET = 61880; // HRE Has different runtime date & time, TBD // TODO
const OFFSET = 0; // HRE Has different runtime date & time, TBD // TODO
const VOTING_DELAY = 300; // in Seconds
const VOTING_DURATION = 1000; // in Seconds

async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
      "gets automatically created and destroyed every time. Use the Hardhat" +
      " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const now = Math.floor(new Date().getTime() / 1000); // in Seconds
  console.log("Now: ", new Date(), now);
  console.log("Now + offset: ", new Date((now + OFFSET) * 1000));

  console.log("Contract's Parameters: ",
    now + OFFSET + VOTING_DELAY,
    now + OFFSET + VOTING_DELAY + VOTING_DURATION,
    [
      "option1",
      "option2",
      "option3",
    ]
  );

  const Elections = await ethers.getContractFactory("Elections");
  const elections = await Elections.deploy(
    now + OFFSET + VOTING_DELAY,
    now + OFFSET + VOTING_DELAY + VOTING_DURATION,
    [
      "option1",
      "option2",
      "option3",
    ]
  );
  await elections.deployed();

  console.log("Elections address:", elections.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveArtifacts(elections);
}

function saveArtifacts(elections) {
  const fs = require("fs");

  // Frontend

  let contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Elections: elections.address }, undefined, 2)
  );

  const ElectionsArtifact = artifacts.readArtifactSync("Elections");

  fs.writeFileSync(
    path.join(contractsDir, "Elections.json"),
    JSON.stringify(ElectionsArtifact, null, 2)
  );

  // Backend

  contractsDir = path.join(__dirname, "..", "backend", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Elections: elections.address }, undefined, 2)
  );

  fs.writeFileSync(
    path.join(contractsDir, "Elections.json"),
    JSON.stringify(ElectionsArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
