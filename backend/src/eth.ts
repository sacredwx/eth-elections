import { Contract, Wallet, ethers } from 'ethers';
import dotenv from 'dotenv';
import ElectionsArtifact from "../contracts/Elections.json";
import contractAddress from "../contracts/contract-address.json";

dotenv.config();

class Eth {
  private provider;
  private signer;
  private contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    this.signer = new Wallet(process.env.PRIVATE_KEY!, this.provider);
    console.log('Connected on: ', process.env.RPC_ENDPOINT);

    this.contract = new Contract(contractAddress.Elections, ElectionsArtifact.abi, this.signer);
  }

  public vote = (v: string, r: string, s: string, sender: string, deadline: number, voteOption: number) => {
    return this.contract.eip712Vote(v, r, s, sender, deadline, voteOption);
  };

  public registerVoter = (v: string, r: string, s: string, sender: string, deadline: number, address: string) => {
    return this.contract.eip712RegisterVoter(v, r, s, sender, deadline, address);
  };

  public setVotingPeriod = (v: string, r: string, s: string, sender: string, deadline: number, votingStart: number, votingEnd: number) => {
    return this.contract.eip712SetVotingPeriod(v, r, s, sender, deadline, votingStart, votingEnd);
  };
}

export default new Eth();
