# ETH Elections

This repository contains an elections smart contract,
A backend which communicates with the smart contract and behaves
as a layer between the smart contract and the frontend,
and frontend that can communicate both with the smart contract directly
either with the backend implementation.
Database has the information from the smart contract cached.

## Quick start

The first things you need to do are cloning this repository and installing its
dependencies:

```sh
git clone https://github.com/sacredwx/eth-elections
cd eth-elections
npm install
```

Once installed, let's run Hardhat's testing network (Optional, if you run locally):

```sh
npx hardhat node --hostname 127.0.0.1
```

Otherwise, you would want to add an .env file to the project's root folder:

```sh
INFURA_PROJECT_ID=
PRIVATE_KEY=
```

Then, on a new terminal, go to the repository's root folder and run this to
deploy your contract to the network of your choice (localhost / goerli):

```sh
npx hardhat run scripts/deploy.js --network {network}
```

A .env file is located in 'backend/.env'
shall be populated with proper values:

```
PORT=80
RPC_ENDPOINT=
PRIVATE_KEY=

DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USER=
DB_PASSWORD=
```

Then, we need to run the backend with:

```sh
cd backend
npm install
npm run dev
```

Finally, we can run the frontend with:

```sh
cd frontend
npm install
npm start
```

Open [http://localhost:3000/](http://localhost:3000/) to see your Dapp. You will
need to have [Metamask](https://metamask.io) installed and listening to
`localhost 8545`.

## Troubleshooting

- `Invalid nonce` errors: if you are seeing this error on the `npx hardhat node`
  console, try resetting your Metamask account. This will reset the account's
  transaction history and also the nonce. Open Metamask, click on your account
  followed by `Settings > Advanced > Reset Account`.
