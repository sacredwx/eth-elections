import { BigNumber, Contract, Wallet, ethers } from 'ethers';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { Pool } from 'pg';
import ElectionsArtifact from "../contracts/Elections.json";
import contractAddress from "../contracts/contract-address.json";

dotenv.config();

/**
 * !!!IMPORTANT NOTE!!!
 * The smart contract can be accessed independently,
 * It is not a good practise to rely on events,
 * they could be missed due to network issues,
 * and this will lead to data inconsistency.
 * Polling the data once a minute to the database,
 * makes the data being updated near real-time
 * and as much close to reality as possible.
 * And updating the DB due to user actions will bring better UX.
 */

const pg = new Pool({
  ssl: { rejectUnauthorized: false },
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: 1,
  max: 5,
});

interface VoteOption {
  name: string,
  votes: BigNumber,
};

class Eth {
  private provider;
  private signer;
  private contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    this.signer = new Wallet(process.env.PRIVATE_KEY!, this.provider);
    console.log('Connected on: ', process.env.RPC_ENDPOINT);

    this.contract = new Contract(contractAddress.Elections, ElectionsArtifact.abi, this.signer);

    this.updateDBData();
    cron.schedule('0 * * * * *', this.updateDBData.bind(this));
  }

  /**
   * Get Requests
   */

  public owner() {
    return this.contract.owner();
  }

  public votingParameters() {
    return this.contract.votingParameters();
  }

  public async getVotingOptions() {
    return (await pg.query("SELECT * FROM voting_results ORDER BY id ASC")).rows;
  }

  public voters(address: string) {
    return this.contract.voters(address);
  }

  public async getRegisteredVoters(start: number, limit: number) {
    return ((await pg.query("SELECT * FROM registered_voters LIMIT $1 OFFSET $2", [limit, start])).rows).map(row => row.address);
  }

  /**
   * Post Requests
   */

  public async vote(v: string, r: string, s: string, sender: string, deadline: number, voteOption: number) {
    const tx = await this.contract.eip712Vote(v, r, s, sender, deadline, voteOption);
    await tx.wait();
    // Tx Succeeded
    await pg.query("UPDATE voting_results SET votes = votes + 1 WHERE id = $1", [voteOption]);
    return tx;
  };

  public async registerVoter(v: string, r: string, s: string, sender: string, deadline: number, address: string) {
    const tx = await this.contract.eip712RegisterVoter(v, r, s, sender, deadline, address);
    await tx.wait();
    // Tx Succeeded
    await pg.query("INSERT INTO registered_voters (address) VALUES ($1) ON CONFLICT (address) DO UPDATE SET address = EXCLUDED.address", [address]);
    return tx;
  };

  public async setVotingPeriod(v: string, r: string, s: string, sender: string, deadline: number, votingStart: number, votingEnd: number) {
    const tx = await this.contract.eip712SetVotingPeriod(v, r, s, sender, deadline, votingStart, votingEnd);
    await tx.wait();
    return tx;
  };

  /**
   * Scheduled Update
   */

  private async updateDBData() {
    try {
      // Voting Results

      const votingOptions = await this.contract.getVotingOptions();
      if (votingOptions.length > 0) {
        let query = "INSERT INTO voting_results (id, name, votes) VALUES ";
        for (let i = 0, id = 0; i < votingOptions.length * 2; i += 2) {
          query += `(${id++},$${i + 1},$${i + 2})`;
          if (i < votingOptions.length * 2 - 2) {
            query += ', ';
          }
        }
        query += ' ON CONFLICT (id) DO UPDATE SET votes = EXCLUDED.votes';
        // console.log(query);
        await pg.query(query, votingOptions.map((option: VoteOption) => [option.name, option.votes.toNumber()]).flat());
      }

      // Registered Voters

      const registeredVoters = await this.contract.getRegisteredVoters(0, 100); // TODO: pagination till the end
      if (registeredVoters.length > 0) {
        let query = "INSERT INTO registered_voters (address) VALUES ";
        for (let i = 1; i <= registeredVoters.length; i++) {
          query += `($${i})`;
          if (i < registeredVoters.length) {
            query += ', ';
          }
        }
        query += ' ON CONFLICT (address) DO UPDATE SET address = EXCLUDED.address';
        // console.log(query);
        await pg.query(query, registeredVoters);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export default new Eth();
