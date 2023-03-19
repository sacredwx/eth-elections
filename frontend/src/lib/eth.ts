declare global {
  interface Window {
    ethereum: import('ethers').providers.ExternalProvider;
  }
}

class Eth {
  public async connectWallet(): Promise<string> {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request!({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    return selectedAddress;
  }
}

const eth = new Eth();
export default eth;
