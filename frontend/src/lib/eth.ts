import { Contract } from 'ethers';
import DAL from './DAL';

declare global {
  interface Window {
    ethereum: import('ethers').providers.ExternalProvider;
  }
}

class Eth implements DAL {
  constructor(private contract: Contract) { }

  public static async connectWallet(): Promise<string> {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request!({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    return selectedAddress;
  }

  public owner (): Promise<any> {
    return this.contract.owner();
  };

  public async votingParameters(): Promise<any> {
    const resp = await this.contract.votingParameters();
    return {
      start: resp.start.toNumber(),
      end: resp.end.toNumber(),
    }
  };

  public getVotingOptions(): Promise<any> {
    return this.contract.getVotingOptions();
  };

  public async voters(address: string): Promise<any> {
    const resp = await this.contract.voters(address);
    return {
      registered: resp.registered,
      voted: resp.voted,
      vote: resp.vote.toNumber(),
    };
  };

  public getRegisteredVoters(start: number, limit: number): Promise<any> {
    return this.contract.getRegisteredVoters(start, limit);
  };

  public vote(voteOption: number): Promise<any> {
    return this.contract.vote(voteOption);
  };

  public registerVoter(address: string): Promise<any> {
    return this.contract.registerVoters([address]);
  };

  public setVotingPeriod(votingStart: number, votingEnd: number): Promise<any> {
    return this.contract.setVotingPeriod(votingStart, votingEnd);
  };
}

export default Eth;
