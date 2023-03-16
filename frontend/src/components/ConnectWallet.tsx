import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";
import { Button } from "@mui/material";

interface Props {
  connectWallet: () => void,
  networkError: string | null,
  dismiss: () => void,
}

export function ConnectWallet({ connectWallet, networkError, dismiss }:Props) {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col-12 text-center">
          {/* Metamask network should be set to Localhost:8545. */}
          {networkError && (
            <NetworkErrorMessage 
              message={networkError} 
              dismiss={dismiss} 
            />
          )}
        </div>
        <div className="col-6 p-4 text-center">
          <p>Please connect to your wallet.</p>
          <Button
            className="btn btn-warning"
            type="button"
            variant="contained"
            onClick={connectWallet}
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}
