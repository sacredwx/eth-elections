import { SignTypedDataVersion, recoverTypedSignature } from '@metamask/eth-sig-util';
import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

class REST {
  public static readonly HOST: string = 'http://localhost';
  public static readonly DOMAIN_VERSION: string = '1.0.0';
  public static readonly TX_DEADLINE: number = 5;

  constructor(private signer: string, private verifyingContract: string) { }

  public vote(voteOption: number) {
    return this.signData("vote", { voteOption })
  }

  public registerVoter(address: string) {
    return this.signData("registerVoter", { address })
  }

  public setVotingPeriod(votingStart: number, votingEnd: number) {
    return this.signData("setVotingPeriod", { votingStart, votingEnd })
  }

  private async signData(primaryType: string, params: any): Promise<any> {
    const deadline = Math.floor(Date.now() / 1000) + REST.TX_DEADLINE;
    console.log("Deadline: ", deadline, "sec");

    const netId = await window.ethereum.request!({ method: 'net_version' });
    console.log("netId", netId);

    const msgParams = {
      types:
      {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" }
        ],
        vote: [
          { name: "sender", type: "address" },
          { name: "deadline", type: "uint" },
          { name: "voteOption", type: "uint" },
        ],
        registerVoter: [
          { name: "sender", type: "address" },
          { name: "deadline", type: "uint" },
          { name: "address", type: "address" },
        ],
        setVotingPeriod: [
          { name: "sender", type: "address" },
          { name: "deadline", type: "uint" },
          { name: "votingStart", type: "uint" },
          { name: "votingEnd", type: "uint" },
        ],
      },
      primaryType,
      domain: { name: "ETH-Elections", version: REST.DOMAIN_VERSION, chainId: netId, verifyingContract: this.verifyingContract },
      message: {
        sender: this.signer,
        deadline,
        ...params,
      }
    };

    console.log('CLICKED, SENDING PERSONAL SIGN REQ', 'from', this.signer, msgParams);
    const result = await window.ethereum.request!({ method: 'eth_signTypedData_v3', params: [this.signer, JSON.stringify(msgParams)] });
    console.log('TYPED SIGNED:', result);

    // Types versioning problem
    // @ts-ignore
    const recovered = recoverTypedSignature({ data: msgParams, signature: result, version: SignTypedDataVersion.V3 });

    if (recovered.toLowerCase() === this.signer) {
      console.log('Successfully ecRecovered signer as ' + this.signer);
    } else {
      console.error('Failed to verify signer when comparing ' + result + ' to ' + this.signer);
    }

    //getting r s v from a signature
    const signature = result.substring(2);
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    const req = {
      v,
      r,
      s,
      signer: this.signer,
      deadline,
      ...params,
    };
    console.log(req);

    const resp = await fetch(`${REST.HOST}/${primaryType}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req),
    });
    if (!resp.ok) {
      throw (await resp.json()).error?.error?.error;
    }
    return resp.json();
  }
}

export default REST;