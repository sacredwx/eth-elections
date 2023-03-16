import React from "react";

interface Props {
  txHash: string,
}

export function WaitingForTransactionMessage({ txHash }: Props) {
  return (
    <div className="alert alert-info" role="alert">
      Waiting for transaction <strong>{txHash}</strong> to be mined
    </div>
  );
}
