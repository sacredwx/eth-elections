declare global {
  interface Window {
    ethereum: import('ethers').providers.ExternalProvider;
  }
}

class Eth {
  // This is the Hardhat Network id that we set in our hardhat.config.js.
  // Here's a list of network ids https://docs.metamask.io/guide/ethereum-provider.html#properties
  // to use when deploying to other networks.
  private static readonly HARDHAT_NETWORK_ID = '1337';

  public async connectWallet(): Promise<string> {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request!({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    // First we check the network
    this.checkNetwork();

    return selectedAddress;
  }

  // This method checks if Metamask selected network is Localhost:8545 
  private checkNetwork() {
    // @ts-ignore
    if (window.ethereum.networkVersion === Eth.HARDHAT_NETWORK_ID) {
      return;
    }

    throw new Error('Please connect Metamask to Localhost:8545');
  }
}

const eth = new Eth();
export default eth;
