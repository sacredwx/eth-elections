import React, { useRef, useState } from 'react';
import './App.css';

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import ElectionsArtifact from "./contracts/Elections.json";
import contractAddress from "./contracts/contract-address.json";
import { NoWalletDetected } from './components/NoWalletDetected';
import { ConnectWallet } from './components/ConnectWallet';
import { TransactionErrorMessage } from './components/TransactionErrorMessage';
import { WaitingForTransactionMessage } from './components/WaitingForTransactionMessage';
import { Box, Button, Grid, LinearProgress, Switch, TextField, Typography } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import Eth from './lib/Eth';
import { DateTimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import REST from './lib/REST';
import DAL from './lib/DAL';

let eth: Eth;
let rest: REST;

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
const REFRESH_TIME = 30000;

declare global {
  interface Window {
    ethereum: import('ethers').providers.ExternalProvider;
  }
}

// This is an utility method that turns an RPC error into a human readable
// message.
const getRpcErrorMessage = (error: any) => {
  if (error.error && error.error.data) {
    return error.error.data.message;
  }

  return error.message;
}

function App() {
  const [dal, setDAL] = useState<DAL | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<any | null>(null);
  const [txBeingSent, setTxBeingSent] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [progress, setProgress] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [votingParameters, setVotingParameters] = useState<any>(null);
  const [votingOptions, setVotingOptions] = useState<any>(null);
  const [voter, setVoter] = useState<any>(null);
  const [registeredVoters, setRegisteredVoters] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);

  const whitelistAddressRef = useRef<any>();

  // This method is for the user to vote.
  const sendTx = async (txAction: () => Promise<any>, postTxHook?: () => void) => {
    if (!dal) {
      return;
    }

    // Sending a transaction is a complex operation:
    //   - The user can reject it
    //   - It can fail before reaching the ethereum network (i.e. if the user
    //     doesn't have ETH for paying for the tx's gas)
    //   - It has to be mined, so it isn't immediately confirmed.
    //     Note that some testing networks, like Hardhat Network, do mine
    //     transactions immediately, but your dapp should be prepared for
    //     other networks.
    //   - It can fail once mined.
    //

    try {
      setProgress(true);
      // If a transaction fails, we save that error in the component's state.
      // We only save one such error, so before sending a second transaction, we
      // clear it.
      setTransactionError(null);

      // We send the transaction, and save its hash in the Dapp's state. This
      // way we can indicate that we are waiting for it to be mined.
      const tx = await txAction();
      setTxBeingSent(tx.hash);

      // We use .wait() to wait for the transaction to be mined. This method
      // returns the transaction's receipt.
      if (tx.wait) {
        const receipt = await tx.wait();

        // The receipt, contains a status flag, which is 0 to indicate an error.
        if (receipt.status === 0) {
          // We can't know the exact error that made the transaction fail when it
          // was mined, so we throw this generic one.
          throw new Error("Transaction failed");
        }
      }

      // Update related data on page
      if (postTxHook) {
        setTimeout(() => {
          postTxHook();
          setProgress(false);
        }, REFRESH_TIME);
      } else {
        setProgress(false);
      }
    } catch (error: any) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      setTransactionError(error);
      setProgress(false);
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      setTxBeingSent(null);
    }
  }

  const refresh = (dal: DAL) => {
    console.log(dal);
    dal.owner().then((owner: string) => setOwner(owner.toLowerCase()));
    dal.votingParameters().then(setVotingParameters);
    dal.getVotingOptions().then(setVotingOptions);
    dal.voters(selectedAddress!).then(setVoter);
    dal.getRegisteredVoters(0, 100).then(setRegisteredVoters); // TODO: pagination
  };

  // Ethereum wallets inject the window.ethereum object. If it hasn't been
  // injected, we instruct the user to install MetaMask.
  if (window.ethereum === undefined) {
    return <NoWalletDetected />;
  }

  // The next thing we need to do, is to ask the user to connect their wallet.
  // When the wallet gets connected, we are going to save the users's address
  // in the component's state. So, if it hasn't been saved yet, we have
  // to show the ConnectWallet component.
  //
  // Note that we pass it a callback that is going to be called when the user
  // clicks a button. This callback just calls the _connectWallet method.
  if (!selectedAddress) {
    return (
      <ConnectWallet
        connectWallet={async () => {
          try {
            const selAddress = await Eth.connectWallet();
            setSelectedAddress(selAddress);
            // We first initialize ethers by creating a provider using window.ethereum
            const _provider = new ethers.providers.Web3Provider(window.ethereum);

            // Then, we initialize the contract using that provider and the token's
            // artifact. You can do this same thing with your contracts.
            const _contract = new ethers.Contract(
              contractAddress.Elections,
              ElectionsArtifact.abi,
              _provider.getSigner(0)
            );

            eth = new Eth(_contract);
            rest = new REST(selAddress, contractAddress.Elections);

            setDAL(eth);
          } catch (e) {
            setError((e as Error).toString());
          }
        }}
        networkError={error}
        dismiss={() => setError(null)}
      />
    );
  } else {
    if (dal) {
      refresh(dal);
    }
  }

  return (
    <>
      {dal && (
        <div className="App">
          <Grid container>
            <Grid item xs={4}>
              {registeredVoters?.map((address: string) => (
                <>
                  {address}
                  <br />
                </>
              ))}
            </Grid>
            <Grid item xs={4}>
              <div className="row">
                {votingParameters &&
                  <>
                    Voting Process Duration:
                    <br />
                    {new Date(votingParameters.start.mul(1000).toNumber()).toISOString()}
                    {`(${votingParameters.start})`}
                    {' - '}
                    {new Date(votingParameters.end.mul(1000).toNumber()).toISOString()}
                    {`(${votingParameters.end})`}
                  </>
                }
              </div>
              {voter?.registered === false &&
                <Typography sx={{ color: 'red' }}>
                  You have no right to vote
                </Typography>
              }
              {voter?.voted && votingOptions &&
                <Typography sx={{ color: 'green' }}>
                  Your vote is: {votingOptions[voter.vote.toNumber()].name}
                </Typography>
              }
              <div className="row">
                {votingOptions?.map((option: any, idx: number) => (
                  <>
                    <div>
                      {option.name} #{idx}: {option.votes.toString()}
                      &nbsp;
                      votes
                      {voter?.voted === false && voter?.registered && (
                        <>
                          <Button
                            variant="contained"
                            onClick={() => sendTx(() => dal.vote(idx), () => {
                              dal.getVotingOptions().then(setVotingOptions);
                              dal.voters(selectedAddress).then(setVoter);
                            })}
                          >Vote</Button>
                        </>
                      )}
                    </div>
                  </>
                ))}
              </div>
            </Grid>
            {owner && selectedAddress && owner === selectedAddress &&
              <Grid item xs={4}>
                <Box m={1}>
                  REST API <Switch defaultChecked onChange={(e) => {
                    const _dal = e.target.checked ? eth : rest;
                    setDAL(_dal);
                    refresh(_dal);
                  }} /> Ethereum Txs
                </Box>
                <Box m={1}>
                  <TextField
                    label="Whitelist adddress"
                    inputRef={whitelistAddressRef}
                  />
                  <Button
                    variant="contained"
                    onClick={() => sendTx(() => dal.registerVoter(whitelistAddressRef.current.value), () => {
                      dal.voters(selectedAddress).then(setVoter);
                      dal.getRegisteredVoters(0, 100).then(setRegisteredVoters); /* TODO: pagination */
                    })}
                  >Whitelist</Button>
                </Box>
                <Box m={1}>
                  Start:
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker onChange={setStartTime} />
                  </LocalizationProvider>
                  <br />
                  End:
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker onChange={setEndTime} />
                  </LocalizationProvider>
                  <br />
                  <Button
                    variant="contained"
                    onClick={() => sendTx(() => dal.setVotingPeriod(startTime!.unix(), endTime!.unix()), () => dal.votingParameters().then(setVotingParameters))}
                  >Change Times</Button>
                </Box>
              </Grid>
            }
          </Grid>
          <div className="row">
            <div className="col-12">
              {progress &&
                <Box sx={{ margin: '0 auto', width: '60%' }}>
                  <LinearProgress />
                </Box>
              }
              {/* 
              Sending a transaction isn't an immediate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
              {txBeingSent && (
                <WaitingForTransactionMessage txHash={txBeingSent} />
              )}

              {/* 
              Sending a transaction can fail in multiple ways. 
              If that happened, we show a message here.
            */}
              {transactionError && (
                <TransactionErrorMessage
                  message={getRpcErrorMessage(transactionError)}
                  dismiss={() => setTransactionError(null)}
                />
              )}
            </div>
          </div>
        </div >
      )}
    </>
  );
}

export default App;
